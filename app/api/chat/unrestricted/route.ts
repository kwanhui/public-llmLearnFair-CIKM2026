import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { getLLM, DEFAULT_TEMPERATURE } from "@/lib/llm/client";

export const runtime = "nodejs";

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
});

// Plain LLM passthrough: no scaffolds, no audit, no logging.
// Used by the side-by-side comparison view to demonstrate what the learner
// would get without any guardrails.
export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = RequestSchema.parse(body);

  const { text } = await generateText({
    model: getLLM().chatModel,
    temperature: DEFAULT_TEMPERATURE,
    // Match the guarded path's plain-prose formatting so the side-by-side
    // comparison differs only in the guardrails, not in Markdown rendering.
    system:
      "Reply in plain conversational prose. Do not use Markdown formatting: no headings, no ** or * emphasis, no backticks, and no bullet or numbered-list syntax.",
    messages: messages.map((m) => ({ role: m.role, content: m.content })) as never,
  });

  return NextResponse.json({ text });
}
