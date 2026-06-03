export function RectifierBadge({ retries }: { retries: number }) {
  if (retries === 0) return null;
  return (
    <span className="ml-2 rounded bg-accent px-2 py-0.5 text-xs">
      rectified ({retries} retr{retries === 1 ? "y" : "ies"})
    </span>
  );
}
