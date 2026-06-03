"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CohortTabs({ cohortId }: { cohortId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/admin/cohorts/${cohortId}`, label: "Overview" },
    { href: `/admin/cohorts/${cohortId}/config`, label: "Configuration" },
    { href: `/admin/cohorts/${cohortId}/students`, label: "Students" },
    { href: `/admin/cohorts/${cohortId}/analytics`, label: "Analytics" },
  ];
  return (
    <nav className="mt-5 flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-4 py-2.5 text-sm transition-colors -mb-px",
              active
                ? "font-medium text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
