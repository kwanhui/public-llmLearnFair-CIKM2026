import { NextResponse } from "next/server";
import { z } from "zod";
import { FairnessAuditor } from "@/lib/audit/auditor";
import { rectify } from "@/lib/audit/rectifier";
import { loadAuditConfig } from "@/lib/config/load";
import { resolveCohortFromRequest } from "@/lib/cohort/resolve";
import { logAuditRun } from "@/lib/logging/logger";
import { DEFAULT_TEMPERATURE } from "@/lib/llm/client";

export const runtime = "nodejs";

const RequestSchema = z.object({
  prompt: z.string().min(1),
  configPath: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, configPath, sessionId } = RequestSchema.parse(body);

  const cohort = await resolveCohortFromRequest().catch(() => null);
  const cohortRectifier = cohort?.config.audit.rectifier ?? { enabled: true, maxRetries: 1 };
  const temperature = cohort?.config.llm.temperature ?? DEFAULT_TEMPERATURE;
  const config = await loadAuditConfig(configPath ?? "configs/audit/business-ed.yaml");
  const auditor = new FairnessAuditor(config, temperature);
  const report = await auditor.runOnce(prompt);

  // Run the rectifier when flags are found and rectifier is enabled.
  const rectified =
    report.flagged.length > 0 && cohortRectifier.enabled
      ? await rectify({
          basePrompt: prompt,
          flaggedReport: report,
          maxRetries: cohortRectifier.maxRetries,
          temperature,
        })
      : null;

  const cohortMeta = cohort
    ? { cohortId: cohort.cohortId, studentId: cohort.studentId }
    : { cohortId: null, studentId: null };
  const sid = sessionId ?? crypto.randomUUID();

  for (const probe of report.probes) {
    void logAuditRun({
      ...cohortMeta,
      sessionId: sid,
      basePrompt: prompt,
      attribute: probe.attribute,
      value: probe.value,
      explanationDepth: probe.metrics.explanationDepth,
      jargonDensity: probe.metrics.jargonDensity,
      flagged: report.flagged.some(
        (f) => f.attribute === probe.attribute && f.value === probe.value,
      ),
    });
  }

  return NextResponse.json({ ...report, rectified });
}
