'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  title?: string;
}

export function Logo({
  className = 'h-12 w-auto',
  title = 'My AI Outfit',
}: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const effectiveTheme = theme === 'system' ? resolvedTheme : theme;
  const src = effectiveTheme === 'light'
    ? '/my-ai-outfit-logo-light-bg.png'
    : '/my-ai-outfit-logo-dark-bg.png';

  return (
    <Image
      src={src}
      alt={title}
      width={200}
      height={50}
      className={cn(className, 'block h-auto w-auto')}
      loading="eager"
      priority={false}
    />
  );
}
