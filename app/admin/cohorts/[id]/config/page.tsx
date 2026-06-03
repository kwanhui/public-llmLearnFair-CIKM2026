import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { CohortConfigSchema, DEFAULT_COHORT_CONFIG } from "@/lib/cohort/defaults";
import { listScenarios } from "@/lib/scenarios/list";
import { CohortForm } from "@/components/admin/cohort-form";

export default async function CohortConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const initialConfig = parsed.success ? parsed.data : DEFAULT_COHORT_CONFIG;
  const scenarios = await listScenarios();

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        Changes apply on save and take effect on the next student turn. Defaults are seeded
        from <code>configs/default.yaml</code> when the cohort is created.
      </p>
      <CohortForm
        cohortId={cohort.id}
        initialConfig={initialConfig}
        availableScenarios={scenarios.map((s) => ({ id: s.id, title: s.title }))}
      />
    </div>
  );
}
