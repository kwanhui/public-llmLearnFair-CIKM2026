interface Props {
  label: string;
  value: string;
  delta?: { value: number; label: string };
}

export function MetricCard({ label, value, delta }: Props) {
  const arrow = delta ? (delta.value > 0 ? "↑" : delta.value < 0 ? "↓" : "·") : null;
  const sign = delta ? (delta.value > 0 ? "+" : delta.value < 0 ? "−" : "") : "";
  const color =
    delta && delta.value !== 0
      ? delta.value > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400"
      : "text-muted-foreground";

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</div>
      {delta ? (
        <div className={`mt-1.5 text-xs ${color}`}>
          <span aria-hidden="true">{arrow}</span> {sign}
          {Math.abs(delta.value).toFixed(1)}%
          <span className="text-muted-foreground"> {delta.label}</span>
        </div>
      ) : null}
    </div>
  );
}
