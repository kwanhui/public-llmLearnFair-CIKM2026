import type { Intent } from "@/lib/intent/classifier";
import type { Scaffold, ScaffoldContext, ScaffoldOutcome, ScaffoldState } from "./scaffold";

export interface WriteApproachConfig {
  minChars: number;
}

export class WriteApproachFirst implements Scaffold {
  readonly name = "write_approach_first";
  private readonly minChars: number;

  constructor(config: WriteApproachConfig) {
    this.minChars = config.minChars;
  }

  appliesTo(intent: Intent): boolean {
    return intent === "direct_answer";
  }

  step(state: ScaffoldState, message: string, _ctx: ScaffoldContext): ScaffoldOutcome {
    if (state === "ready") {
      return { state: "ready", promptToLearner: null, passThroughToLLM: true };
    }
    const trimmed = message.trim();
    if (trimmed.length < this.minChars) {
      return {
        state: "awaiting_approach",
        promptToLearner:
          `Before I help, write a short approach (~${this.minChars} characters): ` +
          `what would you try first, and what part feels uncertain?`,
        passThroughToLLM: false,
      };
    }
    // Length alone is gameable (filler or one repeated word clears the bar).
    // Require a minimum spread of distinct words so a wall of repetition does
    // not pass; the feedback names the problem instead of just re-prompting.
    if (!hasMinimumWordSpread(trimmed)) {
      return {
        state: "awaiting_approach",
        promptToLearner:
          "That is long enough, but try describing your actual reasoning in your " +
          "own words: what would you try first, and what part feels uncertain?",
        passThroughToLLM: false,
      };
    }
    return { state: "ready", promptToLearner: null, passThroughToLLM: true };
  }
}

// A genuine approach uses several different words. Eight distinct lowercased
// word tokens clears normal sentences while rejecting "aaaa…" or one word
// pasted repeatedly to hit the character count.
const MIN_DISTINCT_WORDS = 8;

function hasMinimumWordSpread(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
  return new Set(words).size >= MIN_DISTINCT_WORDS;
}
