import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cohorts } from "@/lib/db/schema";
import { DEFAULT_COHORT_CONFIG } from "@/lib/cohort/defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function NewCohortPage() {
  return (
    <section className="mx-auto max-w-xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">←</span> Back to cohorts
      </Link>
      <PageHeader
        className="mt-2"
        title="Create a cohort"
        description="A cohort is a configurable class with its own scaffold, audit, and UI settings. Students join via a one-time invite URL."
      />
      <form
        action={async (formData) => {
          "use server";
          const session = await auth();
          if (!session?.user) throw new Error("Unauthorized");
          const name = (formData.get("name") as string)?.trim();
          if (!name) throw new Error("Name required");
          const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 7);
          const [created] = await db
            .insert(cohorts)
            .values({
              slug,
              name,
              tutorId: (session.user as { id: string }).id,
              configJson: DEFAULT_COHORT_CONFIG,
            })
            .returning();
          redirect(`/admin/cohorts/${created.id}`);
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Cohort name
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder="MGT202, Sem 2 2026"
            autoFocus
            className="mt-1.5"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            A unique slug is generated automatically from this name.
          </p>
        </div>
        <Button type="submit" variant="primary">
          Create cohort
        </Button>
      </form>
    </section>
  );
}
