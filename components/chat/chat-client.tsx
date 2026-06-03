"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { CohortConfig } from "@/lib/cohort/defaults";
import { ChatInput } from "@/components/chat/input";
import { ScaffoldPrompt } from "@/components/chat/scaffold-prompt";
import { ScaffoldSidebar } from "@/components/chat/scaffold-sidebar";
import { AuditBadge } from "@/components/chat/audit-badge";
import { CounterfactualSwap } from "@/components/chat/counterfactual-swap";
import { ScenarioPicker } from "@/components/chat/scenario-picker";
import { Typewriter } from "@/components/chat/typewriter";
import { DemoStepStrip } from "@/components/chat/demo-step-strip";

const TYPEWRITER_SPEED_MS = 40;

type Role = "user" | "assistant" | "system";
interface Message {
  role: Role;
  content: string;
}

interface AuditReport {
  basePrompt: string;
  probes: Array<{
    attribute: string;
    value: string;
    responseText: string;
    metrics: { explanationDepth: number; jargonDensity: number; followUpCount: number };
  }>;
  flagged: AuditReport["probes"];
  rectified?: { text: string; retries: number; rectified: boolean } | null;
}

interface SwapEntry {
  baseUserText: string;
  profile: Record<string, string>;
  text: string;
}

interface Props {
  cohortName: string | null;
  config: CohortConfig;
  /** Show the public-demo notice strip above the header. */
  demoBanner?: boolean;
  /**
   * Reveal assistant messages character-by-character so a viewer can read
   * along. Also paces scenario auto-play to wait for the reveal to finish.
   * Used on /demo; off in normal cohort chat to avoid slowing real learners.
   */
  typewriter?: boolean;
  /** Show the 3-step guided walkthrough above the chat. /demo only. */
  showStepStrip?: boolean;
}

