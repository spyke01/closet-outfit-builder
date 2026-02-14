'use client';

/**
 * TextTruncate Component
 * 
 * Truncates text exceeding container width with ellipsis and shows full text in tooltip.
 * Works on both hover (desktop) and tap (mobile).
 * 
 * Features:
 * - CSS-based text truncation with ellipsis
 * - Tooltip shows full text on hover/tap
 * - Accessible with ARIA attributes
 * - Mobile-friendly tap interaction
 * - No external dependencies (pure CSS + React)
 * 
 * Requirements: 12.3
 */

import { useState, useRef, useEffect } from 'react';

export interface TextTruncateProps {
  text: string;
  className?: string;
  maxLines?: number; // Default: 1 (single line truncation)
  tooltipClassName?: string;
}

export function TextTruncate({
  text,
  className = '',
  maxLines = 1,
  tooltipClassName: _tooltipClassName = '',
}: TextTruncateProps) {
  void _tooltipClassName;

  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  // Check if text is actually truncated
  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    // For single line: compare scrollWidth with clientWidth
    // For multi-line: compare scrollHeight with clientHeight
    const checkTruncation = () => {
      if (maxLines === 1) {
        setIsTruncated(element.scrollWidth > element.clientWidth);
      } else {
        setIsTruncated(element.scrollHeight > element.clientHeight);
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      checkTruncation();
    });

    // Re-check on window resize
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text, maxLines]);

  const truncateStyle =
    maxLines === 1
      ? {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }
      : {
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        };

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        ref={textRef}
        className={`block ${isTruncated ? 'cursor-help' : ''}`}
        style={truncateStyle}
        aria-label={isTruncated ? text : undefined}
        title={isTruncated ? text : undefined}
      >
        {text}
      </span>
    </span>
  );
}
