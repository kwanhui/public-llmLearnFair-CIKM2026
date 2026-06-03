import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts, students } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RemoveStudentButton } from "@/components/admin/remove-student-button";

export default async function CohortStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;
  const tutorId = (session.user as { id: string }).id;

  const [cohort] = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(and(eq(cohorts.id, id), eq(cohorts.tutorId, tutorId)))
    .limit(1);
  if (!cohort) notFound();

  const rows = await db
    .select()
    .from(students)
    .where(eq(students.cohortId, id))
    .orderBy(desc(students.createdAt));

  if (rows.length === 0) {
    return (
      <EmptyState
        variant="muted"
        title="No students yet"
        description="Generate an invite link from the Overview tab and share it with a learner."
        action={
          <Link href={`/admin/cohorts/${id}`}>
            <Button variant="primary" size="md">
              Go to Overview
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "student" : "students"} joined.
        </p>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            About these IDs
          </summary>
          <p className="mt-2 max-w-md">
            IDs are HMAC-SHA256 hashes of a random per-invite seed; no personally
            identifying information is stored. Even the deployment owner cannot reverse
            the hash without the salt.
          </p>
        </details>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Student hash</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5 font-medium">Last active</th>
              <th className="px-4 py-2.5 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs">
                  {s.learnerHash.slice(0, 16)}…
                </td>
                <td className="px-4 py-2.5">{s.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {s.lastActiveAt ? s.lastActiveAt.toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <RemoveStudentButton cohortId={id} studentId={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
