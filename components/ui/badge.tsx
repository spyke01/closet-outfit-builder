import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.04em] transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-[var(--app-badge-border)] bg-[var(--app-badge-bg)] text-[var(--app-badge-text)] shadow-sm",
        secondary:
          "border-[var(--app-badge-border)] bg-[color-mix(in_srgb,var(--app-badge-bg)_82%,white_18%)] text-[var(--app-badge-text)]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "border-[var(--app-badge-border)] text-[var(--app-badge-text)] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
