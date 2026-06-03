import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const errorMessage =
    sp.error === "CredentialsSignin"
      ? "Wrong email or password."
      : sp.error
        ? `Sign-in error: ${sp.error}`
        : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">←</span> Back to home
      </Link>

      <section className="mt-12">
        <h1 className="text-2xl font-semibold tracking-tight">Tutor sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Single-tutor demo. Students join via cohort invite URLs (no sign-in needed).
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 animate-slide-down rounded-md border border-flag/40 bg-flag/5 px-3 py-2 text-sm text-flag"
          >
            {errorMessage}
          </div>
        ) : null}

        <form
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                email: formData.get("email"),
                password: formData.get("password"),
                redirectTo: sp.callbackUrl ?? "/admin",
              });
            } catch (error) {
              // A successful sign-in throws NEXT_REDIRECT, which must propagate.
              // A failed credential check throws AuthError, so convert it to a
              // redirect back to this page with ?error= so the inline message
              // renders instead of an opaque 500.
              if (error instanceof AuthError) {
                const code =
                  error.type === "CredentialsSignin" ? "CredentialsSignin" : error.type;
                const qs = new URLSearchParams({ error: code });
                if (sp.callbackUrl) qs.set("callbackUrl", sp.callbackUrl);
                redirect(`/admin/login?${qs.toString()}`);
              }
              throw error;
            }
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="text"
              required
              autoComplete="username"
              autoFocus
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5"
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full">
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}
