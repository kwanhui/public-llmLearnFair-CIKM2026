import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { exportRows } from "@/lib/analytics/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as { id: string }).id;

  const [cohort] = await db
    .select({ id: cohorts.id, slug: cohorts.slug })
    .from(cohorts)
    .where(and(eq(cohorts.id, id), eq(cohorts.tutorId, tutorId)))
    .limit(1);
  if (!cohort) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rows = await exportRows(id);
  const header = [
    "timestamp_iso",
    "learner_hash",
    "session_id",
    "intent",
    "guardrail_state",
    "scaffold_passed",
    "audit_flagged",
    "prompt_tokens",
    "completion_tokens",
  ].join(",");
  const body = rows
    .map((r) =>
      [
        r.timestampIso,
        r.learnerHash,
        r.sessionId,
        r.intent,
        r.guardrailState,
        r.scaffoldPassed,
        r.auditFlagged,
        r.promptTokens,
        r.completionTokens,
      ].join(","),
    )
    .join("\n");
  const csv = [header, body].filter(Boolean).join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${cohort.slug}-interactions.csv"`,
    },
  });
}
