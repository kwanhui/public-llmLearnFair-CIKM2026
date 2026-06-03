import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { classifyIntent } from "@/lib/intent/classifier";
import { ScaffoldRunner, type Scaffold } from "@/lib/guardrails/scaffold";
import { WriteApproachFirst } from "@/lib/guardrails/write-approach";
import { ParaphraseBeforeProceed } from "@/lib/guardrails/paraphrase";
import { AttemptBeforeReveal } from "@/lib/guardrails/attempt-before-reveal";
import { getLLM } from "@/lib/llm/client";
import { resolveCohortFromRequest } from "@/lib/cohort/resolve";
import { DEFAULT_COHORT_CONFIG, type CohortConfig } from "@/lib/cohort/defaults";
import { logInteraction, logAuditRun } from "@/lib/logging/logger";
import { FairnessAuditor, type AuditReport } from "@/lib/audit/auditor";
import { rectify, type RectifiedResponse } from "@/lib/audit/rectifier";
import { loadAuditConfig } from "@/lib/config/load";

export const runtime = "nodejs";

// Bound a single learner message so a pasted wall of text cannot blow up token
// cost or latency (the audit re-runs the prompt across every probe). Generous
// for a real tutoring turn, well under any model context limit.
const MAX_MESSAGE_CHARS = 4000;

const RequestSchema = z.object({
  sessionId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
});

function buildRunner(config: CohortConfig): ScaffoldRunner {
  const enabledNames = new Set(config.scaffolds.filter((s) => s.enabled).map((s) => s.name));
  const paramsFor = (name: string) =>
    config.scaffolds.find((s) => s.name === name)?.params ?? {};
  const scaffolds: Scaffold[] = [];
  if (enabledNames.has("write_approach_first")) {
    const minChars = (paramsFor("write_approach_first").minChars as number) ?? 80;
    scaffolds.push(new WriteApproachFirst({ minChars }));
  }
  if (enabledNames.has("attempt_before_reveal")) {
    scaffolds.push(new AttemptBeforeReveal());
  }
  if (enabledNames.has("paraphrase_before_proceed")) {
    const minOverlapRatio =
      (paramsFor("paraphrase_before_proceed").minOverlapRatio as number) ?? 0.3;
    scaffolds.push(new ParaphraseBeforeProceed({ minOverlapRatio }));
  }
  return new ScaffoldRunner(scaffolds);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, sessionId: passedSessionId } = RequestSchema.parse(body);
  const last = messages.findLast?.((m) => m.role === "user") ?? messages[messages.length - 1];
  if (!last) return NextResponse.json({ error: "no user message" }, { status: 400 });
  if (last.content.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `message too long (max ${MAX_MESSAGE_CHARS} characters)` },
      { status: 413 },
    );
  }

  const cohort = await resolveCohortFromRequest().catch(() => null);
  const config = cohort?.config ?? DEFAULT_COHORT_CONFIG;
  const sessionId = passedSessionId ?? crypto.randomUUID();

  const classification = await classifyIntent({
    message: last.content,
    history: messages.slice(0, -1).filter((m) => m.role !== "system") as never,
    temperature: config.llm.temperature,
  });

  const runner = buildRunner(config);
  const previousAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const scaffold = previousAssistant
    ? runner.pickForFollowUp(classification.intent)
    : runner.pickFor(classification.intent);
  const outcome = scaffold?.step(
    "awaiting_approach",
    last.content,
    {
      intent: classification.intent,
      previousAssistantMessage: previousAssistant?.content,
      config: {},
    },
  ) ?? { state: "ready", promptToLearner: null, passThroughToLLM: true };

  const cohortMeta = cohort
    ? { cohortId: cohort.cohortId, studentId: cohort.studentId, learnerHash: cohort.learnerHash }
    : { cohortId: null, studentId: null, learnerHash: "anon" };

  if (!outcome.passThroughToLLM && outcome.promptToLearner) {
    void logInteraction({
      ...cohortMeta,
      sessionId,
      intent: classification.intent,
      guardrailState: outcome.state,
      scaffoldPassed: false,
      auditFlagged: false,
      promptTokens: 0,
      completionTokens: 0,
    });
    return NextResponse.json({
      scaffold: { state: outcome.state, promptToLearner: outcome.promptToLearner },
      intent: classification.intent,
      sessionId,
      cohort: cohort ? { name: cohort.cohortName, ui: config.ui } : null,
    });
  }

  let result;
  try {
    result = await generateText({
      model: getLLM().chatModel,
      temperature: config.llm.temperature,
      system:
        "You are a tutor for adult business-education learners. Encourage attempts before answers. " +
        "Reply in plain conversational prose. Do not use Markdown formatting: no headings, no ** or * emphasis, no backticks, and no bullet or numbered-list syntax.",
      messages: messages.map((m) => ({ role: m.role, content: m.content })) as never,
    });
  } catch {
    // Missing/invalid LLM credentials or an upstream model error. Return a
    // clear status the chat client surfaces as a soft error, rather than a
    // bare 500, so reviewers and self-hosters see what to fix.
    return NextResponse.json(
      { error: "The tutor is unavailable. Check the LLM provider key and try again." },
      { status: 503 },
    );
  }

  // Run the fairness audit and rectifier inline, before the reply is returned.
  // A flagged turn is regenerated with a fairness-correction prefix and the
  // corrected text replaces the original, so the learner only ever sees the
  // rectified response. The audit's per-attribute probes run in parallel
  // (see FairnessAuditor.runOnce), so this adds one bounded round of model
  // calls rather than a per-probe penalty.
  let finalText = result.text;
  let audit: (AuditReport & { rectified: RectifiedResponse | null }) | null = null;

  if (config.audit.enabled) {
    // The audit is a secondary safeguard: if it errors (e.g. a probe model
    // call fails), the learner should still get the tutor's reply. Degrade to
    // no audit rather than failing the whole turn.
    try {
      const auditConfig = await loadAuditConfig("configs/audit/business-ed.yaml");
      const auditor = new FairnessAuditor(auditConfig, config.llm.temperature);
      const report = await auditor.runOnce(last.content);
      const rectified =
        report.flagged.length > 0 && config.audit.rectifier.enabled
          ? await rectify({
              basePrompt: last.content,
              flaggedReport: report,
              maxRetries: config.audit.rectifier.maxRetries,
              temperature: config.llm.temperature,
            })
          : null;
      if (rectified?.rectified && rectified.text) finalText = rectified.text;
      audit = { ...report, rectified };

      for (const probe of report.probes) {
        void logAuditRun({
          cohortId: cohortMeta.cohortId,
          studentId: cohortMeta.studentId,
          sessionId,
          basePrompt: last.content,
          attribute: probe.attribute,
          value: probe.value,
          explanationDepth: probe.metrics.explanationDepth,
          jargonDensity: probe.metrics.jargonDensity,
          flagged: report.flagged.some(
            (f) => f.attribute === probe.attribute && f.value === probe.value,
          ),
        });
      }
    } catch {
      audit = null; // reply still returns; the badge simply does not appear
    }
  }

  void logInteraction({
    ...cohortMeta,
    sessionId,
    intent: classification.intent,
    guardrailState: "ready",
    scaffoldPassed: true,
    auditFlagged: (audit?.flagged.length ?? 0) > 0,
    promptTokens: result.usage?.promptTokens ?? 0,
    completionTokens: result.usage?.completionTokens ?? 0,
  });

  return NextResponse.json({
    text: finalText,
    audit,
    intent: classification.intent,
    sessionId,
    cohort: cohort ? { name: cohort.cohortName, ui: config.ui } : null,
  });
}
