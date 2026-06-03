import { z } from "zod";

export const ProtectedAttribute = z.enum([
  "age_band",
  "life_stage",
  "language_dominance",
  "prior_education",
  "digital_fluency",
]);
export type ProtectedAttribute = z.infer<typeof ProtectedAttribute>;

export const ProbeConfigSchema = z.object({
  attribute: ProtectedAttribute,
  values: z.array(z.string()).min(2),
  systemPromptTemplate: z.string(),
});

export const AuditConfigSchema = z.object({
  probes: z.array(ProbeConfigSchema),
  flagThreshold: z.object({
    explanationDepthDelta: z.number(),
    jargonDensityDelta: z.number(),
  }),
});

export type ProbeConfig = z.infer<typeof ProbeConfigSchema>;
export type AuditConfig = z.infer<typeof AuditConfigSchema>;

export interface ProbeVariant {
  attribute: ProtectedAttribute;
  value: string;
  systemPrompt: string;
}

export function expandProbe(probe: ProbeConfig): ProbeVariant[] {
  return probe.values.map((value) => ({
    attribute: probe.attribute,
    value,
    systemPrompt: probe.systemPromptTemplate.replaceAll("{value}", value),
  }));
}
