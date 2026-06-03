import { describe, it, expect } from "vitest";
import { WriteApproachFirst } from "@/lib/guardrails/write-approach";
import { AttemptBeforeReveal } from "@/lib/guardrails/attempt-before-reveal";
import { ParaphraseBeforeProceed } from "@/lib/guardrails/paraphrase";

describe("WriteApproachFirst", () => {
  const scaffold = new WriteApproachFirst({ minChars: 80 });

  it("blocks short attempts on direct_answer intent", () => {
    const out = scaffold.step("awaiting_approach", "give me the answer", {
      intent: "direct_answer",
      config: {},
    });
    expect(out.passThroughToLLM).toBe(false);
    expect(out.promptToLearner).toContain("approach");
  });

  it("passes when learner writes a full approach", () => {
    const long =
      "I'd start by checking whether the regression assumes constant variance " +
      "and then look at the t-statistic against the standard error.";
    const out = scaffold.step("awaiting_approach", long, {
      intent: "direct_answer",
      config: {},
    });
    expect(out.passThroughToLLM).toBe(true);
  });

  it("blocks a long but low-variety approach (anti-gaming)", () => {
    // 140 chars but only one distinct word: clears the length bar, not the
    // word-spread check.
    const filler = "answer ".repeat(20).trim();
    const out = scaffold.step("awaiting_approach", filler, {
      intent: "direct_answer",
      config: {},
    });
    expect(out.passThroughToLLM).toBe(false);
    expect(out.promptToLearner).toContain("your own words");
  });
});

describe("AttemptBeforeReveal", () => {
  const scaffold = new AttemptBeforeReveal();
  it("only applies to conceptual intent", () => {
    expect(scaffold.appliesTo("conceptual")).toBe(true);
    expect(scaffold.appliesTo("direct_answer")).toBe(false);
  });
});

describe("ParaphraseBeforeProceed", () => {
  const scaffold = new ParaphraseBeforeProceed({ minOverlapRatio: 0.3 });
  it("passes through when there is no previous assistant turn", () => {
    const out = scaffold.step("awaiting_paraphrase", "next question", {
      intent: "conceptual",
      config: {},
    });
    expect(out.passThroughToLLM).toBe(true);
  });
});
