"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

interface Row {
  day: string;
  intent: string;
  count: number;
}

const INTENT_COLOR: Record<string, string> = {
  direct_answer: "#3b82f6",
  conceptual: "#10b981",
  clarification: "#f59e0b",
  meta: "#a78bfa",
};

export function TurnsLineChart({ rows }: { rows: Row[] }) {
  const days = Array.from(new Set(rows.map((r) => r.day))).sort();
  const intents = Array.from(new Set(rows.map((r) => r.intent)));
  const data = days.map((day) => {
    const entry: Record<string, number | string> = { day };
    for (const i of intents) {
      const row = rows.find((r) => r.day === day && r.intent === i);
      entry[i] = row?.count ?? 0;
    }
    return entry;
  });

  if (data.length === 0) {
    return <Empty label="No turns logged yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis dataKey="day" fontSize={11} />
        <YAxis fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {intents.map((i) => (
          <Line
            key={i}
            type="monotone"
            dataKey={i}
            stroke={INTENT_COLOR[i] ?? "#6b7280"}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
