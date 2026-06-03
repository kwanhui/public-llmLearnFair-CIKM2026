// Seeds a throwaway cohort with synthetic interaction + audit data so the
// admin analytics dashboard is populated for the demo.
// This writes to whatever POSTGRES_URL points at (your Neon DB).
//
//   pnpm tsx scripts/seed-analytics-demo.ts          # seed, prints cohort id
//   pnpm tsx scripts/seed-analytics-demo.ts --clean  # remove the seeded cohort
//
// The cohort slug is fixed ("analytics-demo") so cleanup is unambiguous and it
// never touches any real cohort.
import { config } from "dotenv";
config({ path: ".env.local" });
import { randomUUID, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import { users, cohorts, students, interactions, auditRuns } from "../lib/db/schema";

const SLUG = "analytics-demo";
const ATTRS: Record<string, string[]> = {
  age_band: ["18-25", "26-40", "41+"],
  language_dominance: ["english", "mandarin", "malay"],
  prior_education: ["secondary", "diploma", "postgraduate"],
  digital_fluency: ["low", "medium", "high"],
};
const INTENTS = ["direct_answer", "conceptual", "conceptual", "clarification", "meta"];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const isoDaysAgo = (d: number) =>
  new Date(Date.now() - d * 86400000 - Math.random() * 86400000).toISOString();
const hex = (n: number) => randomBytes(n).toString("hex");

async function chunkInsert<T>(insert: (batch: T[]) => Promise<unknown>, rows: T[], size = 50) {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size));
  }
}

async function clean() {
  const [c] = await db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.slug, SLUG)).limit(1);
  if (!c) return console.log("nothing to clean");
  await db.delete(auditRuns).where(eq(auditRuns.cohortId, c.id));
  await db.delete(interactions).where(eq(interactions.cohortId, c.id));
  await db.delete(cohorts).where(eq(cohorts.id, c.id)); // cascades students, sessions, invites
  console.log("cleaned cohort", c.id);
}

async function seed() {
  await clean();
  await db.insert(users).values({ id: "admin", email: "admin", role: "tutor" }).onConflictDoNothing();

  const cohortId = randomUUID();
  await db.insert(cohorts).values({
    id: cohortId,
    slug: SLUG,
    name: "Business Analytics for Working Adults (CET)",
    tutorId: "admin",
    configJson: { seeded: true },
  });

  const studentIds: string[] = [];
  const studentRows = Array.from({ length: 6 }, () => {
    const id = randomUUID();
    studentIds.push(id);
    return {
      id,
      cohortId,
      learnerHash: hex(32),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 6) * 86400000),
      lastActiveAt: new Date(Date.now() - Math.floor(Math.random() * 2) * 86400000),
    };
  });
  await chunkInsert((b) => db.insert(students).values(b), studentRows);

  // Interactions: per-turn metadata over the last 7 days.
  const interactionRows = Array.from({ length: 140 }, () => {
    const sid = pick(studentIds);
    const intent = pick(INTENTS);
    const gated = (intent === "direct_answer" || intent === "conceptual") && Math.random() < 0.4;
    return {
      timestampIso: isoDaysAgo(Math.floor(Math.random() * 7)),
      cohortId,
      studentId: sid,
      learnerHash: hex(32),
      sessionId: randomUUID(),
      intent,
      guardrailState: gated ? pick(["awaiting_approach", "awaiting_attempt"]) : "ready",
      scaffoldPassed: !gated,
      auditFlagged: !gated && Math.random() < 0.14,
      promptTokens: 180 + Math.floor(Math.random() * 500),
      completionTokens: 120 + Math.floor(Math.random() * 420),
    };
  });
  await chunkInsert((b) => db.insert(interactions).values(b), interactionRows);

  // Audit runs: 12 probes per audited turn. Age band carries the most
  // divergence/flags so the per-attribute charts are not flat.
  const flagRate: Record<string, number> = {
    age_band: 0.28, language_dominance: 0.18, prior_education: 0.12, digital_fluency: 0.07,
  };
  const auditRows: (typeof auditRuns.$inferInsert)[] = [];
  for (let t = 0; t < 45; t++) {
    const sid = pick(studentIds);
    const day = Math.floor(Math.random() * 7);
    const session = randomUUID();
    for (const [attr, vals] of Object.entries(ATTRS)) {
      for (const v of vals) {
        auditRows.push({
          timestampIso: isoDaysAgo(day),
          cohortId,
          studentId: sid,
          sessionId: session,
          basePromptHash: hex(16),
          attribute: attr,
          value: v,
          explanationDepth: 380 + Math.floor(Math.random() * 420),
          jargonDensity: 80 + Math.floor(Math.random() * 320),
          flagged: Math.random() < flagRate[attr],
        });
      }
    }
  }
  await chunkInsert((b) => db.insert(auditRuns).values(b), auditRows);

  console.log("seeded cohort:", cohortId);
  console.log("slug:", SLUG, "| interactions:", interactionRows.length, "| auditRuns:", auditRows.length);
}

(async () => {
  try {
    if (process.argv.includes("--clean")) await clean();
    else await seed();
  } catch (e) {
    console.error("ERROR:", (e as Error).message);
    process.exitCode = 1;
  }
  process.exit(process.exitCode ?? 0);
})();
