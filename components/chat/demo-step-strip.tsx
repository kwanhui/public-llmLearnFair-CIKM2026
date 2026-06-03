"use client";

// Three-step guide rendered on /demo above the chat. Helps a viewer follow
// which part of the system is being exercised at each moment. Only the
// current step's description is shown by default; clicking a step expands its
// description so the strip stays compact.

import { useState } from "react";

interface Props {
  hasMessages: boolean;
  hasSwap: boolean;
  hasAudit: boolean;
}

const STEPS = [
  {
    id: 1,
    title: "Watch the scaffolds fire",
    desc: "Pick a scenario and hit Reviewer mode. The right column is the guardrailed tutor; the left is unrestricted GPT for comparison.",
  },
  {
    id: 2,
    title: "Try a counterfactual swap",
    desc: "Below the chat, change the Life stage dropdown (e.g. from \"Just finished university\" to \"Approaching retirement\") and re-run the last prompt.",
  },
  {
    id: 3,
    title: "Inspect the per-attribute audit",
    desc: "After the guardrailed tutor replies, expand the audit badge to see how explanation depth and jargon compare across learner profiles. A ⚠ flag and rectified answer appear when an attribute diverges past threshold.",
  },
];

export function DemoStepStrip({ hasMessages, hasSwap, hasAudit }: Props) {
  const reached = [hasMessages, hasSwap, hasAudit];
  // Highest reached index is "current"; everything before it is "done".
  const current = reached.lastIndexOf(true);
  const currentIdx = current === -1 ? 0 : current;
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <ol
      aria-label="Demo walkthrough steps"
      className="shrink-0 grid gap-2 border-b bg-muted/20 px-3 py-2.5 text-xs sm:grid-cols-3"
    >
      {STEPS.map((s, i) => {
        const isDone = i < current;
        const isCurrent = i === currentIdx;
        const showDesc = isCurrent || openIdx === i;
        return (
          <li
            key={s.id}
            className={`rounded-md border px-2.5 py-1.5 transition-colors ${
              isDone
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900"
                : isCurrent
                  ? "border-primary/50 bg-primary/10"
                  : "border-transparent bg-background/40 text-muted-foreground"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              aria-expanded={showDesc}
              className="flex w-full items-center gap-1.5 text-left"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                }`}
              >
                {isDone ? "✓" : s.id}
              </span>
              <span className="flex-1 font-medium">{s.title}</span>
              <span className="shrink-0 text-[10px] opacity-50" aria-hidden="true">
                {showDesc ? "−" : "+"}
              </span>
            </button>
            {showDesc ? (
              <p className="mt-0.5 animate-fade-in pl-5 text-[11px] leading-snug opacity-80">
                {s.desc}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
