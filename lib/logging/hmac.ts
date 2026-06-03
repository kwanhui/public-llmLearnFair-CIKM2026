import { createHmac, createHash } from "node:crypto";

export function hashLearnerId(learnerId: string, salt: string): string {
  if (!salt || salt === "CHANGE_ME") {
    throw new Error("PSEUDONYM_SALT is unset or default; refuse to hash learner IDs.");
  }
  return createHmac("sha256", salt).update(learnerId).digest("hex");
}

// Non-reversible digest of free text (e.g. an audited prompt). Used so the
// audit log can group identical prompts for analytics without persisting the
// raw learner message. Unsalted SHA-256 is sufficient here: the goal is to
// avoid storing readable text, not to authenticate the value.
export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
