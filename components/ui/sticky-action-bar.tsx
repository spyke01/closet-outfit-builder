import * as React from 'react';

import { cn } from '@/lib/utils';

interface StickyActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  topContent?: React.ReactNode;
  contentClassName?: string;
}

export function StickyActionBar({
  className,
  children,
  topContent,
  contentClassName,
  ...props
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-30 px-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4 sm:px-0',
        className,
      )}
      {...props}
    >
      {topContent ? (
        <div className="mx-auto mb-3 flex w-full max-w-5xl flex-col gap-2">
          {topContent}
        </div>
      ) : null}

      <div className="mx-auto flex w-full justify-center">
        <div
          role="toolbar"
          className={cn(
            'flex w-full max-w-fit flex-wrap items-center justify-center gap-2 rounded-[calc(var(--radius-pill)+8px)] border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg-surface-active)_88%,rgba(11,17,32,0.82))] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.36),0_2px_12px_rgba(91,156,245,0.14)] ring-1 ring-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] backdrop-blur-[calc(var(--blur-glass)+8px)] [-webkit-backdrop-filter:blur(calc(var(--blur-glass)+8px))] dark:[&>button:first-of-type]:border-[var(--border-strong)] dark:[&>button:first-of-type]:bg-[color-mix(in_srgb,rgba(255,255,255,0.12)_72%,rgba(11,17,32,0.88))] dark:[&>button:first-of-type]:text-[var(--text-1)] dark:[&>button:first-of-type]:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:[&>button:first-of-type]:hover:border-[var(--border-strong)] dark:[&>button:first-of-type]:hover:bg-[color-mix(in_srgb,rgba(255,255,255,0.16)_78%,rgba(11,17,32,0.9))] dark:[&>button:last-of-type]:border-transparent dark:[&>button:last-of-type]:bg-[linear-gradient(135deg,#4677dc,#5b8ff5)] dark:[&>button:last-of-type]:text-white dark:[&>button:last-of-type]:shadow-[0_8px_20px_rgba(91,156,245,0.32)] dark:[&>button:last-of-type]:hover:opacity-100 dark:[&>button:last-of-type]:hover:brightness-105',
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
