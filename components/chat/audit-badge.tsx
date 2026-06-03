"use client";

import { useState } from "react";
import { ProbeCard } from "@/components/audit/probe-card";

interface Probe {
  attribute: string;
  value: string;
  responseText: string;
  metrics: { explanationDepth: number; jargonDensity: number; followUpCount: number };
}

interface AuditReport {
  basePrompt: string;
  probes: Probe[];
  flagged: Probe[];
}

interface Props {
  audit: AuditReport | null | "pending";
  rectified?: { retries: number } | null;
}

export function AuditBadge({ audit, rectified }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (audit === "pending") {
    return (
      <div
        role="status"
        className="mt-2 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          aria-hidden="true"
        />
        Running counterfactual audit…
      </div>
    );
  }
  if (!audit) return null;

  const isFlagged = audit.flagged.length > 0;
  const attributeCount = new Set(audit.probes.map((p) => p.attribute)).size;

  return (
    <div
      data-testid="audit-badge"
      className={`mt-2 animate-fade-in overflow-hidden rounded-lg border ${
        isFlagged ? "border-flag/50 bg-flag/5" : "border-emerald-500/30 bg-emerald-500/5"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={
              isFlagged
                ? "text-flag"
                : "text-emerald-600 dark:text-emerald-400"
            }
          >
            {isFlagged ? "⚠" : "✓"}
          </span>
          <span className="font-medium">
            {isFlagged
              ? `Flagged on ${[...new Set(audit.flagged.map((f) => f.attribute))].join(", ")}`
              : `Fair across ${attributeCount} attributes (${audit.probes.length} probes)`}
          </span>
          {rectified && rectified.retries > 0 ? (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px]">
              rectified ({rectified.retries})
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground" aria-hidden="true">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded ? (
        <div className="animate-fade-in border-t bg-background/40 p-3">
          <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
            Each card re-runs your question as if it came from a learner with a
            different background. The bars compare how much the tutor explained
            (explanation depth) and how much jargon it used. A probe is flagged
            when that gap is wide enough to suggest some learners are getting
            thinner help than others.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {audit.probes.map((p, i) => (
              <ProbeCard
                key={i}
                probe={p}
                flagged={audit.flagged.some(
                  (f) => f.attribute === p.attribute && f.value === p.value,
                )}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
