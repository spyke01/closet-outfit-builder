import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] text-[var(--text-on-accent)] text-[0.82rem] font-semibold shadow-[var(--shadow-accent)] hover:-translate-y-px hover:shadow-[var(--shadow-accent-hover)] active:translate-y-0 active:opacity-90",
        destructive:
          "border border-transparent bg-destructive text-[0.82rem] font-semibold text-destructive-foreground shadow-sm hover:opacity-90 active:opacity-90",
        outline:
          "border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-2)] text-[0.79rem] font-medium backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-1)] active:bg-[var(--bg-surface-active)]",
        secondary:
          "border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-2)] text-[0.79rem] font-medium backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-1)] active:bg-[var(--bg-surface-active)]",
        ghost:
          "border border-transparent bg-transparent text-[var(--text-2)] text-[0.72rem] font-medium hover:border-[var(--border-subtle)] hover:bg-[var(--button-tertiary-hover)] hover:text-[var(--text-1)] active:bg-[var(--button-tertiary-active)]",
        action:
          "border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_78%,transparent)] text-[var(--text-2)] text-[0.72rem] font-medium hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-1)] active:bg-[var(--bg-surface-active)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-[16px] py-[9px]",
        sm: "px-[12px] py-[6px]",
        lg: "px-[22px] py-[11px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
