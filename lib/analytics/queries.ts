import { db } from "@/lib/db/client";
import { interactions, students, auditRuns } from "@/lib/db/schema";
import { eq, and, gte, lt, sql, count, desc } from "drizzle-orm";

export interface TopLine {
  totalTurns: number;
  scaffoldPasses: number;
  scaffoldGated: number;
  auditFlags: number;
  activeStudents: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
}

export async function topLineMetrics(
  cohortId: string,
  sinceIso: string,
  untilIso?: string,
): Promise<TopLine> {
  const where = untilIso
    ? and(
        eq(interactions.cohortId, cohortId),
        gte(interactions.timestampIso, sinceIso),
        lt(interactions.timestampIso, untilIso),
      )
    : and(eq(interactions.cohortId, cohortId), gte(interactions.timestampIso, sinceIso));

  const [row] = await db
    .select({
      totalTurns: count(),
      scaffoldPasses: sql<number>`COALESCE(SUM(CASE WHEN ${interactions.scaffoldPassed} THEN 1 ELSE 0 END), 0)::int`,
      auditFlags: sql<number>`COALESCE(SUM(CASE WHEN ${interactions.auditFlagged} THEN 1 ELSE 0 END), 0)::int`,
      activeStudents: sql<number>`COALESCE(COUNT(DISTINCT ${interactions.studentId}), 0)::int`,
      totalPromptTokens: sql<number>`COALESCE(SUM(${interactions.promptTokens}), 0)::int`,
      totalCompletionTokens: sql<number>`COALESCE(SUM(${interactions.completionTokens}), 0)::int`,
    })
    .from(interactions)
    .where(where);

  const total = row?.totalTurns ?? 0;
  return {
    totalTurns: total,
    scaffoldPasses: row?.scaffoldPasses ?? 0,
    scaffoldGated: total - (row?.scaffoldPasses ?? 0),
    auditFlags: row?.auditFlags ?? 0,
    activeStudents: row?.activeStudents ?? 0,
    totalPromptTokens: row?.totalPromptTokens ?? 0,
    totalCompletionTokens: row?.totalCompletionTokens ?? 0,
  };
}

export async function turnsByDay(cohortId: string, sinceIso: string) {
  return db
    .select({
      day: sql<string>`TO_CHAR(${interactions.timestampIso}::date, 'YYYY-MM-DD')`,
      intent: interactions.intent,
      count: count(),
    })
    .from(interactions)
    .where(
      and(eq(interactions.cohortId, cohortId), gte(interactions.timestampIso, sinceIso)),
    )
    .groupBy(sql`${interactions.timestampIso}::date`, interactions.intent)
    .orderBy(sql`${interactions.timestampIso}::date`);
}

export async function scaffoldPassByState(cohortId: string, sinceIso: string) {
  return db
    .select({
      state: interactions.guardrailState,
      total: count(),
      passed: sql<number>`COALESCE(SUM(CASE WHEN ${interactions.scaffoldPassed} THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(interactions)
    .where(
      and(eq(interactions.cohortId, cohortId), gte(interactions.timestampIso, sinceIso)),
    )
    .groupBy(interactions.guardrailState);
}

export async function divergenceByAttribute(cohortId: string, sinceIso: string) {
  return db
    .select({
      day: sql<string>`TO_CHAR(${auditRuns.timestampIso}::date, 'YYYY-MM-DD')`,
      attribute: auditRuns.attribute,
      avgDepth: sql<number>`COALESCE(AVG(${auditRuns.explanationDepth}) / 1000.0, 0)::float`,
      flagged: sql<number>`COALESCE(SUM(CASE WHEN ${auditRuns.flagged} THEN 1 ELSE 0 END), 0)::int`,
      total: count(),
    })
    .from(auditRuns)
    .where(and(eq(auditRuns.cohortId, cohortId), gte(auditRuns.timestampIso, sinceIso)))
    .groupBy(sql`${auditRuns.timestampIso}::date`, auditRuns.attribute)
    .orderBy(sql`${auditRuns.timestampIso}::date`);
}

export async function studentSummary(cohortId: string, limit = 50) {
  return db
    .select({
      id: students.id,
      learnerHash: students.learnerHash,
      createdAt: students.createdAt,
      lastActiveAt: students.lastActiveAt,
      turnCount: count(interactions.id),
    })
    // A correlated subquery here rendered the column refs unqualified
    // ("student_id" = "id"), which Postgres bound to interactions.id (serial)
    // and failed with "operator does not exist: text = integer". Use a join.
    .from(students)
    .leftJoin(interactions, eq(interactions.studentId, students.id))
    .where(eq(students.cohortId, cohortId))
    .groupBy(students.id)
    .orderBy(desc(students.createdAt))
    .limit(limit);
}

export async function exportRows(cohortId: string) {
  return db
    .select({
      timestampIso: interactions.timestampIso,
      learnerHash: interactions.learnerHash,
      sessionId: interactions.sessionId,
      intent: interactions.intent,
      guardrailState: interactions.guardrailState,
      scaffoldPassed: interactions.scaffoldPassed,
      auditFlagged: interactions.auditFlagged,
      promptTokens: interactions.promptTokens,
      completionTokens: interactions.completionTokens,
    })
    .from(interactions)
    .where(eq(interactions.cohortId, cohortId))
    .orderBy(desc(interactions.timestampIso));
}
