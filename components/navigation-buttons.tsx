'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigationPreloading } from '@/lib/hooks/use-intelligent-preloading';

import Link from 'next/link';

interface NavigationButtonsProps {
  backTo: {
    href: string;
    label: string;
  };
  className?: string;
}

export function NavigationButtons({ backTo, className = '' }: NavigationButtonsProps) {
  const { getNavigationProps } = useNavigationPreloading();

  return (
    <nav 
      className={`flex items-center justify-start py-2 ${className}`}
      aria-label="Page navigation"
    >
      <Link 
        href={backTo.href} 
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        {...getNavigationProps(backTo.href)}
      >
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 hover:bg-muted transition-colors"
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