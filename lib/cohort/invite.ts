import { randomBytes, createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cohortInvites, students, studentSessions } from "@/lib/db/schema";

const INVITE_TTL_DAYS = 30;
const SESSION_TTL_DAYS = 90;

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createInvite(cohortId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(cohortInvites).values({ cohortId, token, expiresAt });
  return { token, expiresAt };
}

export interface AcceptedInvite {
  studentId: string;
  cohortId: string;
  cookieToken: string;
  cookieExpiresAt: Date;
}

export async function acceptInvite(token: string): Promise<AcceptedInvite | null> {
  const [invite] = await db
    .select()
    .from(cohortInvites)
    .where(eq(cohortInvites.token, token))
    .limit(1);
  if (!invite) return null;
  if (invite.usedAt) return null;
  if (invite.expiresAt < new Date()) return null;

  const salt = process.env.PSEUDONYM_SALT;
  if (!salt || salt === "CHANGE_ME") {
    throw new Error("PSEUDONYM_SALT is unset; refuse to create student rows.");
  }
  const studentSeed = randomBytes(16).toString("hex");
  const learnerHash = createHmac("sha256", salt).update(studentSeed).digest("hex");

  const cookieToken = generateToken();
  const cookieExpiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [student] = await db
    .insert(students)
    .values({ cohortId: invite.cohortId, learnerHash })
    .returning();

  await db.insert(studentSessions).values({
    studentId: student.id,
    cookieToken,
    expiresAt: cookieExpiresAt,
  });

  await db
    .update(cohortInvites)
    .set({ usedAt: new Date() })
    .where(eq(cohortInvites.id, invite.id));

  return {
    studentId: student.id,
    cohortId: invite.cohortId,
    cookieToken,
    cookieExpiresAt,
  };
}

export async function resolveStudentByCookie(cookieToken: string) {
  const [row] = await db
    .select({
      studentId: students.id,
      cohortId: students.cohortId,
      learnerHash: students.learnerHash,
      sessionExpiresAt: studentSessions.expiresAt,
    })
    .from(studentSessions)
    .innerJoin(students, eq(students.id, studentSessions.studentId))
    .where(eq(studentSessions.cookieToken, cookieToken))
    .limit(1);
  if (!row) return null;
  if (row.sessionExpiresAt < new Date()) return null;
  return row;
}
