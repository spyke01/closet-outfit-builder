'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Link from 'next/link';

interface NavigationButtonsProps {
  backTo: {
    href: string;
    label: string;
  };
  className?: string;
}

export function NavigationButtons({ backTo, className = '' }: NavigationButtonsProps) {
  return (
    <nav 
      className={`flex items-center justify-start py-2 ${className}`}
      aria-label="Page navigation"
    >
      <Link href={backTo.href} className="focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 rounded-lg">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label={`Navigate ${backTo.label}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{backTo.label}</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </Link>
    </nav>
  );
}