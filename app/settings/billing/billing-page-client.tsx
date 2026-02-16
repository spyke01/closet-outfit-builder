'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CreditCard, FileText, ImageIcon, Loader2, ReceiptText, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlanSelector } from '@/components/billing/plan-selector';

interface EntitlementsResponse {
  entitlements: {
    effectivePlanCode: 'free' | 'plus' | 'pro';
    billingState: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing' | 'scheduled_cancel';
    isPaid: boolean;
    hasBillingAccount: boolean;
    plan: {
      name: string;
      limits: Record<string, number | null>;
      features: Record<string, boolean>;
    };
    period: {
      key: string;
      start: string;
      end: string;
    };
    renewalAt: string | null;
    usage: Record<string, number>;
  };
}

interface BillingHistoryInvoice {
  id: string;
  created: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatRenewalDate(value: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function BillingPageClient() {
  const { user, loading: authLoading } = useAuth();
  const [entitlements, setEntitlements] = useState<EntitlementsResponse['entitlements'] | null>(null);
  const [invoices, setInvoices] = useState<BillingHistoryInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'plus-month' | 'plus-year' | 'pro-month' | 'pro-year' | 'portal' | 'switch-free' | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entitlementsRes = await fetch('/api/billing/entitlements', { method: 'GET' });

      if (!entitlementsRes.ok) {
        const data = await entitlementsRes.json();
        throw new Error(data.error || 'Failed to load entitlements');
      }

      const entitlementPayload = await entitlementsRes.json() as EntitlementsResponse;
      setEntitlements(entitlementPayload.entitlements);

      const historyRes = await fetch('/api/billing/history', { method: 'GET' });
      if (historyRes.ok) {
        const historyPayload = await historyRes.json() as { invoices: BillingHistoryInvoice[] };
        setInvoices(historyPayload.invoices || []);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadData().catch(() => undefined);
    }
  }, [authLoading, user, loadData]);

  const startCheckout = async (plan: 'plus' | 'pro', interval: 'month' | 'year') => {
    setBusyAction(`${plan}-${interval}`);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to start checkout');
      }
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setBusyAction(null);
    }
  };

  const openPortal = async () => {
    setBusyAction('portal');
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to open billing portal');
      }
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setBusyAction(null);
    }
  };

  const switchToFree = async () => {
    setBusyAction('switch-free');
    try {
      const response = await fetch('/api/billing/switch-free', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to switch to free');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch to free');
    } finally {
      setBusyAction(null);
    }
  };

  const showCurrentMembership = Boolean(entitlements?.hasBillingAccount);

  if (authLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading membership details...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your membership, billing history, and payment methods.</p>
      </div>

      {entitlements && (entitlements.billingState === 'past_due' || entitlements.billingState === 'unpaid') && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          Billing issue detected. Free features remain available. Paid features are temporarily disabled until payment is resolved.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}

      {showCurrentMembership && (
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Current Membership</h2>
                  <p className="text-sm text-muted-foreground">Plan details and usage against your current cycle.</p>
                </div>
                <Button variant="outline" onClick={openPortal} disabled={busyAction === 'portal'}>
                  <CreditCard className="w-4 h-4 mr-1" />
                  {busyAction === 'portal' ? 'Opening...' : 'Manage Payment Info'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Renewal date</span>
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {formatRenewalDate(entitlements?.renewalAt || null)}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Outfit Generation</span>
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {(entitlements?.usage?.ai_outfit_generations || 0)} / {entitlements?.plan.limits.ai_outfit_generations_monthly ?? 'unlimited'}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>AI Image Generation</span>
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {(entitlements?.usage?.ai_outfit_image_generations || 0)} / {entitlements?.plan.limits.ai_image_generations_monthly ?? 'unlimited'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <PlanSelector
        context="billing"
        isAuthenticated={Boolean(user)}
        currentPlanCode={entitlements?.effectivePlanCode}
        busyAction={busyAction}
        onCheckout={startCheckout}
        onManageBilling={openPortal}
        onSwitchToFree={switchToFree}
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Payment History</h2>
            <p className="text-sm text-muted-foreground">Invoice timeline from Stripe billing records.</p>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No billing history yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatMoney(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(invoice.created * 1000).toLocaleDateString()} | {invoice.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {invoice.hosted_invoice_url && (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        aria-label="Open invoice"
                        title="Open invoice"
                      >
                        <ReceiptText className="w-4 h-4" />
                      </a>
                    )}
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        aria-label="Open invoice PDF"
                        title="Open invoice PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
