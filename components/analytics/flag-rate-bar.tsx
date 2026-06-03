"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Row {
  attribute: string;
  flagged: number;
  total: number;
}

export function FlagRateBar({ rows }: { rows: Row[] }) {
  const aggregated: Record<string, { flagged: number; total: number }> = {};
  for (const r of rows) {
    if (!aggregated[r.attribute]) aggregated[r.attribute] = { flagged: 0, total: 0 };
    aggregated[r.attribute].flagged += r.flagged;
    aggregated[r.attribute].total += r.total;
  }
  const data = Object.entries(aggregated).map(([attribute, { flagged, total }]) => ({
    attribute,
    flagRate: total === 0 ? 0 : (flagged / total) * 100,
    total,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No audit runs yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 90 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
        <YAxis type="category" dataKey="attribute" fontSize={11} />
        <Tooltip formatter={(v) => (typeof v === "number" ? `${v.toFixed(1)}%` : String(v))} />
        <Bar dataKey="flagRate" fill="hsl(0 84% 60%)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
