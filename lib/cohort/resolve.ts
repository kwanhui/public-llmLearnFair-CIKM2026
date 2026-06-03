import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { resolveStudentByCookie } from "./invite";
import { CohortConfigSchema, DEFAULT_COHORT_CONFIG, type CohortConfig } from "./defaults";

export const STUDENT_COOKIE_NAME = "llmlearnfair_student";

export interface ResolvedCohort {
  cohortId: string;
  cohortSlug: string;
  cohortName: string;
  studentId: string;
  learnerHash: string;
  config: CohortConfig;
}

export async function resolveCohortFromRequest(): Promise<ResolvedCohort | null> {
  const jar = await cookies();
  const cookieToken = jar.get(STUDENT_COOKIE_NAME)?.value;
  if (!cookieToken) return null;

  const student = await resolveStudentByCookie(cookieToken);
  if (!student) return null;

  const [cohort] = await db
    .select({ id: cohorts.id, slug: cohorts.slug, name: cohorts.name, configJson: cohorts.configJson })
    .from(cohorts)
    .where(eq(cohorts.id, student.cohortId))
    .limit(1);
  if (!cohort) return null;

  const parsed = CohortConfigSchema.safeParse(cohort.configJson);
  const config = parsed.success ? parsed.data : DEFAULT_COHORT_CONFIG;

  return {
    cohortId: cohort.id,
    cohortSlug: cohort.slug,
    cohortName: cohort.name,
    studentId: student.studentId,
    learnerHash: student.learnerHash,
    config,
  };
}
