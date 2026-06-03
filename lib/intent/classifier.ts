import { generateObject } from "ai";
import { z } from "zod";
import { getLLM, DEFAULT_TEMPERATURE } from "@/lib/llm/client";

export const IntentSchema = z.enum([
  "direct_answer",
  "conceptual",
  "clarification",
  "meta",
]);

export type Intent = z.infer<typeof IntentSchema>;

const ClassificationSchema = z.object({
  intent: IntentSchema,
  confidence: z.number().min(0).max(1),
});

export type Classification = z.infer<typeof ClassificationSchema>;

const SYSTEM = `You label a learner's chat message with one of four intents.
- direct_answer: asking for the answer, code, or final number ("just give me the formula")
- conceptual: asking for explanation or understanding ("why does X happen")
- clarification: asking to restate or rephrase the previous tutor turn
- meta: off-task, system, or navigation ("how do I save", "thanks")
Return both the label and a [0,1] confidence.`;

export interface ClassifyOptions {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
}

export async function classifyIntent(opts: ClassifyOptions): Promise<Classification> {
  const { object } = await generateObject({
    model: getLLM().classifierModel,
    schema: ClassificationSchema,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    system: SYSTEM,
    messages: [
      ...(opts.history ?? []),
      { role: "user", content: opts.message },
    ],
  });
  return object;
}
