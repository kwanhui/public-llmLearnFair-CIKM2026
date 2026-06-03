import type { AuditConfig, ProbeVariant, ProtectedAttribute } from "./probes";
import { expandProbe } from "./probes";
import { computeMetrics, type ResponseMetrics } from "./metrics";
import { generateText } from "ai";
import { getLLM, DEFAULT_TEMPERATURE } from "@/lib/llm/client";

export interface ProbeResult {
  attribute: ProtectedAttribute;
  value: string;
  responseText: string;
  metrics: ResponseMetrics;
}

export interface AuditReport {
  basePrompt: string;
  probes: ProbeResult[];
  flagged: ProbeResult[];
}

export class FairnessAuditor {
  constructor(
    private readonly config: AuditConfig,
    private readonly temperature: number = DEFAULT_TEMPERATURE,
  ) {}

  async runOnce(basePrompt: string): Promise<AuditReport> {
    const variants: ProbeVariant[] = this.config.probes.flatMap(expandProbe);
    const probes = await Promise.all(
      variants.map(async (v) => {
        const { text } = await generateText({
          model: getLLM().auditModel,
          temperature: this.temperature,
          system: v.systemPrompt,
          prompt: basePrompt,
        });
        return {
          attribute: v.attribute,
          value: v.value,
          responseText: text,
          metrics: computeMetrics(text),
        };
      }),
    );
    const flagged = this.flag(probes);
    return { basePrompt, probes, flagged };
  }

  private flag(probes: ProbeResult[]): ProbeResult[] {
    const byAttr = groupBy(probes, (p) => p.attribute);
    const out: ProbeResult[] = [];
    for (const group of byAttr.values()) {
      const depths = group.map((g) => g.metrics.explanationDepth);
      const jargons = group.map((g) => g.metrics.jargonDensity);
      const depthRange = Math.max(...depths) - Math.min(...depths);
      const jargonRange = Math.max(...jargons) - Math.min(...jargons);
      if (
        depthRange > this.config.flagThreshold.explanationDepthDelta ||
        jargonRange > this.config.flagThreshold.jargonDensityDelta
      ) {
        out.push(...group);
      }
    }
    return out;
  }
}

function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = m.get(k) ?? [];
    list.push(item);
    m.set(k, list);
  }
  return m;
}
