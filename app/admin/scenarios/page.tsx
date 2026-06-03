import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { listScenarios } from "@/lib/scenarios/list";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function ScenariosPage() {
  const session = await auth();
  if (!session?.user) return null;
  const scenarios = await listScenarios();

  return (
    <section>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">←</span> Back to cohorts
      </Link>
      <PageHeader
        className="mt-2"
        title="Scenario library"
        description="Scripted learner prompts checked into configs/scenarios/. Tutors enable scenarios per cohort from the Configuration tab."
      />
      {scenarios.length === 0 ? (
        <EmptyState
          variant="muted"
          className="mt-6"
          title="No scenarios available"
          description="Add a YAML file under configs/scenarios/ in the repo to expose new scripted prompts here."
        />
      ) : (
        <ul className="mt-6 divide-y rounded-lg border">
          {scenarios.map((s) => (
            <li
              key={s.id}
              className="flex items-baseline justify-between gap-3 px-4 py-3.5"
            >
              <div>
                <div className="font-medium">{s.title}</div>
                {s.domain ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.domain}</div>
                ) : null}
              </div>
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {s.id}
              </code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
