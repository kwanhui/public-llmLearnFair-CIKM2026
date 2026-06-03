import { db } from "@/lib/db/client";
import { interactions, auditRuns, students } from "@/lib/db/schema";
import { hashText } from "@/lib/logging/hmac";
import { eq } from "drizzle-orm";

export interface InteractionEvent {
  cohortId: string | null;
  studentId: string | null;
  learnerHash: string;
  sessionId: string;
  intent: string;
  guardrailState: string;
  scaffoldPassed: boolean;
  auditFlagged: boolean;
  promptTokens: number;
  completionTokens: number;
}

// No-op when there's no cohort context (anonymous /demo or unconfigured deploy).
// Errors are swallowed so a missing/unmigrated DB never breaks the chat flow.
export async function logInteraction(event: InteractionEvent): Promise<void> {
  if (!event.cohortId) return;
  try {
    await db.insert(interactions).values({
      timestampIso: new Date().toISOString(),
      cohortId: event.cohortId,
      studentId: event.studentId,
      learnerHash: event.learnerHash,
      sessionId: event.sessionId,
      intent: event.intent,
      guardrailState: event.guardrailState,
      scaffoldPassed: event.scaffoldPassed,
      auditFlagged: event.auditFlagged,
      promptTokens: event.promptTokens,
      completionTokens: event.completionTokens,
    });
    if (event.studentId) {
      await db
        .update(students)
        .set({ lastActiveAt: new Date() })
        .where(eq(students.id, event.studentId));
    }
  } catch {
    // intentionally swallowed: DB unavailable shouldn't break the chat
  }
}

export interface AuditRunEvent {
  cohortId: string | null;
  studentId: string | null;
  sessionId: string;
  // Raw audited prompt. It is hashed before storage and never persisted as
  // readable text; see the insert below.
  basePrompt: string;
  attribute: string;
  value: string;
  explanationDepth: number; // 0..1
  jargonDensity: number; // 0..1
  flagged: boolean;
}

export async function logAuditRun(event: AuditRunEvent): Promise<void> {
  if (!event.cohortId) return;
  try {
    await db.insert(auditRuns).values({
      timestampIso: new Date().toISOString(),
      cohortId: event.cohortId,
      studentId: event.studentId,
      sessionId: event.sessionId,
      // Store only a non-reversible hash of the prompt, not the learner's
      // free text. Lets analytics group identical prompts without retaining
      // any readable learner message in the log.
      basePromptHash: hashText(event.basePrompt),
      attribute: event.attribute,
      value: event.value.slice(0, 200),
      explanationDepth: Math.round(event.explanationDepth * 1000),
      jargonDensity: Math.round(event.jargonDensity * 1000),
      flagged: event.flagged,
    });
  } catch {
    // swallowed
  }
}
