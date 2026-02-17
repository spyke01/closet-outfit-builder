'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'components-service-worker-registration' });
import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        logger.warn('Service worker registration failed:', error);
      });
    }
  }, []);

  return null;
}
