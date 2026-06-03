import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminHome() {
  const session = await auth();
  if (!session?.user) return null;

  const myCohorts = await db
    .select({ id: cohorts.id, slug: cohorts.slug, name: cohorts.name, createdAt: cohorts.createdAt })
    .from(cohorts)
    .where(eq(cohorts.tutorId, (session.user as { id: string }).id))
    .orderBy(desc(cohorts.createdAt));

  return (
    <section>
      <PageHeader
        title="Your cohorts"
        description="Each cohort is a configurable class. Students join via one-time invite URLs."
        action={
          myCohorts.length > 0 ? (
            <Link href="/admin/cohorts">
              <Button variant="primary" size="md">
                + New cohort
              </Button>
            </Link>
          ) : null
        }
      />

      {myCohorts.length === 0 ? (
        <EmptyState
          variant="muted"
          className="mt-8"
          title="No cohorts yet"
          description="Create your first cohort to generate a student invite URL and start collecting data."
          action={
            <Link href="/admin/cohorts">
              <Button variant="primary" size="md">
                Create your first cohort
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="mt-6 divide-y rounded-lg border">
          {myCohorts.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/cohorts/${c.id}`}
                className="flex items-baseline justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
              >
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    /{c.slug}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Created {c.createdAt.toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
