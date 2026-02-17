import crypto from 'crypto';
import type { PlanCode } from './plans';

export type PlanSelection = {
  code: PlanCode;
  interval: 'month' | 'year';
};

export interface StripeInvoiceSummary {
  id: string;
  created: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface StripeCustomer {
  id: string;
  email: string | null;
  created: number;
}

interface StripeSubscription {
  id: string;
  created?: number;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number | null;
  current_period_end: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
}

export type StripeMode = 'test' | 'live';

function getStripeMode(): StripeMode {
  const mode = process.env.STRIPE_MODE?.toLowerCase();
  if (mode === 'live') return 'live';
  return 'test';
}

function getStripeEnvValue(baseName: string): string | undefined {
  const mode = getStripeMode();
  if (mode === 'live') {
    return process.env[`${baseName}_LIVE`] || process.env[baseName];
  }
  return process.env[`${baseName}_TEST`] || process.env[baseName];
}

function getStripeSecretKey() {
  const mode = getStripeMode();
  const key = getStripeEnvValue('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  if (mode === 'test' && key.startsWith('sk_live_')) {
    throw new Error('STRIPE_MODE is test but live secret key is configured');
  }
  if (mode === 'live' && key.startsWith('sk_test_')) {
    throw new Error('STRIPE_MODE is live but test secret key is configured');
  }
  return key;
}

function getStripeWebhookSecret() {
  const key = getStripeEnvValue('STRIPE_WEBHOOK_SECRET');
  if (!key) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  return key;
}

export function getStripePriceId(selection: PlanSelection): string {
  const map: Record<string, string | undefined> = {
    'plus:month': getStripeEnvValue('STRIPE_PRICE_PLUS_MONTHLY'),
    'plus:year': getStripeEnvValue('STRIPE_PRICE_PLUS_YEARLY'),
    'pro:month': getStripeEnvValue('STRIPE_PRICE_PRO_MONTHLY'),
    'pro:year': getStripeEnvValue('STRIPE_PRICE_PRO_YEARLY'),
  };

  const key = `${selection.code}:${selection.interval}`;
  const priceId = map[key];
  if (!priceId) {
    throw new Error(`Missing Stripe price id for ${key}`);
  }

  return priceId;
}

export function getPlanFromStripePriceId(priceId: string | null): { planCode: 'free' | 'plus' | 'pro'; interval: 'none' | 'month' | 'year' } {
  if (!priceId) return { planCode: 'free', interval: 'none' };

  const map: Record<string, { planCode: 'free' | 'plus' | 'pro'; interval: 'none' | 'month' | 'year' }> = {
    [getStripeEnvValue('STRIPE_PRICE_PLUS_MONTHLY') || '']: { planCode: 'plus', interval: 'month' },
    [getStripeEnvValue('STRIPE_PRICE_PLUS_YEARLY') || '']: { planCode: 'plus', interval: 'year' },
    [getStripeEnvValue('STRIPE_PRICE_PRO_MONTHLY') || '']: { planCode: 'pro', interval: 'month' },
    [getStripeEnvValue('STRIPE_PRICE_PRO_YEARLY') || '']: { planCode: 'pro', interval: 'year' },
  };

  return map[priceId] || { planCode: 'free', interval: 'none' };
}

async function stripeRequest<T>(path: string, method: 'GET' | 'POST' | 'DELETE', body?: URLSearchParams): Promise<T> {
  const key = getStripeSecretKey();
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body?.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || 'Stripe request failed';
    throw new Error(message);
  }

  return data as T;
}

export async function createStripeCheckoutSession(input: {
  priceId: string;
  userId: string;
  email: string;
  appUrl: string;
  customerId?: string | null;
  previousSubscriptionId?: string | null;
}) {
  const payload = new URLSearchParams();
  payload.append('mode', 'subscription');
  payload.append('line_items[0][price]', input.priceId);
  payload.append('line_items[0][quantity]', '1');
  payload.append('success_url', `${input.appUrl}/billing/updated?session_id={CHECKOUT_SESSION_ID}`);
  payload.append('cancel_url', `${input.appUrl}/pricing`);
  payload.append('allow_promotion_codes', 'true');
  payload.append('metadata[user_id]', input.userId);
  payload.append('metadata[source]', 'web_pricing');
  if (input.previousSubscriptionId) {
    payload.append('metadata[previous_subscription_id]', input.previousSubscriptionId);
  }

  if (input.customerId) {
    payload.append('customer', input.customerId);
  } else {
    payload.append('customer_email', input.email);
  }

  return stripeRequest<{ id: string; url: string }>('/checkout/sessions', 'POST', payload);
}

export async function createStripePortalSession(input: {
  customerId: string;
  appUrl: string;
}) {
  const payload = new URLSearchParams();
  payload.append('customer', input.customerId);
  payload.append('return_url', `${input.appUrl}/settings/billing`);
  return stripeRequest<{ id: string; url: string }>('/billing_portal/sessions', 'POST', payload);
}

export async function listStripeInvoices(customerId: string, limit = 25) {
  return stripeRequest<{ data: StripeInvoiceSummary[] }>(`/invoices?customer=${encodeURIComponent(customerId)}&limit=${limit}`, 'GET');
}

export async function listStripeCustomersByEmail(email: string, limit = 10) {
  return stripeRequest<{ data: StripeCustomer[] }>(
    `/customers?email=${encodeURIComponent(email)}&limit=${limit}`,
    'GET'
  );
}

export async function listStripeSubscriptionsByCustomer(customerId: string, limit = 20) {
  return stripeRequest<{ data: StripeSubscription[] }>(
    `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=${limit}`,
    'GET'
  );
}

export async function cancelStripeSubscriptionNow(subscriptionId: string) {
  try {
    return await stripeRequest<{ id: string; status: string }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, 'DELETE');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stripe cancellation error';
    if (
      message.toLowerCase().includes('already canceled')
      || message.toLowerCase().includes('no such subscription')
    ) {
      return { id: subscriptionId, status: 'canceled' };
    }
    throw error;
  }
}

export async function cancelStripeSubscriptionAtPeriodEnd(subscriptionId: string) {
  const payload = new URLSearchParams();
  payload.append('cancel_at_period_end', 'true');
  try {
    return await stripeRequest<{ id: string; status: string; cancel_at_period_end: boolean }>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      'POST',
      payload
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stripe cancellation error';
    const normalizedMessage = message.toLowerCase();
    if (
      normalizedMessage.includes('already canceled')
      || normalizedMessage.includes('no such subscription')
      || normalizedMessage.includes('incomplete_expired')
      || normalizedMessage.includes('cannot update a subscription that is incomplete')
    ) {
      return { id: subscriptionId, status: 'canceled', cancel_at_period_end: true };
    }
    throw error;
  }
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = getStripeWebhookSecret();
  const components = signatureHeader.split(',').map((part) => part.trim());
  const timestampPart = components.find((part) => part.startsWith('t='));
  const signatures = components.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));

  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = timestampPart.slice(2);
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  return signatures.some((sig) => {
    const actualBuffer = Buffer.from(sig, 'utf8');
    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });
}
