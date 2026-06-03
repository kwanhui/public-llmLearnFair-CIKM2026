"use client";

// Three-stage Self-Regulated Learning sidebar.
// Maps Zimmerman's (2002) SRL phases to the three scaffolds enforced at the
// interface. Each phase collapses to a compact row; the phase currently gating
// the next turn auto-expands so the learner sees why they were paused.

import { useState } from "react";

interface Props {
  scaffoldState: string | null;
  intent: string | null;
}

const PHASES = [
  {
    id: "forethought",
    label: "Forethought",
    scaffold: "WriteApproachFirst",
    description:
      "Plan before acting. The tutor asks you to sketch an approach in your own words before it answers.",
    states: ["awaiting_approach"],
    citation: "Zimmerman 2002",
    color: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    activeColor: "bg-blue-500/25 border-blue-500",
  },
  {
    id: "performance",
    label: "Performance",
    scaffold: "ParaphraseBeforeProceed",
    description:
      "Show understanding while working. The tutor asks you to paraphrase the last explanation before continuing.",
    states: ["awaiting_paraphrase"],
    citation: "Zimmerman 2002",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    activeColor: "bg-amber-500/25 border-amber-500",
  },
  {
    id: "reflection",
    label: "Reflection",
    scaffold: "AttemptBeforeReveal",
    description:
      "Try first, then check. The tutor withholds the answer until you submit your own attempt, a desirable difficulty.",
    states: ["awaiting_attempt"],
    citation: "Bjork & Bjork 2011",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    activeColor: "bg-emerald-500/25 border-emerald-500",
  },
];

export function ScaffoldSidebar({ scaffoldState, intent }: Props) {
  const activeId = PHASES.find((p) => p.states.includes(scaffoldState ?? ""))?.id ?? null;
  const [showAbout, setShowAbout] = useState(false);
  // `undefined` means "follow the gating phase" (so a firing scaffold surfaces
  // its own explanation); once the learner clicks a phase we respect that choice.
  const [userChoice, setUserChoice] = useState<string | null | undefined>(undefined);
  const openId = userChoice === undefined ? activeId : userChoice;

  return (
    <aside className="w-56 shrink-0 space-y-2 text-xs">
      <div>
        <button
          type="button"
          onClick={() => setShowAbout((v) => !v)}
          aria-expanded={showAbout}
          className="flex w-full items-center justify-between gap-2 text-left font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Self-Regulated Learning (SRL)</span>
          <span className="text-sm leading-none" aria-hidden="true">
            {showAbout ? "−" : "+"}
          </span>
        </button>
        {showAbout ? (
          <p className="mt-1 animate-fade-in text-[10px] leading-relaxed text-muted-foreground">
            A three-phase model of how learners plan, monitor, and reflect on their own
            learning. Each phase below maps to one interface scaffold.
          </p>
        ) : null}
      </div>

      {PHASES.map((p) => {
        const isActive = activeId === p.id;
        const isOpen = openId === p.id;
        return (
          <div
            key={p.id}
            className={`rounded border transition-colors ${isActive ? p.activeColor : p.color}`}
          >
            <button
              type="button"
              onClick={() => setUserChoice(isOpen ? null : p.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${isActive ? "bg-current" : "bg-current/40"}`}
                />
                <span className="font-medium">{p.label}</span>
              </span>
              <span className="text-[10px] opacity-60" aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <div className="animate-fade-in px-2 pb-2 text-[10px] leading-snug opacity-80">
                {p.description}
                <div className="mt-1.5 font-mono opacity-70">
                  {p.scaffold} · {p.citation}
                </div>
              </div>
            ) : (
              <div className="px-2 pb-1.5 font-mono text-[10px] opacity-50">{p.scaffold}</div>
            )}
          </div>
        );
      })}

      {intent ? (
        <div className="mt-3 rounded border bg-muted p-2 text-[10px] text-muted-foreground">
          last intent: <span className="font-mono">{intent}</span>
        </div>
      ) : null}
    </aside>
  );
}
