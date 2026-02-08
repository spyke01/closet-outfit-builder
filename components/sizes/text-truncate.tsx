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
  tooltipClassName = '',
}: TextTruncateProps) {
  const [showTooltip, setShowTooltip] = useState(false);
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

  // Handle mouse enter/leave for desktop
  const handleMouseEnter = () => {
    if (isTruncated) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Handle tap for mobile
  const handleTap = (e: React.TouchEvent) => {
    if (isTruncated) {
      e.preventDefault();
      setShowTooltip((prev) => !prev);
    }
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (textRef.current && !textRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showTooltip]);

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
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchEnd={handleTap}
    >
      <span
        ref={textRef}
        className={`block ${isTruncated ? 'cursor-help' : ''}`}
        style={truncateStyle}
        aria-label={isTruncated ? text : undefined}
        title={isTruncated ? text : undefined}
      >
        {text}
      </span>

      {/* Tooltip */}
      {showTooltip && isTruncated && (
        <span
          className={`absolute z-50 px-3 py-2 text-sm font-normal text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg whitespace-normal break-words max-w-xs left-0 top-full mt-2 animate-in fade-in slide-in-from-top-1 duration-150 ${tooltipClassName}`}
          role="tooltip"
        >
          {text}
          {/* Tooltip arrow */}
          <span
            className="absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 -top-1 left-4"
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}
