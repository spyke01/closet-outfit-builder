'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

interface LogoProps {
  className?: string;
  title?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = 'h-12 w-auto',
  title = 'My AI Outfit',
}) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Use light logo for light theme, dark logo for dark theme
  const logoSrc = resolvedTheme === 'dark' 
    ? '/my-ai-outfit-logo-dark-bg.png'
    : '/my-ai-outfit-logo-light-bg.png';

  // Show a placeholder during SSR to avoid layout shift
  if (!mounted) {
    return <div className={className} aria-label={title} />;
  }

  return (
    <Image
      src={logoSrc}
      alt={title}
      width={200}
      height={50}
      className={className}
      priority
    />
  );
};
