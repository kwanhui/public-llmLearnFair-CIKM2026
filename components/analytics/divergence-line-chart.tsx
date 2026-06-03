"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

interface Row {
  day: string;
  attribute: string;
  avgDepth: number;
  flagged: number;
  total: number;
}

const ATTR_COLOR: Record<string, string> = {
  age_band: "#3b82f6",
  language_dominance: "#10b981",
  prior_education: "#f59e0b",
  digital_fluency: "#a78bfa",
};

interface Props {
  rows: Row[];
  threshold: number;
}

export function DivergenceLineChart({ rows, threshold }: Props) {
  const days = Array.from(new Set(rows.map((r) => r.day))).sort();
  const attrs = Array.from(new Set(rows.map((r) => r.attribute)));
  const data = days.map((day) => {
    const entry: Record<string, number | string> = { day };
    for (const a of attrs) {
      const r = rows.find((x) => x.day === day && x.attribute === a);
      entry[a] = r?.avgDepth ?? 0;
    }
    return entry;
  });

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No audit runs yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis dataKey="day" fontSize={11} />
        <YAxis fontSize={11} domain={[0, 1]} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={threshold} stroke="hsl(0 84% 60%)" strokeDasharray="4 4" label={{ value: "threshold", fontSize: 10, fill: "hsl(0 84% 60%)" }} />
        {attrs.map((a) => (
          <Line
            key={a}
            type="monotone"
            dataKey={a}
            stroke={ATTR_COLOR[a] ?? "#6b7280"}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
