'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SebastianAvatarProps {
  className?: string;
  src?: string;
  alt?: string;
}

export function SebastianAvatar({
  className,
  src = '/images/sebastian/sebastian-chat-icon.png',
  alt = 'Sebastian',
}: SebastianAvatarProps) {
  const [imageSrc, setImageSrc] = useState(src);

  return (
    <div className={cn('relative h-8 w-8 overflow-hidden rounded-full border border-border bg-card', className)}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        sizes="32px"
        className="object-cover"
        priority={false}
        onError={() => {
          if (imageSrc !== '/images/sebastian/sebastian-full.png') {
            setImageSrc('/images/sebastian/sebastian-full.png');
          }
        }}
      />
    </div>
  );
}
