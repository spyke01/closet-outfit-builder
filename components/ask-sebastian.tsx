"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClothingPieceIdentity } from "@/lib/utils/clothing-piece-label";

import { openSebastian } from "@/lib/utils/sebastian-events";
export function AskSebastian({
  prompt = "",
  contextHints = {},
  focusItem,
  children = "Ask Sebastian",
  className = "",
}: {
  prompt?: string;
  contextHints?: Record<string, unknown>;
  focusItem?: ClothingPieceIdentity;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => openSebastian(prompt, contextHints, focusItem)}
    >
      <Sparkles size={16} aria-hidden="true" />
      {children}
    </Button>
  );
}
