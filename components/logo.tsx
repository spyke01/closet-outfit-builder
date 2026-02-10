'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  title?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = 'h-8 sm:h-10 w-auto',
  title = 'My AI Outfit',
}) => {
  return (
    <svg
      viewBox="0 0 640 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
    >
      <title>{title}</title>

      {/* Use inline styles that React can render correctly */}
      <g
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Minimal suit + tie icon */}
        <g transform="translate(40 36)">
          <path d="M8 0 L32 28 L56 0" />
          <path d="M8 0 L8 64" />
          <path d="M56 0 L56 64" />
          <path d="M32 28 L26 48 L32 64 L38 48 Z" />
        </g>

        {/* Wordmark */}
        <text
          x={130}
          y={95}
          fontSize={48}
          fill="currentColor"
          fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
          fontWeight={600}
          letterSpacing="0.04em"
        >
          My AI Outfit
        </text>
      </g>
    </svg>
  );
};
