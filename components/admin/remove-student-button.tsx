"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  cohortId: string;
  studentId: string;
}

// Erase a single pseudonymous learner on request. Two-step (Remove -> Confirm)
// so a stray click cannot drop a student's record.
export function RemoveStudentButton({ cohortId, studentId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/cohorts/${cohortId}/students/${studentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Remove
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button variant="danger" size="sm" onClick={remove} loading={busy} disabled={busy}>
        Confirm
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </Button>
      {error ? (
        <span className="text-xs text-flag" role="alert">
          Failed
        </span>
      ) : null}
    </span>
  );
}
