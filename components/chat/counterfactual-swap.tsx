"use client";

import { useState } from "react";
import type { CohortConfig } from "@/lib/cohort/defaults";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ATTRIBUTE_VALUES: Record<string, string[]> = {
  age_band: [
    "I'm in my 20-24 age range",
    "I'm in my 25-29 age range",
    "I'm in my 30-34 age range",
    "I'm in my 35-39 age range",
    "I'm in my 40-44 age range",
    "I'm in my 45-49 age range",
    "I'm in my 50-54 age range",
    "I'm in my 55-59 age range",
    "I'm 60 or older",
  ],
  life_stage: [
    "I just finished university",
    "I'm upskilling within my current industry",
    "I'm reskilling for a different industry",
    "I'm returning to study after a long career break",
    "I'm approaching retirement and learning for personal interest",
  ],
  language_dominance: [
    "English is my first language",
    "I'm more comfortable in Mandarin but the course is in English",
    "I'm bilingual in Bahasa Melayu and English",
  ],
  prior_education: [
    "I have a postgrad degree in finance",
    "My last formal study was a polytechnic diploma",
    "I have GCE O-Levels and 15 years of work experience",
  ],
  digital_fluency: [
    "I code daily at work",
    "I've used Excel a lot but never written code",
    "I'm new to using software tools beyond email and Word",
  ],
};

const ATTR_LABEL: Record<string, string> = {
  age_band: "Age",
  life_stage: "Life stage",
  language_dominance: "Language",
  prior_education: "Education",
  digital_fluency: "Digital fluency",
};

interface Props {
  config: CohortConfig;
  lastUserMessage: string | null;
  onSwapResult: (result: { profile: Record<string, string>; text: string }) => void;
  /**
   * "inline" (default) lays the controls out horizontally below the chat;
   * "panel" stacks them vertically for a side column so the side-by-side
   * comparison can use the full height.
   */
  layout?: "inline" | "panel";
}

export function CounterfactualSwap({
  config,
  lastUserMessage,
  onSwapResult,
  layout = "inline",
}: Props) {
  const panel = layout === "panel";
  const enabledAttrs = config.audit.attributes;
  const [profile, setProfile] = useState<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    for (const a of enabledAttrs) p[a] = ATTRIBUTE_VALUES[a]?.[0] ?? "";
    return p;
  });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  async function reRun() {
    if (!lastUserMessage) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: lastUserMessage, profile }),
      });
      if (!res.ok) {
        setError("Swap failed. Try again.");
        return;
      }
      const data = await res.json();
      if (data.text) {
        onSwapResult({ profile: { ...profile }, text: data.text });
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setRunning(false);
    }
  }

  if (!config.ui.counterfactualSwap) return null;
  if (enabledAttrs.length === 0) return null;

  const disabled = !lastUserMessage || running;

  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Counterfactual swap
        </p>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {showHelp ? "Hide" : "What's this?"}
        </button>
      </div>
      {showHelp ? (
        <p className="mt-0.5 animate-fade-in text-xs text-muted-foreground">
          Re-run the same prompt with a different demographic context to see how the
          tutor&apos;s answer shifts.
        </p>
      ) : null}
      <div className={cn("mt-2 gap-2", panel ? "flex flex-col" : "flex flex-wrap items-center")}>
        {enabledAttrs.map((a) => (
          <label
            key={a}
            className={cn("text-xs", panel ? "flex flex-col gap-1" : "flex items-center gap-1.5")}
          >
            <span className="text-muted-foreground">{ATTR_LABEL[a]}:</span>
            <select
              value={profile[a]}
              onChange={(e) => setProfile((p) => ({ ...p, [a]: e.target.value }))}
              className={cn(
                "truncate rounded-md border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                panel ? "w-full" : "max-w-[14rem]",
              )}
              aria-label={ATTR_LABEL[a]}
              title={profile[a]}
            >
              {/* Full option text (no slicing) so the dropdown and screen readers
                  read the whole descriptor; the closed control truncates via CSS. */}
              {ATTRIBUTE_VALUES[a]?.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
        <Button
          type="button"
          onClick={reRun}
          disabled={disabled}
          loading={running}
          variant="primary"
          size="sm"
          className={panel ? "w-full" : undefined}
        >
          {running ? "Running…" : "↺ Re-run last turn"}
        </Button>
        {error ? (
          <span className="text-xs text-flag" role="alert">
            {error}
          </span>
        ) : null}
      </div>
      {!lastUserMessage ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Send a message first; the swap runs against the most recent prompt.
        </p>
      ) : null}
    </div>
  );
}
