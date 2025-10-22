'use client';

import { useEffect, useState } from 'react';

interface UrlInfo {
  origin: string;
  href: string;
  hostname: string;
  protocol: string;
  port: string;
}

export function UrlDebug() {
  const [urlInfo, setUrlInfo] = useState<UrlInfo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrlInfo({
        origin: window.location.origin,
        href: window.location.href,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port,
      });
    }
  }, []);

  if (!urlInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-md">
      <h3 className="font-bold mb-2">🐛 URL Debug Info</h3>
      <div className="space-y-1">
        <div><strong>Origin:</strong> {urlInfo.origin}</div>
        <div><strong>Hostname:</strong> {urlInfo.hostname}</div>
        <div><strong>Protocol:</strong> {urlInfo.protocol}</div>
        <div><strong>Port:</strong> {urlInfo.port || 'default'}</div>
        <div><strong>Full URL:</strong> {urlInfo.href}</div>
        <div><strong>Auth Callback:</strong> {urlInfo.origin}/auth/callback</div>
      </div>
    </div>
  );
}