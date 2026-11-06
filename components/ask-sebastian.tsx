"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

import { openSebastian } from "@/lib/utils/sebastian-events";
export function AskSebastian({
  prompt = "",
  contextHints = {},
  children = "Ask Sebastian",
  className = "",
}: {
  prompt?: string;
  contextHints?: Record<string, unknown>;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => openSebastian(prompt, contextHints)}
    >
      <Sparkles size={16} aria-hidden="true" />
      {children}
    </Button>
  );
}
