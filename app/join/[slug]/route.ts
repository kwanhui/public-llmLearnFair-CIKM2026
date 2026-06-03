import { NextResponse, type NextRequest } from "next/server";
import { acceptInvite } from "@/lib/cohort/invite";
import { STUDENT_COOKIE_NAME } from "@/lib/cohort/resolve";

export const runtime = "nodejs";

// Invite redemption runs in a Route Handler, not a Server Component page,
// because the student session cookie can only be set from a Route Handler or
// Server Action. The token travels in the email link's `t` query param; the
// slug is cosmetic. On success we set the cookie and land the learner in /chat.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.redirect(new URL("/join/error?reason=missing", req.url));
  }

  // acceptInvite returns null for an invalid/used/expired token, and throws only
  // on a server misconfiguration (e.g. PSEUDONYM_SALT unset); let that surface.
  const accepted = await acceptInvite(token);
  if (!accepted) {
    return NextResponse.redirect(new URL("/join/error?reason=used", req.url));
  }

  const res = NextResponse.redirect(new URL("/chat", req.url));
  res.cookies.set(STUDENT_COOKIE_NAME, accepted.cookieToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: accepted.cookieExpiresAt,
    path: "/",
  });
  return res;
}
