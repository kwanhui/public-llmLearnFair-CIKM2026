export function DepthBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="mb-1 text-xs">
      <div className="mb-0.5 flex justify-between text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded bg-muted">
        <div className="h-1.5 rounded bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
