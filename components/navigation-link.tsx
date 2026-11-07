"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

function NavigationFeedback({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span data-navigation-pending={pending} className="navigation-feedback">
      {pending && <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden="true" />}
      <span role="status" className="sr-only">{pending ? `Opening ${label}…` : ""}</span>
    </span>
  );
}

export function NavigationLink({ children, label, ...props }: ComponentProps<typeof Link> & { label: string }) {
  return (
    <Link {...props}>
      {children}
      <NavigationFeedback label={label} />
    </Link>
  );
}
