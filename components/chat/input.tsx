"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

// Grow the textarea with content up to ~6 rows, then scroll.
const MAX_HEIGHT_PX = 168;

export function ChatInput({ onSend, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  function submit() {
    if (!draft.trim() || disabled) return;
    onSend(draft);
    setDraft("");
    if (ref.current) ref.current.style.height = "";
  }

  return (
    <form
      className="flex items-end gap-2 border-t pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          autoGrow(e.target);
        }}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter inserts a newline.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        placeholder={
          disabled
            ? "Tutor is responding…"
            : "Ask the tutor…  (Enter to send · Shift+Enter for a new line)"
        }
        disabled={disabled}
        aria-label="Message"
        className={cn(
          "min-h-[3.5rem] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      />
      <Button
        type="submit"
        disabled={disabled || !draft.trim()}
        loading={disabled}
        variant="primary"
      >
        Send
      </Button>
    </form>
  );
}
