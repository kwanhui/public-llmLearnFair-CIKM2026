interface Row {
  id: string;
  learnerHash: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  turnCount: number;
}

export function StudentsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
        No students in this cohort yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Student hash</th>
            <th className="px-3 py-2">Joined</th>
            <th className="px-3 py-2">Last active</th>
            <th className="px-3 py-2 text-right">Turns</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-mono text-xs">{s.learnerHash.slice(0, 16)}…</td>
              <td className="px-3 py-2">{s.createdAt.toLocaleDateString()}</td>
              <td className="px-3 py-2">
                {s.lastActiveAt ? s.lastActiveAt.toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2 text-right">{s.turnCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
