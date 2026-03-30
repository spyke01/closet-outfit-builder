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
  /** Pixel offset from tooltip left edge to where the arrow should point */
  arrowLeft: number;
  /** Pixel offset from tooltip top edge to where the arrow should point */
  arrowTop: number;
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

  const targetCenterX = targetRect.left + scrollX + targetRect.width / 2;
  const targetCenterY = targetRect.top + scrollY + targetRect.height / 2;

  let top = 0;
  let left = 0;

  if (position === 'bottom') {
    top = targetRect.bottom + scrollY + gap;
    left = targetCenterX - tooltipRect.width / 2;
  } else if (position === 'top') {
    top = targetRect.top + scrollY - tooltipRect.height - gap;
    left = targetCenterX - tooltipRect.width / 2;
  } else if (position === 'left') {
    top = targetCenterY - tooltipRect.height / 2;
    left = targetRect.left + scrollX - tooltipRect.width - gap;
  } else {
    top = targetCenterY - tooltipRect.height / 2;
    left = targetRect.right + scrollX + gap;
  }

  // Clamp to viewport
  const maxLeft = window.innerWidth + scrollX - tooltipRect.width - 8;
  const minLeft = scrollX + 8;
  const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));

  // Arrow points at target center, clamped to tooltip bounds with padding
  const arrowLeft = Math.max(16, Math.min(tooltipRect.width - 16, targetCenterX - clampedLeft));
  const arrowTop = Math.max(16, Math.min(tooltipRect.height - 16, targetCenterY - top));

  return { top, left: clampedLeft, arrowLeft, arrowTop };
}

export function WalkthroughCoach({ steps, currentStep, onNext, onDismiss, prefersReducedMotion }: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TooltipPosition | null>(null);

  const stepIndex = currentStep != null ? currentStep - 1 : -1;
  const step = stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null;
  const isLast = currentStep === steps.length;

  // Highlight the current target element with a ring
  useEffect(() => {
    if (!step) return;
    const target = document.querySelector(`[data-walkthrough-id="${step.targetId}"]`) as HTMLElement | null;
    if (!target) return;
    target.setAttribute('data-walkthrough-active', 'true');
    return () => target.removeAttribute('data-walkthrough-active');
  }, [step]);

  useEffect(() => {
    if (!step || !tooltipRef.current) return;

    const target = document.querySelector(`[data-walkthrough-id="${step.targetId}"]`);
    if (!target) {
      setPos({ top: window.innerHeight / 2 - 80 + window.scrollY, left: window.innerWidth / 2 - 160, arrowLeft: 160, arrowTop: 0 });
      return;
    }

    const rect = target.getBoundingClientRect();
    // Only scroll for off-screen targets (not nav items already visible)
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    }

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
          'fixed z-[9999] flex w-72 flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--popover)] p-4 shadow-[var(--shadow-card)] backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))]',
          prefersReducedMotion ? '' : 'transition-opacity duration-200',
          pos ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={pos ? { top: pos.top, left: pos.left } : { top: '-9999px', left: '-9999px' }}
      >
        {/* Arrow pointing at target — SVG for crisp sharp edges */}
        {pos && step.position === 'bottom' && (
          <svg
            className="absolute overflow-visible"
            style={{ left: pos.arrowLeft - 7, top: -8 }}
            width="14" height="8" viewBox="0 0 14 8"
            aria-hidden="true"
          >
            <polygon points="0,8 7,0 14,8" style={{ fill: 'var(--popover)' }} />
            <polyline points="0,8 7,0 14,8" style={{ fill: 'none', stroke: 'var(--border-subtle)', strokeWidth: '1', strokeLinejoin: 'miter' }} />
          </svg>
        )}
        {pos && step.position === 'top' && (
          <svg
            className="absolute overflow-visible"
            style={{ left: pos.arrowLeft - 7, bottom: -8 }}
            width="14" height="8" viewBox="0 0 14 8"
            aria-hidden="true"
          >
            <polygon points="0,0 7,8 14,0" style={{ fill: 'var(--popover)' }} />
            <polyline points="0,0 7,8 14,0" style={{ fill: 'none', stroke: 'var(--border-subtle)', strokeWidth: '1', strokeLinejoin: 'miter' }} />
          </svg>
        )}
        {pos && step.position === 'right' && (
          <svg
            className="absolute overflow-visible"
            style={{ top: pos.arrowTop - 7, left: -8 }}
            width="8" height="14" viewBox="0 0 8 14"
            aria-hidden="true"
          >
            <polygon points="8,0 0,7 8,14" style={{ fill: 'var(--popover)' }} />
            <polyline points="8,0 0,7 8,14" style={{ fill: 'none', stroke: 'var(--border-subtle)', strokeWidth: '1', strokeLinejoin: 'miter' }} />
          </svg>
        )}
        {pos && step.position === 'left' && (
          <svg
            className="absolute overflow-visible"
            style={{ top: pos.arrowTop - 7, right: -8 }}
            width="8" height="14" viewBox="0 0 8 14"
            aria-hidden="true"
          >
            <polygon points="0,0 8,7 0,14" style={{ fill: 'var(--popover)' }} />
            <polyline points="0,0 8,7 0,14" style={{ fill: 'none', stroke: 'var(--border-subtle)', strokeWidth: '1', strokeLinejoin: 'miter' }} />
          </svg>
        )}
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
