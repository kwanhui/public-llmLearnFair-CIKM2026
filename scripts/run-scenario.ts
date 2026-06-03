// CLI replayer for a configured demo scenario.
//
// Usage: pnpm demo -- --scenario regression-interpretation
//
// Loads configs/scenarios/<id>.yaml, runs each scripted learner turn through
// the tutor pipeline, and prints the transcript including any scaffold
// interventions and audit flags.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const ScenarioSchema = z.object({
  scenario_id: z.string(),
  title: z.string(),
  domain: z.string().optional(),
  turns: z.array(
    z.object({
      learner: z.string(),
      expected_intent: z.string().optional(),
    }),
  ),
});

async function main() {
  const idArg = process.argv.find((a) => a.startsWith("--scenario="));
  const id = idArg
    ? idArg.split("=")[1]
    : process.argv[process.argv.indexOf("--scenario") + 1];
  if (!id) {
    console.error("Usage: pnpm demo -- --scenario <id>");
    process.exit(1);
  }
  const path = resolve(process.cwd(), "configs/scenarios", `${id}.yaml`);
  const scenario = ScenarioSchema.parse(yaml.load(await readFile(path, "utf8")));

  console.log(`# Scenario: ${scenario.scenario_id}`);
  console.log(scenario.title);
  console.log("");

  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const turn of scenario.turns) {
    messages.push({ role: "user", content: turn.learner });
    console.log(`> learner: ${turn.learner}`);
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      body: JSON.stringify({ messages }),
      headers: { "content-type": "application/json" },
    });
    const data = await res.json();
    if (data.scaffold) {
      console.log(`  scaffold[${data.scaffold.state}]: ${data.scaffold.promptToLearner}`);
    } else {
      console.log(`  tutor: ${data.text}`);
      messages.push({ role: "assistant", content: data.text });
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
