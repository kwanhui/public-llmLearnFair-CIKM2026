import type { Intent } from "@/lib/intent/classifier";

export type ScaffoldState =
  | "awaiting_approach"
  | "awaiting_paraphrase"
  | "awaiting_attempt"
  | "ready";

export interface ScaffoldOutcome {
  state: ScaffoldState;
  promptToLearner: string | null;
  passThroughToLLM: boolean;
}

export interface Scaffold {
  readonly name: string;
  appliesTo(intent: Intent): boolean;
  step(state: ScaffoldState, message: string, context: ScaffoldContext): ScaffoldOutcome;
}

export interface ScaffoldContext {
  previousAssistantMessage?: string;
  intent: Intent;
  config: Record<string, unknown>;
}

export class ScaffoldRunner {
  constructor(private readonly scaffolds: readonly Scaffold[]) {}

  pickFor(intent: Intent): Scaffold | undefined {
    return this.scaffolds.find((s) => s.appliesTo(intent));
  }

  /** On turns where the tutor has already responded, prefer the Paraphrase scaffold
   *  so all three SRL phases (Forethought → Performance → Reflection) get a chance
   *  to fire across a conversation, rather than the same first-match scaffold repeating. */
  pickForFollowUp(intent: Intent): Scaffold | undefined {
    const paraphrase = this.scaffolds.find(
      (s) => s.name === "paraphrase_before_proceed" && s.appliesTo(intent),
    );
    return paraphrase ?? this.pickFor(intent);
  }
}
