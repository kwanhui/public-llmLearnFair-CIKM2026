import { NextResponse } from "next/server";
import { resolveCohortFromRequest } from "@/lib/cohort/resolve";
import { DEFAULT_COHORT_CONFIG } from "@/lib/cohort/defaults";

export const runtime = "nodejs";

export async function GET() {
  const cohort = await resolveCohortFromRequest().catch(() => null);
  if (!cohort) {
    return NextResponse.json({
      cohort: null,
      config: DEFAULT_COHORT_CONFIG,
    });
  }
  return NextResponse.json({
    cohort: { name: cohort.cohortName, slug: cohort.cohortSlug },
    config: cohort.config,
  });
}
