import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { verifyStripeWebhookSignature } from '@/lib/services/billing/stripe';

function buildSignatureHeader(payload: string, secret: string, timestamp: number): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('verifyStripeWebhookSignature', () => {
  const payload = JSON.stringify({ id: 'evt_123', type: 'invoice.paid' });
  const secret = 'whsec_test_secret';

  beforeEach(() => {
    process.env.STRIPE_MODE = 'test';
    process.env.STRIPE_WEBHOOK_SECRET_TEST = secret;
  });

  it('accepts valid fresh signatures', () => {
    const now = 1_700_000_000;
    const header = buildSignatureHeader(payload, secret, now - 60);
    const ok = verifyStripeWebhookSignature(payload, header, {
      toleranceSeconds: 300,
      nowEpochSeconds: now,
    });
    expect(ok).toBe(true);
  });

  it('rejects stale signatures', () => {
    const now = 1_700_000_000;
    const header = buildSignatureHeader(payload, secret, now - 3600);
    const ok = verifyStripeWebhookSignature(payload, header, {
      toleranceSeconds: 300,
      nowEpochSeconds: now,
    });
    expect(ok).toBe(false);
  });

  it('rejects malformed headers', () => {
    const ok = verifyStripeWebhookSignature(payload, 'v1=abc');
    expect(ok).toBe(false);
  });
});

