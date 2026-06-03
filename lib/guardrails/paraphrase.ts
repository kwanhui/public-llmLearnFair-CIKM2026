import type { Intent } from "@/lib/intent/classifier";
import type { Scaffold, ScaffoldContext, ScaffoldOutcome, ScaffoldState } from "./scaffold";

export interface ParaphraseConfig {
  minOverlapRatio: number;
}

export class ParaphraseBeforeProceed implements Scaffold {
  readonly name = "paraphrase_before_proceed";
  private readonly minOverlap: number;

  constructor(config: ParaphraseConfig) {
    this.minOverlap = config.minOverlapRatio;
  }

  appliesTo(intent: Intent): boolean {
    return intent === "direct_answer" || intent === "conceptual";
  }

  step(state: ScaffoldState, message: string, ctx: ScaffoldContext): ScaffoldOutcome {
    const previous = ctx.previousAssistantMessage;
    if (!previous) {
      return { state: "ready", promptToLearner: null, passThroughToLLM: true };
    }
    if (state === "ready") {
      return { state: "ready", promptToLearner: null, passThroughToLLM: true };
    }
    const overlap = jaccard(previous, message);
    if (overlap < this.minOverlap) {
      return {
        state: "awaiting_paraphrase",
        promptToLearner:
          `Paraphrase what I just explained in your own words before we move on. ` +
          `One or two sentences is enough.`,
        passThroughToLLM: false,
      };
    }
    return { state: "ready", promptToLearner: null, passThroughToLLM: true };
  }
}

function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function jaccard(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersect = 0;
  for (const t of ta) if (tb.has(t)) intersect++;
  const union = ta.size + tb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}
