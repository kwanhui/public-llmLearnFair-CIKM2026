"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Invite {
  id: string;
  token: string;
  expiresAt: string; // ISO string; Date is not serializable to client components
}

interface Props {
  cohortId: string;
  cohortSlug: string;
  baseUrl: string;
  invites: Invite[];
}

export function InviteList({ cohortId, cohortSlug, baseUrl, invites }: Props) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (invites.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">No active invites.</p>
    );
  }

  async function copyToClipboard(url: string, inviteId: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopiedId(inviteId);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  async function revoke(inviteId: string) {
    if (
      !window.confirm(
        "Revoke this invite? Anyone holding the URL will no longer be able to redeem it.",
      )
    ) {
      return;
    }
    setDeletingId(inviteId);
    try {
      const res = await fetch(
        `/api/admin/cohorts/${cohortId}/invites/${inviteId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        window.alert("Failed to revoke invite. Please retry.");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ul className="mt-4 space-y-2">
      {invites.map((i) => {
        const url = `${baseUrl}/join/${cohortSlug}?t=${i.token}`;
        const isCopied = copiedId === i.id;
        const isDeleting = deletingId === i.id;
        return (
          <li
            key={i.id}
            className="animate-fade-in rounded-md border bg-muted/30 p-2.5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Invite URL"
              />
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  onClick={() => copyToClipboard(url, i.id)}
                  variant={isCopied ? "secondary" : "primary"}
                  size="sm"
                >
                  {isCopied ? "✓ Copied" : "Copy"}
                </Button>
                <Button
                  type="button"
                  onClick={() => revoke(i.id)}
                  disabled={isDeleting}
                  loading={isDeleting}
                  variant="danger"
                  size="sm"
                >
                  Revoke
                </Button>
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              Expires {new Date(i.expiresAt).toLocaleDateString()}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
