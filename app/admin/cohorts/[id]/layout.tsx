import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { CohortTabs } from "./cohort-tabs";

export default async function CohortLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;
  const tutorId = (session.user as { id: string }).id;

  const [cohort] = await db
    .select({ id: cohorts.id, name: cohorts.name, slug: cohorts.slug })
    .from(cohorts)
    .where(and(eq(cohorts.id, id), eq(cohorts.tutorId, tutorId)))
    .limit(1);
  if (!cohort) notFound();

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">←</span> Back to cohorts
      </Link>
      <div className="mt-2">
        <h1 className="text-2xl font-semibold tracking-tight">{cohort.name}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">/{cohort.slug}</p>
      </div>
      <CohortTabs cohortId={id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
