import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Keeps the platform picker while giving its caret a consistent inset. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex min-w-0">
      <select
        {...props}
        className={cn("min-w-0 appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-10 text-sm text-foreground", className)}
      />
      <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}
