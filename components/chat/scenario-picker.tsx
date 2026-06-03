"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Scenario {
  id: string;
  title: string;
  turns: { learner: string }[];
}

interface Props {
  allowedScenarioIds: string[];
  onPlayScenario: (turns: string[]) => Promise<void> | void;
}

// Tokens that should render fully upper-cased rather than title-cased.
const ACRONYMS = new Set(["hr", "ai", "ml", "llm", "kpi", "roi", "rfm", "auc", "ab", "csv", "srl"]);

function humanLabel(id: string): string {
  return id
    .split("-")
    .map((w) =>
      ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

export function ScenarioPicker({ allowedScenarioIds, onPlayScenario }: Props) {
  const [selectedId, setSelectedId] = useState<string>(allowedScenarioIds[0] ?? "");
  const [running, setRunning] = useState(false);

  async function loadAndPlay(reviewerMode: boolean) {
    if (!selectedId) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/scenario/${selectedId}`);
      const data = (await res.json()) as Scenario;
      const turns = data.turns.map((t) => t.learner);
      if (reviewerMode) {
        await onPlayScenario(turns);
      } else {
        await onPlayScenario([turns[0]]);
      }
    } finally {
      setRunning(false);
    }
  }

  if (allowedScenarioIds.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full border bg-muted/30 px-2 py-1 text-xs">
      <span className="pl-1 text-muted-foreground">Scenario:</span>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded bg-transparent py-0.5 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Select scenario"
      >
        {allowedScenarioIds.map((id) => (
          <option key={id} value={id}>
            {humanLabel(id)}
          </option>
        ))}
      </select>
      <Button
        type="button"
        onClick={() => loadAndPlay(false)}
        disabled={running}
        variant="ghost"
        size="sm"
      >
        Load
      </Button>
      <Button
        type="button"
        onClick={() => loadAndPlay(true)}
        disabled={running}
        loading={running}
        variant="primary"
        size="sm"
      >
        ▶ Reviewer mode
      </Button>
    </div>
  );
}
