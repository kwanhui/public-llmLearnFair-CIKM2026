// Lists available scenarios from configs/scenarios/*.yaml.
// Server-only; uses node:fs.

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const ScenarioSchema = z.object({
  scenario_id: z.string(),
  title: z.string(),
  domain: z.string().optional(),
});

export interface ScenarioSummary {
  id: string;
  title: string;
  domain?: string;
}

export async function listScenarios(): Promise<ScenarioSummary[]> {
  const dir = resolve(process.cwd(), "configs/scenarios");
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const out: ScenarioSummary[] = [];
  for (const f of files) {
    if (!f.endsWith(".yaml")) continue;
    try {
      const raw = await readFile(resolve(dir, f), "utf8");
      const parsed = ScenarioSchema.parse(yaml.load(raw));
      out.push({ id: parsed.scenario_id, title: parsed.title, domain: parsed.domain });
    } catch {
      // Skip malformed
    }
  }
  return out;
}
