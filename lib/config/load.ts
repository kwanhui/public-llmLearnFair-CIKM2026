import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { AuditConfigSchema } from "@/lib/audit/probes";

const TutorConfigSchema = z.object({
  llm: z.object({
    provider: z.enum(["openai", "anthropic"]),
    model: z.string(),
    temperature: z.number(),
    maxTokens: z.number().optional(),
  }),
  intent: z.object({
    classifier: z.string(),
    labels: z.array(z.string()),
  }),
  guardrails: z.object({
    scaffolds: z.array(
      z.object({
        name: z.string(),
        appliesTo: z.array(z.string()),
        minChars: z.number().optional(),
        minOverlapRatio: z.number().optional(),
      }),
    ),
  }),
  audit: z.object({
    online: z.boolean(),
    probesPerTurn: z.number(),
    config: z.string(),
    flagThreshold: z.object({
      explanationDepthDelta: z.number(),
      jargonDensityDelta: z.number(),
    }),
  }),
});

export type TutorConfig = z.infer<typeof TutorConfigSchema>;

export async function loadTutorConfig(path = "configs/default.yaml"): Promise<TutorConfig> {
  const raw = await readFile(resolve(process.cwd(), path), "utf8");
  const parsed = yaml.load(raw);
  return TutorConfigSchema.parse(parsed);
}

export async function loadAuditConfig(path: string) {
  const raw = await readFile(resolve(process.cwd(), path), "utf8");
  const parsed = yaml.load(raw);
  return AuditConfigSchema.parse(parsed);
}
