"use client";

import { useState } from "react";
import Link from "next/link";
import { ProbeCard } from "@/components/audit/probe-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

interface ProbeResult {
  attribute: string;
  value: string;
  responseText: string;
  metrics: { explanationDepth: number; jargonDensity: number; followUpCount: number };
}

interface AuditResponse {
  basePrompt: string;
  probes: ProbeResult[];
  flagged: ProbeResult[];
}

export default function AuditPage() {
  const [prompt, setPrompt] = useState("");
  const [report, setReport] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        setError("Audit failed. Check OPENAI_API_KEY is configured and try again.");
        setReport(null);
        return;
      }
      setReport(await res.json());
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">←</span> Back to home
      </Link>

      <header className="mt-3 border-b pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Standalone fairness audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter a learner prompt; the auditor runs counterfactual probes across age,
          language dominance, prior education, and digital fluency, then flags divergent
          responses.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        <label htmlFor="audit-prompt" className="block text-sm font-medium">
          Learner prompt
        </label>
        <Textarea
          id="audit-prompt"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Explain the regression coefficient on TenureYears in this output."
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={run}
            disabled={loading || prompt.trim().length === 0}
            loading={loading}
            variant="primary"
          >
            {loading ? "Running probes…" : "Run audit"}
          </Button>
          {error ? (
            <span className="text-sm text-flag" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </div>

      {report ? (
        <section className="mt-8 animate-fade-in">
          <div className="mb-3 text-sm text-muted-foreground">
            {report.flagged.length === 0
              ? `Fair across ${report.probes.length} probes.`
              : `${report.flagged.length} of ${report.probes.length} probes flagged.`}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {report.probes.map((p, i) => (
              <ProbeCard
                key={i}
                probe={p}
                flagged={report.flagged.some(
                  (f) => f.attribute === p.attribute && f.value === p.value,
                )}
              />
            ))}
          </div>
        </section>
      ) : !loading ? (
        <EmptyState
          variant="muted"
          className="mt-8"
          title="Probe results appear here"
          description="The audit fires multiple counterfactual probes per protected attribute and reports their explanation-depth and jargon-density divergence."
        />
      ) : null}
    </main>
  );
}
