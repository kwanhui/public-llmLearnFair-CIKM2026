import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

// Sampling temperature applied to every generation call. The Vercel AI SDK
// sets temperature at call time (not at model construction), so each
// generateText/generateObject site passes this explicitly. Per-cohort configs
// may override via CohortConfig.llm.temperature; this is the fallback for
// paths that have no cohort (the public /demo, the standalone audit page).
export const DEFAULT_TEMPERATURE = 0.2;

export interface LLMClients {
  chatModel: LanguageModel;
  classifierModel: LanguageModel;
  auditModel: LanguageModel;
}

let cached: LLMClients | null = null;

export function getLLM(): LLMClients {
  if (cached) return cached;
  const provider = process.env.LLM_PROVIDER ?? "openai";
  if (provider === "openai") {
    cached = {
      chatModel: openai(process.env.LLM_CHAT_MODEL ?? "gpt-4o-mini"),
      classifierModel: openai(process.env.LLM_CLASSIFIER_MODEL ?? "gpt-4o-mini"),
      auditModel: openai(process.env.LLM_AUDIT_MODEL ?? "gpt-4o-mini"),
    };
  } else if (provider === "anthropic") {
    cached = {
      chatModel: anthropic(process.env.LLM_CHAT_MODEL ?? "claude-haiku-4-5-20251001"),
      classifierModel: anthropic(process.env.LLM_CLASSIFIER_MODEL ?? "claude-haiku-4-5-20251001"),
      auditModel: anthropic(process.env.LLM_AUDIT_MODEL ?? "claude-haiku-4-5-20251001"),
    };
  } else {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
  }
  return cached;
}
