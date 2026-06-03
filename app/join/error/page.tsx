import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function JoinErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const missing = reason === "missing";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">←</span> Back to home
      </Link>
      <EmptyState
        variant="muted"
        className="mt-12"
        title={missing ? "Invalid invite link" : "Invite expired or already used"}
        description={
          missing
            ? "The link is missing a token. Ask your tutor for a fresh invite URL."
            : "Each invite is one-time and expires after 30 days. Ask your tutor for a fresh one."
        }
        action={
          <Link href="/">
            <Button variant="outline" size="md">
              Return home
            </Button>
          </Link>
        }
      />
    </main>
  );
}
