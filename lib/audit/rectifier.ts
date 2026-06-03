// Agentic rectifier loop. Adapted from RALLM-POI (Li & Lim, PRICAI 2025):
// when the auditor flags a divergence, regenerate with an explicit
// fairness-correction prefix. Bounded retries.

import { generateText } from "ai";
import { getLLM, DEFAULT_TEMPERATURE } from "@/lib/llm/client";
import type { AuditReport } from "./auditor";

export interface RectifyOptions {
  basePrompt: string;
  flaggedReport: AuditReport;
  maxRetries: number;
  temperature?: number;
}

export interface RectifiedResponse {
  text: string;
  retries: number;
  rectified: boolean;
}

const REWRITE_INSTRUCTION = `The next response will go to a learner. Two
properties must hold: (1) the explanation depth (sentence count, definitions,
follow-up questions) is constant regardless of any demographic markers in the
prompt; (2) the jargon density is calibrated to the simplest reasonable
register of the audience. Rewrite accordingly.`;

export async function rectify(opts: RectifyOptions): Promise<RectifiedResponse> {
  let retries = 0;
  while (retries < opts.maxRetries) {
    const { text } = await generateText({
      model: getLLM().chatModel,
      temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
      system: REWRITE_INSTRUCTION,
      prompt: opts.basePrompt,
    });
    retries++;
    return { text, retries, rectified: true };
  }
  return { text: "", retries, rectified: false };
}
