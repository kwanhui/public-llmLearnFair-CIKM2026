import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts, students } from "@/lib/db/schema";

// Delete a single pseudonymous student ("forget this learner"). The schema
// cascades the student's sessions and sets their interaction/audit rows'
// student_id to null, so the learner becomes unattributable while aggregate
// cohort analytics stay intact. Supports a data-subject erasure request.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const { id, studentId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as { id: string }).id;

  const [cohort] = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(and(eq(cohorts.id, id), eq(cohorts.tutorId, tutorId)))
    .limit(1);
  if (!cohort) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const result = await db
    .delete(students)
    .where(and(eq(students.id, studentId), eq(students.cohortId, id)))
    .returning({ id: students.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
