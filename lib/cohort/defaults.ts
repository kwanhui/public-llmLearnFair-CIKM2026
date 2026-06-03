import { z } from "zod";
import { ProtectedAttribute } from "@/lib/audit/probes";

// =========================================================================
// Schema for cohort.configJson, Zod-validated on read and write.
// =========================================================================

const ScaffoldEntry = z.object({
  name: z.enum(["write_approach_first", "paraphrase_before_proceed", "attempt_before_reveal"]),
  enabled: z.boolean(),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
});

export const CohortConfigSchema = z.object({
  scaffolds: z.array(ScaffoldEntry),
  audit: z.object({
    enabled: z.boolean(),
    attributes: z.array(ProtectedAttribute),
    flagThreshold: z.object({
      explanationDepthDelta: z.number(),
      jargonDensityDelta: z.number(),
    }),
    rectifier: z.object({
      enabled: z.boolean(),
      maxRetries: z.number().int().min(0).max(5),
    }),
  }),
  llm: z.object({
    provider: z.enum(["openai", "anthropic"]),
    model: z.string(),
    temperature: z.number().min(0).max(2),
  }),
  scenarios: z.object({
    allowed: z.array(z.string()),
  }),
  ui: z.object({
    sideBySide: z.boolean(),
    counterfactualSwap: z.boolean(),
    scenarioPicker: z.boolean(),
  }),
});

export type CohortConfig = z.infer<typeof CohortConfigSchema>;

// =========================================================================
// Default config seeded into every new cohort. Tutors override per-cohort
// via the admin UI.
// =========================================================================

export const DEFAULT_COHORT_CONFIG: CohortConfig = {
  scaffolds: [
    { name: "write_approach_first", enabled: true, params: { minChars: 160 } },
    { name: "paraphrase_before_proceed", enabled: true, params: { minOverlapRatio: 0.3 } },
    { name: "attempt_before_reveal", enabled: true },
  ],
  audit: {
    enabled: true,
    attributes: ["age_band", "life_stage", "language_dominance", "prior_education", "digital_fluency"],
    flagThreshold: {
      explanationDepthDelta: 0.20,
      jargonDensityDelta: 0.10,
    },
    rectifier: {
      enabled: true,
      maxRetries: 1,
    },
  },
  llm: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
  },
  scenarios: {
    allowed: [
      "regression-interpretation",
      "credit-feature-fairness",
      "liquidity-ratio",
      "exec-summary-writing",
      "ab-test-design",
      "hr-attrition-prediction",
    ],
  },
  ui: {
    // Real cohorts get a clean single-column tutor. The scenario picker,
    // reviewer mode, and counterfactual swap are presenter/reviewer tools, so
    // they default off here and are turned on explicitly for the public /demo.
    // Tutors can re-enable any of them per cohort from the config editor.
    sideBySide: false,
    counterfactualSwap: false,
    scenarioPicker: false,
  },
};
