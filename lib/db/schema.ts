import { pgTable, text, boolean, integer, serial, timestamp, primaryKey, jsonb, index } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// =========================================================================
// Auth.js (NextAuth v5) tables (tutors only).
// Schema follows the Auth.js Drizzle adapter contract:
// https://authjs.dev/getting-started/adapters/drizzle
// =========================================================================

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: text("role").notNull().default("tutor"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (acc) => [primaryKey({ columns: [acc.provider, acc.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// =========================================================================
// Cohort + student tables (domain model).
// Tutors own cohorts; students join via one-time invite tokens. Students are
// pseudonymous, with no email or PII stored.
// =========================================================================

export const cohorts = pgTable(
  "cohorts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tutorId: text("tutor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    configJson: jsonb("config_json").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (c) => [index("cohorts_tutor_id_idx").on(c.tutorId)],
);

export const cohortInvites = pgTable(
  "cohort_invites",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    cohortId: text("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (ci) => [index("invites_cohort_id_idx").on(ci.cohortId)],
);

export const students = pgTable(
  "students",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    cohortId: text("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
    learnerHash: text("learner_hash").notNull().unique(),
    profileJson: jsonb("profile_json"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    lastActiveAt: timestamp("last_active_at", { mode: "date" }),
  },
  (s) => [index("students_cohort_id_idx").on(s.cohortId)],
);

export const studentSessions = pgTable(
  "student_sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    cookieToken: text("cookie_token").notNull().unique(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (ss) => [index("student_sessions_student_id_idx").on(ss.studentId)],
);

// =========================================================================
// Interaction logs, extended with cohort + student FKs for analytics.
// =========================================================================

export const interactions = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    timestampIso: text("timestamp_iso").notNull(),
    cohortId: text("cohort_id").references(() => cohorts.id, { onDelete: "set null" }),
    studentId: text("student_id").references(() => students.id, { onDelete: "set null" }),
    learnerHash: text("learner_hash").notNull(),
    sessionId: text("session_id").notNull(),
    intent: text("intent").notNull(),
    guardrailState: text("guardrail_state").notNull(),
    scaffoldPassed: boolean("scaffold_passed").notNull(),
    auditFlagged: boolean("audit_flagged").notNull(),
    promptTokens: integer("prompt_tokens").notNull(),
    completionTokens: integer("completion_tokens").notNull(),
  },
  (i) => [
    index("interactions_cohort_id_idx").on(i.cohortId),
    index("interactions_student_id_idx").on(i.studentId),
    index("interactions_timestamp_idx").on(i.timestampIso),
  ],
);

export const auditRuns = pgTable(
  "audit_runs",
  {
    id: serial("id").primaryKey(),
    timestampIso: text("timestamp_iso").notNull(),
    cohortId: text("cohort_id").references(() => cohorts.id, { onDelete: "set null" }),
    studentId: text("student_id").references(() => students.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    // SHA-256 hash of the audited prompt, never the raw learner text.
    // (SQL column kept as base_prompt to avoid a live-DB migration.)
    basePromptHash: text("base_prompt").notNull(),
    attribute: text("attribute").notNull(),
    value: text("value").notNull(),
    explanationDepth: integer("explanation_depth_x1000").notNull(),
    jargonDensity: integer("jargon_density_x1000").notNull(),
    flagged: boolean("flagged").notNull(),
  },
  (a) => [
    index("audit_runs_cohort_id_idx").on(a.cohortId),
    index("audit_runs_student_id_idx").on(a.studentId),
    index("audit_runs_timestamp_idx").on(a.timestampIso),
  ],
);
