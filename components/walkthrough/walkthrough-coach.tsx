'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { WalkthroughStep } from '@/lib/types/walkthrough';

interface Props {
  steps: WalkthroughStep[];
  currentStep: number | null;
  onNext: () => void;
  onDismiss: () => void;
  prefersReducedMotion?: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
}

function computeTooltipPosition(
  targetRect: DOMRect,
  tooltipEl: HTMLElement,
  position: WalkthroughStep['position'] = 'bottom'
): TooltipPosition {
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const gap = 12;
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  let top = 0;
  let left = 0;

  if (position === 'bottom') {
    top = targetRect.bottom + scrollY + gap;
    left = targetRect.left + scrollX + targetRect.width / 2 - tooltipRect.width / 2;
  } else if (position === 'top') {
    top = targetRect.top + scrollY - tooltipRect.height - gap;
    left = targetRect.left + scrollX + targetRect.width / 2 - tooltipRect.width / 2;
  } else if (position === 'left') {
    top = targetRect.top + scrollY + targetRect.height / 2 - tooltipRect.height / 2;
    left = targetRect.left + scrollX - tooltipRect.width - gap;
  } else {
    top = targetRect.top + scrollY + targetRect.height / 2 - tooltipRect.height / 2;
    left = targetRect.right + scrollX + gap;
  }

  // Clamp to viewport
  const maxLeft = window.innerWidth + scrollX - tooltipRect.width - 8;
  const minLeft = scrollX + 8;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  return { top, left };
}

export function WalkthroughCoach({ steps, currentStep, onNext, onDismiss, prefersReducedMotion }: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TooltipPosition | null>(null);

  const stepIndex = currentStep != null ? currentStep - 1 : -1;
  const step = stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null;
  const isLast = currentStep === steps.length;

  useEffect(() => {
    if (!step || !tooltipRef.current) return;

    const target = document.querySelector(`[data-walkthrough-id="${step.targetId}"]`);
    if (!target) {
      // If target not found, position in center of screen
      setPos({ top: window.innerHeight / 2 - 80 + window.scrollY, left: window.innerWidth / 2 - 160 });
      return;
    }

    const rect = target.getBoundingClientRect();
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });

    // Recompute after scroll settles
    const timeout = setTimeout(() => {
      const freshRect = target.getBoundingClientRect();
      if (tooltipRef.current) {
        setPos(computeTooltipPosition(freshRect, tooltipRef.current, step.position));
      }
    }, prefersReducedMotion ? 0 : 350);

    setPos(computeTooltipPosition(rect, tooltipRef.current, step.position));
    return () => clearTimeout(timeout);
  }, [step, prefersReducedMotion]);

  // Escape key dismissal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onDismiss]);

  if (!step || currentStep === null) return null;

  return createPortal(
    <>
      {/* Semi-transparent overlay — click-through except on tooltip */}
      <div
        className="fixed inset-0 bg-black/30 z-[9998]"
        aria-hidden="true"
        onClick={onDismiss}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-label={step.title}
        className={[
          'fixed z-[9999] w-72 bg-card border border-border rounded-lg shadow-lg p-4 flex flex-col gap-3',
          prefersReducedMotion ? '' : 'transition-opacity duration-200',
          pos ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={pos ? { top: pos.top, left: pos.left } : { top: '-9999px', left: '-9999px' }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
          <button
            onClick={onDismiss}
            aria-label="Skip tour"
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">{step.body}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{currentStep} of {steps.length}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Skip tour
            </button>
            <button
              onClick={onNext}
              className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>

        {/* Step progress dots */}
        <div className="flex gap-1 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={[
                'w-1.5 h-1.5 rounded-full',
                i + 1 === currentStep ? 'bg-primary' : 'bg-muted-foreground/30',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}
