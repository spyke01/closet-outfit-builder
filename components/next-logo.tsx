interface NextLogoProps {
  className?: string;
  title?: string;
}

export function NextLogo({ className, title = "My AI Outfit Logo" }: NextLogoProps = {}) {
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
}
