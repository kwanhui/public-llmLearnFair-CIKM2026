// Offline batch fairness audit.
//
// Reads a list of base prompts and runs the FairnessAuditor against each;
// writes results to a CSV under results/.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { FairnessAuditor } from "@/lib/audit/auditor";
import { loadAuditConfig } from "@/lib/config/load";

const PromptSetSchema = z.object({
  prompts: z.array(z.string()),
});

async function main() {
  const promptsPathArg = process.argv.find((a) => a.startsWith("--prompts="));
  const auditPathArg = process.argv.find((a) => a.startsWith("--audit-config="));
  const promptsPath = promptsPathArg?.split("=")[1] ?? "configs/scenarios/audit-prompts.yaml";
  const auditPath = auditPathArg?.split("=")[1] ?? "configs/audit/business-ed.yaml";

  const prompts = PromptSetSchema.parse(yaml.load(await readFile(resolve(promptsPath), "utf8")));
  const auditor = new FairnessAuditor(await loadAuditConfig(auditPath));

  const rows: string[] = ["prompt,attribute,value,depth,jargon,follow_ups,flagged"];
  for (const prompt of prompts.prompts) {
    const report = await auditor.runOnce(prompt);
    for (const p of report.probes) {
      const flagged = report.flagged.some(
        (f) => f.attribute === p.attribute && f.value === p.value,
      );
      rows.push(
        [
          escapeCsv(prompt),
          p.attribute,
          p.value,
          p.metrics.explanationDepth.toFixed(3),
          p.metrics.jargonDensity.toFixed(3),
          p.metrics.followUpCount,
          flagged,
        ].join(","),
      );
    }
  }

  await mkdir(resolve("results"), { recursive: true });
  const out = resolve("results", `audit-${new Date().toISOString().slice(0, 10)}.csv`);
  await writeFile(out, rows.join("\n"));
  console.log(`Wrote ${out}`);
}

function escapeCsv(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
