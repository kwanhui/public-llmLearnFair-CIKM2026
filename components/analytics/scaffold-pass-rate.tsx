"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Row {
  state: string;
  total: number;
  passed: number;
}

export function ScaffoldPassRate({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({
    state: r.state,
    passRate: r.total === 0 ? 0 : (r.passed / r.total) * 100,
    total: r.total,
  }));
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No scaffold-state data yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
        <YAxis type="category" dataKey="state" fontSize={11} />
        <Tooltip
          formatter={(v) => (typeof v === "number" ? `${v.toFixed(1)}%` : String(v))}
          labelFormatter={(state) => `Scaffold state: ${state}`}
        />
        <Bar dataKey="passRate" fill="hsl(217 91% 60%)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
