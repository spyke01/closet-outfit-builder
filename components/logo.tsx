interface LogoProps {
  className?: string;
  title?: string;
}

export function Logo({
  className = 'h-12 w-auto',
  title = 'My AI Outfit',
}: LogoProps) {
  return (
    <picture>
      <source media="(prefers-color-scheme: light)" srcSet="/my-ai-outfit-logo-light-bg.png" />
      <img
        src="/my-ai-outfit-logo-dark-bg.png"
        alt={title}
        width={200}
        height={50}
        className={className}
        loading="eager"
        decoding="async"
        fetchPriority="low"
      />
    </picture>
  );
}
