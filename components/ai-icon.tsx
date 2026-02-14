'use client';

import { Sparkles } from 'lucide-react';

interface AIIconProps {
  className?: string;
}

export function AIIcon({ className = 'w-4 h-4' }: AIIconProps) {
  return <Sparkles className={className} aria-hidden="true" />;
}

