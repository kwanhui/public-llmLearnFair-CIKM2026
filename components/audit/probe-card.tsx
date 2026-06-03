import { DepthBar } from "./depth-bar";

interface Probe {
  attribute: string;
  value: string;
  responseText: string;
  metrics: { explanationDepth: number; jargonDensity: number; followUpCount: number };
}

const ATTR_LABEL: Record<string, string> = {
  age_band: "Age",
  language_dominance: "Language",
  prior_education: "Education",
  digital_fluency: "Digital fluency",
};

export function ProbeCard({ probe, flagged }: { probe: Probe; flagged: boolean }) {
  return (
    <article
      className={
        flagged
          ? "rounded-lg border-2 border-flag bg-flag/5 p-3"
          : "rounded-lg border bg-background p-3"
      }
    >
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">
          {ATTR_LABEL[probe.attribute] ?? probe.attribute}
          <span className="ml-1.5 font-normal text-muted-foreground">{probe.value}</span>
        </h3>
        {flagged ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-flag px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white"
            role="status"
          >
            <span aria-hidden="true">⚠</span> Flagged
          </span>
        ) : null}
      </header>
      <p className="mb-3 line-clamp-4 text-sm leading-relaxed text-foreground/90">
        {probe.responseText}
      </p>
      <div className="space-y-1">
        <DepthBar label="Depth" value={probe.metrics.explanationDepth} />
        <DepthBar label="Jargon" value={probe.metrics.jargonDensity} />
      </div>
    </article>
  );
}
