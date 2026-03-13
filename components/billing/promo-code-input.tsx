'use client';

import { useState } from 'react';
import { Tag, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validatePromoCode } from '@/lib/actions/promo-code';
import type { PlanCode } from '@/lib/services/billing/plans';

interface PromoCodeInputProps {
  plan: Exclude<PlanCode, 'free'> | null;
  interval: 'month' | 'year';
  onValidated: (promoCodeDbId: string | null) => void;
}

export function PromoCodeInput({ plan, interval, onValidated }: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [discount, setDiscount] = useState<{
    discountPercent: number;
    durationMonths: number;
    discountedPriceCents: number;
    fullPriceCents: number;
  } | null>(null);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    if (!plan) {
      setStatus('invalid');
      setMessage('Please select a plan before applying a promo code.');
      return;
    }

    setStatus('loading');
    setMessage(null);
    setDiscount(null);

    const result = await validatePromoCode(trimmed, plan, interval);

    if (result.valid) {
      setStatus('valid');
      setMessage(result.message ?? `${result.discountPercent}% off for ${result.durationMonths} month${result.durationMonths !== 1 ? 's' : ''}`);
      setDiscount({
        discountPercent: result.discountPercent,
        durationMonths: result.durationMonths,
        discountedPriceCents: result.discountedPriceCents,
        fullPriceCents: result.fullPriceCents,
      });
      onValidated(result.promoCodeDbId);
    } else {
      setStatus('invalid');
      setMessage(result.message);
      onValidated(null);
    }
  };

  const handleClear = () => {
    setCode('');
    setStatus('idle');
    setMessage(null);
    setDiscount(null);
    onValidated(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="promo-code-field" className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5" />
        Promo Code
        <span className="text-xs font-normal text-muted-foreground">(monthly plans only)</span>
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="promo-code-field"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (status !== 'idle') {
                setStatus('idle');
                setMessage(null);
                setDiscount(null);
                onValidated(null);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. BETA50"
            maxLength={20}
            disabled={status === 'loading' || status === 'valid'}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 uppercase tracking-wider"
            aria-label="Promo code"
          />
          {status === 'valid' && (
            <button
              onClick={handleClear}
              aria-label="Remove promo code"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {status !== 'valid' && (
          <Button
            variant="outline"
            size="default"
            onClick={handleApply}
            disabled={!code.trim() || status === 'loading'}
            className="shrink-0"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Checking…
              </>
            ) : (
              'Apply'
            )}
          </Button>
        )}
      </div>

      {status === 'valid' && message && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {message}
          {discount && (
            <span className="text-muted-foreground ml-1">
              — ${(discount.discountedPriceCents / 100).toFixed(2)}/mo
              <span className="line-through ml-1 text-xs">${(discount.fullPriceCents / 100).toFixed(2)}</span>
            </span>
          )}
        </p>
      )}

      {status === 'invalid' && message && (
        <p className="text-sm text-destructive">{message}</p>
      )}
    </div>
  );
}
