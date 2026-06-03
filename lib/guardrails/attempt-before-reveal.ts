import type { Intent } from "@/lib/intent/classifier";
import type { Scaffold, ScaffoldContext, ScaffoldOutcome, ScaffoldState } from "./scaffold";

export class AttemptBeforeReveal implements Scaffold {
  readonly name = "attempt_before_reveal";

  appliesTo(intent: Intent): boolean {
    return intent === "conceptual";
  }

  step(state: ScaffoldState, message: string, _ctx: ScaffoldContext): ScaffoldOutcome {
    if (state === "ready") {
      return { state: "ready", promptToLearner: null, passThroughToLLM: true };
    }
    if (message.trim().length < 30) {
      return {
        state: "awaiting_attempt",
        promptToLearner:
          `Take a quick guess first, even if you are unsure: what do you think the answer might be, and why?`,
        passThroughToLLM: false,
      };
    }
    return { state: "ready", promptToLearner: null, passThroughToLLM: true };
  }
}
