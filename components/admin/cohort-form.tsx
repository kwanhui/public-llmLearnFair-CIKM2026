"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CohortConfigSchema, type CohortConfig } from "@/lib/cohort/defaults";

const ALL_ATTRIBUTES = [
  { id: "age_band", label: "Age band" },
  { id: "language_dominance", label: "Language dominance" },
  { id: "prior_education", label: "Prior education" },
  { id: "digital_fluency", label: "Digital fluency" },
] as const;

const ALL_SCAFFOLDS = [
  {
    name: "write_approach_first",
    label: "Write your approach first",
    citation: "Zimmerman 2002, forethought phase",
    preview: "Before I help, write a short approach: what would you try first, and what part feels uncertain?",
  },
  {
    name: "paraphrase_before_proceed",
    label: "Paraphrase before proceeding",
    citation: "Zimmerman 2002, performance monitoring",
    preview: "Before we go on, put the last explanation in your own words.",
  },
  {
    name: "attempt_before_reveal",
    label: "Attempt before reveal",
    citation: "Bjork & Bjork 2011, desirable difficulties",
    preview: "Take a guess first, then I'll show the full explanation.",
  },
] as const;

interface Props {
  cohortId: string;
  initialConfig: CohortConfig;
  availableScenarios: { id: string; title: string }[];
}

export function CohortForm({ cohortId, initialConfig, availableScenarios }: Props) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const { register, handleSubmit, watch } = useForm<CohortConfig>({
    resolver: zodResolver(CohortConfigSchema),
    defaultValues: initialConfig,
  });

  async function onSubmit(data: CohortConfig) {
    setStatus("saving");
    const res = await fetch(`/api/admin/cohorts/${cohortId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config: data }),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2000);
  }

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is incompatible with React Compiler memoization, which is the documented behaviour
  const watchedAttrs = watch("audit.attributes");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Section title="Scaffolds" subtitle="Pedagogical guardrails enforced before the LLM responds.">
        <div className="space-y-3">
          {ALL_SCAFFOLDS.map((s, idx) => (
            <div key={s.name} className="rounded border p-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  {...register(`scaffolds.${idx}.enabled` as const)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.citation}</div>
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    Learner sees: &ldquo;{s.preview}&rdquo;
                  </p>
                </div>
              </label>
              <input type="hidden" {...register(`scaffolds.${idx}.name` as const)} value={s.name} />
              {s.name === "write_approach_first" ? (
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  Min. characters in approach:
                  <input
                    type="number"
                    {...register(`scaffolds.${idx}.params.minChars` as const, { valueAsNumber: true })}
                    className="w-20 rounded border px-2 py-1"
                  />
                </label>
              ) : null}
              {s.name === "paraphrase_before_proceed" ? (
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  Min. token-overlap ratio:
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    {...register(`scaffolds.${idx}.params.minOverlapRatio` as const, { valueAsNumber: true })}
                    className="w-20 rounded border px-2 py-1"
                  />
                </label>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Fairness audit" subtitle="Counterfactual probes across demographic markers; flagged turns trigger the rectifier loop.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("audit.enabled")} />
          Enable online audit
        </label>
        <fieldset className="mt-3">
          <legend className="text-xs uppercase tracking-wide text-muted-foreground">
            Protected attributes
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ALL_ATTRIBUTES.map((attr) => (
              <label key={attr.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={attr.id}
                  defaultChecked={watchedAttrs?.includes(attr.id)}
                  {...register("audit.attributes")}
                />
                {attr.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs">
            <span className="text-muted-foreground">Depth divergence threshold</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              {...register("audit.flagThreshold.explanationDepthDelta", { valueAsNumber: true })}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Jargon density threshold</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              {...register("audit.flagThreshold.jargonDensityDelta", { valueAsNumber: true })}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
        </div>
        <div className="mt-3 rounded bg-muted p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("audit.rectifier.enabled")} />
            Enable rectifier loop (regenerate when flagged)
          </label>
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            Max retries:
            <input
              type="number"
              min="0"
              max="5"
              {...register("audit.rectifier.maxRetries", { valueAsNumber: true })}
              className="w-16 rounded border px-2 py-1"
            />
          </label>
        </div>
      </Section>

      <Section title="LLM" subtitle="Provider and model used for student turns. Provider switches via Vercel AI SDK.">
        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs">
            <span className="text-muted-foreground">Provider</span>
            <select
              {...register("llm.provider")}
              className="mt-1 w-full rounded border px-2 py-1"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Model</span>
            <input
              type="text"
              {...register("llm.model")}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Temperature</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              {...register("llm.temperature", { valueAsNumber: true })}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
        </div>
      </Section>

      <Section title="Scenarios" subtitle="Scripted prompts the student picker can load.">
        <div className="space-y-2">
          {availableScenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scenarios available.</p>
          ) : (
            availableScenarios.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={s.id}
                  {...register("scenarios.allowed")}
                />
                <span>{s.title}</span>
                <code className="text-xs text-muted-foreground">/{s.id}</code>
              </label>
            ))
          )}
        </div>
      </Section>

      <Section title="Student UI" subtitle="Toggles that control what the student sees.">
        <div className="space-y-2 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" {...register("ui.sideBySide")} className="mt-1" />
            <div>
              <div className="font-medium">Side-by-side comparison</div>
              <div className="text-xs text-muted-foreground">
                Shows unrestricted GPT alongside the guardrailed tutor. Off by default,
                because turning it on lets students bypass the intervention by reading the
                unrestricted column.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" {...register("ui.counterfactualSwap")} className="mt-1" />
            <div>
              <div className="font-medium">Counterfactual swap</div>
              <div className="text-xs text-muted-foreground">
                Lets the student manually swap demographic context to see how the tutor&apos;s
                answer changes.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" {...register("ui.scenarioPicker")} className="mt-1" />
            <div>
              <div className="font-medium">Scenario picker</div>
              <div className="text-xs text-muted-foreground">
                Drop-down listing the scenarios above; reviewer mode auto-plays.
              </div>
            </div>
          </label>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save configuration"}
        </button>
        {status === "saved" ? <span className="text-sm text-muted-foreground">✓ Saved</span> : null}
        {status === "error" ? <span className="text-sm text-flag">Save failed.</span> : null}
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border p-4">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
