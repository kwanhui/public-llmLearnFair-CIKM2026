import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { getLLM, DEFAULT_TEMPERATURE } from "@/lib/llm/client";

export const runtime = "nodejs";

const RequestSchema = z.object({
  prompt: z.string().min(1),
  profile: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, profile } = RequestSchema.parse(body);

  const profileLines = Object.entries(profile)
    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
    .join("\n");

  // No explicit "same depth" override; we want the LLM's natural adaptation
  // to show through so the counterfactual comparison is visually meaningful.
  const system =
    `You are a tutor for an adult business-education learner.\n` +
    `The learner describes themselves as:\n${profileLines}\n` +
    `Tailor your explanation to their background.\n` +
    `Reply in plain conversational prose. Do not use Markdown formatting: no headings, no ** or * emphasis, no backticks, and no bullet or numbered-list syntax.`;

  const { text } = await generateText({
    model: getLLM().chatModel,
    temperature: DEFAULT_TEMPERATURE,
    system,
    prompt,
  });

  return NextResponse.json({ text });
}
