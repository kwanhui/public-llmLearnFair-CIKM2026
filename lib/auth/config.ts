import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

// Single-tutor demo auth.
// ADMIN_EMAIL: what the user types in the email field.
// ADMIN_PASSWORD_HASH: bcrypt hash of the password (generate via `pnpm change-admin-password`).
// All cohorts and analytics belong to this single fixed tutor identity.

export const ADMIN_USER_ID = "admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? "";

async function ensureAdminUserRow() {
  await db
    .insert(users)
    .values({ id: ADMIN_USER_ID, email: ADMIN_EMAIL, role: "tutor" })
    .onConflictDoNothing({ target: users.id })
    .catch(() => {
      // DB unprovisioned; sign-in will fail at the DB write boundary instead.
    });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!ADMIN_PASSWORD_HASH) return null;
        const email = (creds?.email as string | undefined)?.toLowerCase()?.trim();
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;
        if (email !== ADMIN_EMAIL.toLowerCase()) return null;
        const ok = await compare(password, ADMIN_PASSWORD_HASH);
        if (!ok) return null;
        await ensureAdminUserRow();
        return { id: ADMIN_USER_ID, email: ADMIN_EMAIL, name: "Admin" };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = "tutor";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = (token.id as string) ?? ADMIN_USER_ID;
        (session.user as { role?: string }).role = "tutor";
      }
      return session;
    },
  },
});
