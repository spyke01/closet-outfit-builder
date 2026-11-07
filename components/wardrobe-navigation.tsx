"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/wardrobe", label: "Clothing" },
  { href: "/sizes", label: "My sizes" },
  { href: "/onboarding", label: "Add from the quick setup" },
];

export function WardrobeNavigation({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Wardrobe tools" className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border pb-4 text-sm">
      {destinations.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname?.startsWith(href) ? "page" : undefined} className={pathname?.startsWith(href) ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
          {label}
        </Link>
      ))}
      {children && <div className="ml-auto">{children}</div>}
    </nav>
  );
}
