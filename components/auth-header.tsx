'use client';

import Link from "next/link";
import { Logo } from "./logo";

interface AuthHeaderProps {
  className?: string;
}

export function AuthHeader({ className = "" }: AuthHeaderProps) {
  return (
    <div className={`mb-8 flex flex-col items-center space-y-4 text-center ${className}`}>
      <Link href="/" className="flex items-center space-x-2 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:opacity-90">
        <Logo className="h-12 w-auto" />
      </Link>
      <p className="max-w-xs text-sm text-[var(--text-2)]">
        Intelligent outfit composition for the modern wardrobe
      </p>
    </div>
  );
}
