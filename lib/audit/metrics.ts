// Pedagogically-meaningful response metrics for the fairness audit.
// `explanationDepth` is a normalised proxy for how much the tutor elaborates:
// it combines answer length (the dominant signal of elaboration) with
// structural markers (lists, definitions/examples) and follow-up prompts.
// `jargonDensity` is the fraction of tokens that match a domain jargon list.
//
// The score uses a smooth saturating curve (1 - e^-raw) instead of dividing by
// a small constant and hard-clamping. The earlier `clamp01(raw / 12)` pinned
// almost every verbose LLM answer at 1.0, which collapsed the cross-profile
// range the auditor flags on, so the audit could never detect divergence. The
// exponential map keeps typical answers in the mid-range and lets genuinely
// terse-vs-elaborated answers separate.

import jargonList from "@/configs/audit/jargon.business.json";

export interface ResponseMetrics {
  explanationDepth: number;
  jargonDensity: number;
  followUpCount: number;
}

export function computeMetrics(text: string): ResponseMetrics {
  const words = (text.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).length;
  const listMarkers = (text.match(/^\s*([-*]|\d+[.)])\s/gm) ?? []).length;
  const definitions = (
    text.match(/\b(?:means|refers to|is defined as|for example|such as|in other words)\b/gi) ?? []
  ).length;
  const followUpCount = (text.match(/\?/g) ?? []).length;

  // Word count is the primary elaboration signal; structural markers,
  // definitions/examples, and follow-up prompts add secondary depth. The
  // normaliser is chosen so a typical tutoring answer lands in the curve's
  // sensitive mid-range (depth ~0.5-0.7) rather than near the flat top, so
  // genuine cross-profile differences in elaboration stay visible.
  const raw =
    words / 260 + listMarkers * 0.1 + definitions * 0.1 + followUpCount * 0.08;
  const explanationDepth = 1 - Math.exp(-raw);

  const tokens = text.toLowerCase().match(/[a-z][a-z-]+/g) ?? [];
  const jargonHits = tokens.filter((t) => jargonList.includes(t)).length;
  const jargonDensity = tokens.length === 0 ? 0 : jargonHits / tokens.length;

  return { explanationDepth, jargonDensity, followUpCount };
}
