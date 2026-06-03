import { notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts, cohortInvites, students } from "@/lib/db/schema";
import { createInvite } from "@/lib/cohort/invite";
import { revalidatePath } from "next/cache";
import { InviteList } from "@/components/admin/invite-list";
import { Button } from "@/components/ui/button";

export default async function CohortOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;
  const tutorId = (session.user as { id: string }).id;

  const [cohort] = await db
    .select()
    .from(cohorts)
    .where(and(eq(cohorts.id, id), eq(cohorts.tutorId, tutorId)))
    .limit(1);
  if (!cohort) notFound();

  const activeInvites = await db
    .select()
    .from(cohortInvites)
    .where(eq(cohortInvites.cohortId, id))
    .orderBy(desc(cohortInvites.createdAt));
  const studentRows = await db.select().from(students).where(eq(students.cohortId, id));

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const usableInvites = activeInvites.filter(
    (i) => !i.usedAt && i.expiresAt > new Date(),
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-lg border p-5">
        <h2 className="text-base font-medium">Students</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {studentRows.length === 0
            ? "No students have joined yet."
            : `${studentRows.length} ${studentRows.length === 1 ? "student" : "students"} joined.`}
        </p>
        {studentRows.length > 0 ? (
          <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto rounded-md bg-muted/30 p-3 text-xs font-mono">
            {studentRows.slice(0, 20).map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-2 text-muted-foreground">
                <span className="truncate">{s.learnerHash.slice(0, 12)}…</span>
                <span className="shrink-0 text-[10px]">{s.createdAt.toLocaleDateString()}</span>
              </li>
            ))}
            {studentRows.length > 20 ? (
              <li className="pt-1 text-center text-[10px] text-muted-foreground">
                + {studentRows.length - 20} more (see Students tab)
              </li>
            ) : null}
          </ul>
        ) : null}
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="text-base font-medium">Invite a student</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time URL, expires in 30 days. Each link can be redeemed once.
        </p>
        <form
          action={async () => {
            "use server";
            await createInvite(id);
            revalidatePath(`/admin/cohorts/${id}`);
          }}
          className="mt-4"
        >
          <Button type="submit" variant="primary" size="md">
            Generate invite link
          </Button>
        </form>
        <InviteList
          cohortId={cohort.id}
          cohortSlug={cohort.slug}
          baseUrl={baseUrl}
          invites={usableInvites.map((i) => ({
            id: i.id,
            token: i.token,
            expiresAt: i.expiresAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
