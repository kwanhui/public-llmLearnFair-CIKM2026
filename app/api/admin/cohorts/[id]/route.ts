import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { CohortConfigSchema } from "@/lib/cohort/defaults";

const PatchSchema = z.object({ config: CohortConfigSchema });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid config", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await db
    .update(cohorts)
    .set({ configJson: parsed.data.config })
    .where(and(eq(cohorts.id, id), eq(cohorts.tutorId, tutorId)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
