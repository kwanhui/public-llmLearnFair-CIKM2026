import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAGE: Guardrailed Tutor for Self-Regulated Learning",
  description:
    "SAGE: a guardrailed LLM tutor that scaffolds self-regulated learning for adult learners, with a counterfactual fairness audit as a secondary safeguard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
