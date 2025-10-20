'use client';

import Link from "next/link";
import { Logo } from "./logo";

interface AuthHeaderProps {
  className?: string;
}

export function AuthHeader({ className = "" }: AuthHeaderProps) {
  return (
    <div className={`flex flex-col items-center space-y-4 mb-8 ${className}`}>
      <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <Logo className="h-12 w-auto" />
      </Link>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Intelligent outfit composition for the modern wardrobe
        </p>
      </div>
    </div>
  );
}