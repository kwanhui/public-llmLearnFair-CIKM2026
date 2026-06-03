import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { rollingWindow } from "@/lib/analytics/windows";
import {
  topLineMetrics,
  turnsByDay,
  scaffoldPassByState,
  divergenceByAttribute,
  studentSummary,
} from "@/lib/analytics/queries";
import { CohortConfigSchema, DEFAULT_COHORT_CONFIG } from "@/lib/cohort/defaults";
import { MetricCard } from "@/components/analytics/metric-card";
import { TurnsLineChart } from "@/components/analytics/turns-line-chart";
import { ScaffoldPassRate } from "@/components/analytics/scaffold-pass-rate";
import { DivergenceLineChart } from "@/components/analytics/divergence-line-chart";
import { FlagRateBar } from "@/components/analytics/flag-rate-bar";
import { StudentsTable } from "@/components/analytics/students-table";

export const dynamic = "force-dynamic";

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}

function deltaPct(curr: number, prior: number): { value: number; label: string } {
  if (prior === 0 && curr === 0) return { value: 0, label: "vs prior 7d" };
  if (prior === 0) return { value: 100, label: "vs prior 7d" };
  return { value: ((curr - prior) / prior) * 100, label: "vs prior 7d" };
}

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;
  const tutorId = (session.user as { id: string }).id;

  const [cohort] = await db
    .select({ id: cohorts.id, configJson: cohorts.configJson })
    .from(cohorts)
    .where(and(eq(cohorts.id, id), eq(cohorts.tutorId, tutorId)))
    .limit(1);
  if (!cohort) notFound();

  const parsed = CohortConfigSchema.safeParse(cohort.configJson);
  const config = parsed.success ? parsed.data : DEFAULT_COHORT_CONFIG;
  const window = rollingWindow(7);

  const [current, prior, turnsRows, scaffoldRows, divergenceRows, studentsRows] =
    await Promise.all([
      topLineMetrics(id, window.current.sinceIso),
      topLineMetrics(id, window.prior.sinceIso, window.prior.untilIso),
      turnsByDay(id, window.current.sinceIso),
      scaffoldPassByState(id, window.current.sinceIso),
      divergenceByAttribute(id, window.current.sinceIso),
      studentSummary(id),
    ]);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          Rolling 7-day window. All identifiers are HMAC-SHA256 hashes; no raw learner data
          is shown.
        </p>
        <Link
          href={`/api/admin/cohorts/${id}/export`}
          className="rounded border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Download CSV
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Total turns"
          value={current.totalTurns.toLocaleString()}
          delta={deltaPct(current.totalTurns, prior.totalTurns)}
        />
        <MetricCard
          label="Active students"
          value={current.activeStudents.toLocaleString()}
          delta={deltaPct(current.activeStudents, prior.activeStudents)}
        />
        <MetricCard
          label="Scaffold pass rate"
          value={pct(current.scaffoldPasses, current.totalTurns)}
        />
        <MetricCard
          label="Audit flag rate"
          value={pct(current.auditFlags, current.totalTurns)}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 text-sm font-medium">Turns over time, by intent</h2>
          <TurnsLineChart rows={turnsRows} />
        </div>
        <div className="rounded border p-4">
          <h2 className="mb-2 text-sm font-medium">Scaffold pass rate by gate</h2>
          <ScaffoldPassRate rows={scaffoldRows} />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 text-sm font-medium">Avg explanation depth by attribute</h2>
          <DivergenceLineChart
            rows={divergenceRows}
            threshold={config.audit.flagThreshold.explanationDepthDelta}
          />
        </div>
        <div className="rounded border p-4">
          <h2 className="mb-2 text-sm font-medium">Audit flag rate by attribute</h2>
          <FlagRateBar rows={divergenceRows} />
        </div>
      </section>

      <section className="mt-4 rounded border p-4">
        <h2 className="mb-2 text-sm font-medium">Students</h2>
        <StudentsTable rows={studentsRows} />
      </section>

      <section className="mt-4 rounded border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong>Token usage</strong> · prompt {current.totalPromptTokens.toLocaleString()} ·
        completion {current.totalCompletionTokens.toLocaleString()} (last 7d)
      </section>
    </div>
  );
}
