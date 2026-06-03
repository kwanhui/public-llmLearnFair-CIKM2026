import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts, cohortInvites } from "@/lib/db/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const { id, inviteId } = await params;
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
    .delete(cohortInvites)
    .where(and(eq(cohortInvites.id, inviteId), eq(cohortInvites.cohortId, id)))
    .returning({ id: cohortInvites.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
