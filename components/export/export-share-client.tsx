'use client';

import { useState, useRef, useCallback } from 'react';
import { Download, Share2, Lock } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExportComingSoon } from './export-coming-soon';

interface Outfit {
  id: string;
  name: string;
  score: number | null;
}

interface Props {
  tier: 'free' | 'plus' | 'pro';
  outfits: Outfit[];
}

function UpgradeGate() {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <div className="blur-sm pointer-events-none select-none p-8 flex flex-col gap-4 bg-card">
        <div className="h-8 bg-muted rounded w-40" />
        <div className="h-32 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-9 bg-muted rounded w-32" />
          <div className="h-9 bg-muted rounded w-32" />
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm gap-3">
        <Lock className="w-5 h-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center px-4">
          Export and Share are available on the Pro plan
        </p>
        <Link
          href="/settings/billing"
          className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}

export function ExportShareClient({ tier, outfits }: Props) {
  const isPro = tier === 'pro';
  const [selectedId, setSelectedId] = useState<string>(outfits[0]?.id ?? '');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const selectedOutfit = outfits.find((o) => o.id === selectedId);
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/outfits/${selectedId}`
    : `/outfits/${selectedId}`;

  const handleExport = useCallback(async () => {
    if (!isPro || !cardRef.current || !selectedOutfit) return;
    setExporting(true);
    setStatus(null);
    try {
      const { default: htmlToImage } = await import('html-to-image');
      const dataUrl = await htmlToImage.toPng(cardRef.current);
      const link = document.createElement('a');
      link.download = `${selectedOutfit.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Fallback: use window.print() or canvas
      try {
        const canvas = document.createElement('canvas');
        const rect = cardRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#000000';
          ctx.fillText(selectedOutfit.name, 16, 32);
        }
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${selectedOutfit.name.replace(/\s+/g, '-').toLowerCase()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        });
      } catch {
        setStatus({ type: 'error', message: 'Export failed. Try again.' });
      }
    } finally {
      setExporting(false);
    }
  }, [isPro, selectedOutfit]);

  const handleShare = useCallback(async () => {
    if (!isPro || !selectedOutfit) return;
    setSharing(true);
    setStatus(null);
    try {
      if (navigator.canShare?.({ url: shareUrl })) {
        await navigator.share({ title: selectedOutfit.name, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setStatus({ type: 'success', message: 'Link copied to clipboard!' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not share. Try copying the link manually.' });
    } finally {
      setSharing(false);
    }
  }, [isPro, selectedOutfit, shareUrl]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export & Share</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download your outfit as an image or share a link with others
        </p>
      </div>

      {!isPro ? (
        <UpgradeGate />
      ) : (
        <div className="flex flex-col gap-6">
          {outfits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No outfits yet.{' '}
              <Link href="/outfits" className="underline">Create one first.</Link>
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="outfit-select" className="text-sm font-medium text-foreground">
                  Select an outfit
                </label>
                <select
                  id="outfit-select"
                  value={selectedId}
                  onChange={(e) => { setSelectedId(e.target.value); setStatus(null); }}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {outfits.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* Outfit card preview — captured for PNG export */}
              <div
                ref={cardRef}
                className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3"
              >
                <h2 className="text-lg font-semibold text-foreground">{selectedOutfit?.name}</h2>
                {selectedOutfit?.score != null && (
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit">
                    Score: {selectedOutfit.score}%
                  </span>
                )}
                <p className="text-sm text-muted-foreground">My AI Outfit — myaioutfit.com</p>
              </div>

              {status && (
                <Alert variant={status.type === 'success' ? 'default' : 'destructive'}>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting…' : 'Export as image'}
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  {sharing ? 'Sharing…' : 'Share'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <ExportComingSoon />
    </div>
  );
}
