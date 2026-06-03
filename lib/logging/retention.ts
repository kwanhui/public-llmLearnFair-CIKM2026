import { lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { interactions, auditRuns } from "@/lib/db/schema";

// Default log retention window in days. Override per deployment with the
// RETENTION_DAYS env var. The interaction and audit logs hold pseudonymised
// per-turn metadata; this purge bounds how long any of it is kept.
export const DEFAULT_RETENTION_DAYS = 90;

export function retentionDays(): number {
  const raw = Number(process.env.RETENTION_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
}

export interface PurgeResult {
  cutoffIso: string;
  interactionsDeleted: number;
  auditRunsDeleted: number;
}

// Delete interaction and audit rows older than the retention window.
// timestampIso is ISO-8601, which sorts lexicographically, so a string
// comparison is a correct date comparison here.
export async function purgeExpiredLogs(days = retentionDays()): Promise<PurgeResult> {
  const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const deletedInteractions = await db
    .delete(interactions)
    .where(lt(interactions.timestampIso, cutoffIso))
    .returning({ id: interactions.id });

  const deletedAuditRuns = await db
    .delete(auditRuns)
    .where(lt(auditRuns.timestampIso, cutoffIso))
    .returning({ id: auditRuns.id });

  return {
    cutoffIso,
    interactionsDeleted: deletedInteractions.length,
    auditRunsDeleted: deletedAuditRuns.length,
  };
}