export function ChatClient({
  cohortName,
  config,
  demoBanner,
  typewriter,
  showStepStrip,
}: Props) {
  const [guardedMsgs, setGuardedMsgs] = useState<Message[]>([]);
  const [unrestrictedMsgs, setUnrestrictedMsgs] = useState<Message[]>([]);
  const [scaffold, setScaffold] = useState<{ state: string; promptToLearner: string } | null>(null);
  const [scaffoldStateForSidebar, setScaffoldStateForSidebar] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [audits, setAudits] = useState<Record<number, AuditReport | "pending">>({});
  const [swaps, setSwaps] = useState<Record<number, SwapEntry[]>>({});
  const [sending, setSending] = useState(false);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  // Persist the server-assigned session id so a learner's successive turns are
  // logged under one session, not a fresh id each turn.
  const sessionIdRef = useRef<string | null>(null);

  const sideBySide = config.ui.sideBySide;

  const send = useCallback(
    async (text: string): Promise<{ maxAssistantLen: number }> => {
      setSending(true);
      setLastUserText(text);
      const nextGuarded: Message[] = [...guardedMsgs, { role: "user", content: text }];
      setGuardedMsgs(nextGuarded);

      const nextUnrestricted: Message[] = sideBySide
        ? [...unrestrictedMsgs, { role: "user", content: text }]
        : unrestrictedMsgs;
      if (sideBySide) setUnrestrictedMsgs(nextUnrestricted);

      try {
        const guardedPromise = fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: nextGuarded,
            sessionId: sessionIdRef.current ?? undefined,
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(`chat request failed: ${r.status}`);
          return r.json();
        });

        const unrestrictedPromise = sideBySide
          ? fetch("/api/chat/unrestricted", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ messages: nextUnrestricted }),
            }).then((r) => {
              if (!r.ok) throw new Error(`unrestricted request failed: ${r.status}`);
              return r.json();
            })
          : Promise.resolve(null);

        const [guarded, unrestricted] = await Promise.all([guardedPromise, unrestrictedPromise]);

        if (guarded.sessionId) sessionIdRef.current = guarded.sessionId;
        if (guarded.intent) setIntent(guarded.intent);
        if (guarded.scaffold) {
          setScaffold(guarded.scaffold);
          setScaffoldStateForSidebar(guarded.scaffold.state);
        } else if (guarded.text) {
          setScaffold(null);
          setScaffoldStateForSidebar("ready");
          const updated: Message[] = [...nextGuarded, { role: "assistant", content: guarded.text }];
          setGuardedMsgs(updated);
          const idx = updated.length - 1;
          // The reply is already audited and (if flagged) rectified server-side
          // before it reaches here, so attach the audit report that came back
          // with it rather than firing a separate post-hoc audit.
          if (guarded.audit) {
            setAudits((a) => ({ ...a, [idx]: guarded.audit as AuditReport }));
          }
        }

        if (sideBySide && unrestricted?.text) {
          setUnrestrictedMsgs([
            ...nextUnrestricted,
            { role: "assistant", content: unrestricted.text },
          ]);
        }

        const maxAssistantLen = Math.max(
          guarded.text?.length ?? 0,
          guarded.scaffold?.promptToLearner?.length ?? 0,
          sideBySide ? (unrestricted?.text?.length ?? 0) : 0,
        );
        return { maxAssistantLen };
      } catch {
        // Surface a soft error instead of leaving the input stuck on
        // "Tutor is responding…" forever after a failed request.
        setScaffold(null);
        setGuardedMsgs((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong reaching the tutor. Please try again.",
          },
        ]);
        return { maxAssistantLen: 0 };
      } finally {
        setSending(false);
      }
    },
    [guardedMsgs, unrestrictedMsgs, sideBySide],
  );

  const playScenarioTurns = useCallback(
    async (turns: string[]) => {
      for (const t of turns) {
        const { maxAssistantLen } = await send(t);
        if (typewriter) {
          // Wait for the slowest typewriter to finish, plus a buffer so the
          // viewer has a beat to absorb the answer before the next turn fires.
          const revealMs = maxAssistantLen * TYPEWRITER_SPEED_MS;
          const wait = Math.min(20000, Math.max(2500, revealMs + 1500));
          await new Promise((r) => setTimeout(r, wait));
        } else {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    },
    [send, typewriter],
  );

  const handleSwap = useCallback(
    (msgIndex: number, baseUserText: string) =>
      (result: { profile: Record<string, string>; text: string }) => {
        setSwaps((prev) => ({
          ...prev,
          [msgIndex]: [...(prev[msgIndex] ?? []), { baseUserText, ...result }],
        }));
      },
    [],
  );

  const totalTurns = guardedMsgs.filter((m) => m.role === "user").length;
  const flaggedCount = Object.values(audits).filter(
    (a): a is AuditReport => a !== "pending" && !!a && a.flagged.length > 0,
  ).length;
  const hasAudit = Object.values(audits).some((a) => a !== "pending" && !!a);

  // Index of the last assistant message; swap results are only shown under assistant
  // bubbles, so if the last action was a scaffold block (last message is a user turn),
  // we attach the result to the assistant message that actually exists.
  const lastAssistantIdx = guardedMsgs.reduce(
    (found, m, i) => (m.role === "assistant" ? i : found),
    -1,
  );

  return (
    <main
      className={`mx-auto flex h-screen flex-col px-4 sm:px-6 ${
        sideBySide ? "max-w-[92rem]" : "max-w-6xl"
      }`}
    >
      {demoBanner ? (
        <div
          role="note"
          className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-2 py-2 text-center text-xs"
        >
          <strong>Public demo mode.</strong> Side-by-side comparison enabled, no learner data
          is persisted.
        </div>
      ) : null}

      {showStepStrip ? (
        <DemoStepStrip
          hasMessages={guardedMsgs.some((m) => m.role === "user")}
          hasSwap={Object.values(swaps).some((arr) => arr.length > 0)}
          hasAudit={hasAudit}
        />
      ) : null}

      <header className="shrink-0 border-b py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <Link
                href="/"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                ← home
              </Link>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                SAGE
              </h1>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              Guardrailed tutor for scaffolded self-regulated learning.{" "}
              {cohortName ? (
                <>Cohort: <strong>{cohortName}</strong>.</>
              ) : (
                <>Public demo.</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {config.ui.scenarioPicker ? (
              <ScenarioPicker
                allowedScenarioIds={config.scenarios.allowed}
                onPlayScenario={playScenarioTurns}
              />
            ) : null}
            <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              {totalTurns} turn{totalTurns === 1 ? "" : "s"} · {flaggedCount} flag
              {flaggedCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-3 flex min-h-0 flex-1 gap-4 sm:gap-6">
        <div className="hidden md:block">
          <ScaffoldSidebar scaffoldState={scaffoldStateForSidebar} intent={intent} />
        </div>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4">
            {sideBySide ? (
              <>
                <ChatColumn
                  title="Unrestricted GPT"
                  subtitle="No scaffolds, no audit"
                  messages={unrestrictedMsgs}
                  typewriter={typewriter}
                />
                <ChatColumn
                  title="SAGE"
                  subtitle="Guardrailed + audited"
                  messages={guardedMsgs}
                  audits={audits}
                  swaps={swaps}
                  typewriter={typewriter}
                />
              </>
            ) : (
              <ChatColumn
                messages={guardedMsgs}
                audits={audits}
                swaps={swaps}
                typewriter={typewriter}
              />
            )}
          </div>

          <div className="shrink-0 space-y-2 pt-3">
            {scaffold ? <ScaffoldPrompt notice={scaffold} /> : null}
            {/* Single-column tutor: swap inline. Side-by-side (demo): the swap
                lives in the right panel on desktop (so the comparison gets the
                full height) and falls back to inline here only on mobile, where
                there is no room for a side panel. */}
            {!sideBySide ? (
              <CounterfactualSwap
                config={config}
                lastUserMessage={lastAssistantIdx >= 0 ? lastUserText : null}
                onSwapResult={handleSwap(lastAssistantIdx, lastUserText ?? "")}
              />
            ) : config.ui.counterfactualSwap ? (
              <div className="md:hidden">
                <CounterfactualSwap
                  config={config}
                  lastUserMessage={lastAssistantIdx >= 0 ? lastUserText : null}
                  onSwapResult={handleSwap(lastAssistantIdx, lastUserText ?? "")}
                />
              </div>
            ) : null}
            <ChatInput onSend={send} disabled={sending} />
          </div>
        </section>

        {sideBySide && config.ui.counterfactualSwap ? (
          <aside className="hidden w-64 shrink-0 overflow-y-auto md:block">
            <CounterfactualSwap
              config={config}
              lastUserMessage={lastAssistantIdx >= 0 ? lastUserText : null}
              onSwapResult={handleSwap(lastAssistantIdx, lastUserText ?? "")}
              layout="panel"
            />
          </aside>
        ) : null}
      </div>

      <footer className="shrink-0 border-t py-2 text-center text-[10px] text-muted-foreground sm:text-xs">
        Pseudonymised log: HMAC-SHA256 hashed learner ID. No raw text persisted with identity.
      </footer>
    </main>
  );
}

interface ColumnProps {
  title?: string;
  subtitle?: string;
  messages: Message[];
  audits?: Record<number, AuditReport | "pending">;
  swaps?: Record<number, SwapEntry[]>;
  typewriter?: boolean;
}

function ChatColumn({ title, subtitle, messages, audits, swaps, typewriter }: ColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.filter((m) => m.role !== "system");
  const lastAssistantIdx = (() => {
    for (let i = visibleMessages.length - 1; i >= 0; i -= 1) {
      if (visibleMessages[i].role === "assistant") return i;
    }
    return -1;
  })();

  // Auto-scroll to bottom when new messages, audits, or swaps arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, audits, swaps]);

  const containerClass = title
    ? "flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border bg-background"
    : "flex min-h-0 min-w-0 flex-1 flex-col";

  return (
    <div className={containerClass}>
      {title ? (
        <div className="shrink-0 border-b bg-muted/40 px-3 py-2">
          <div className="text-sm font-medium">{title}</div>
          {subtitle ? (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
      ) : null}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Ask a question to begin. Try a direct-answer prompt to see the
              WriteApproachFirst scaffold fire, or a conceptual question to see
              AttemptBeforeReveal.
            </p>
          </div>
        ) : (
          visibleMessages.map((m, i) => (
            <div key={i} className="animate-fade-in">
              <div
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                    : "max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm"
                }
              >
                {typewriter && m.role === "assistant" && i === lastAssistantIdx ? (
                  <Typewriter text={m.content} speedMs={TYPEWRITER_SPEED_MS} />
                ) : (
                  m.content
                )}
              </div>
              {audits && m.role === "assistant" ? (
                <AuditBadge
                  audit={audits[i] ?? null}
                  rectified={(audits[i] as AuditReport)?.rectified}
                />
              ) : null}
              {swaps && m.role === "assistant" && swaps[i]
                ? swaps[i].map((s, j) => (
                    <div
                      key={j}
                      className="mt-2 max-w-[85%] animate-fade-in rounded-lg border-l-4 border-accent bg-accent/10 p-2.5 text-xs"
                    >
                      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Counterfactual: {Object.values(s.profile).join(" · ")}
                      </div>
                      <div>{s.text}</div>
                    </div>
                  ))
                : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
