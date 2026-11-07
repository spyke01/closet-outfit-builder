import { describe, expect, it, vi } from 'vitest';
import { resolveUserEntitlements } from '../entitlements';

type Grant = { plan_code: 'plus' | 'pro'; expires_at: string | null; revoked_at: string | null };
function database(subscription: Record<string, unknown> | null, grant: Grant | null, grantError = false) {
  return { from: vi.fn((table: string) => {
    const response = { data: table === 'user_subscriptions' ? subscription : table === 'membership_access_grants' ? grant : [], error: table === 'membership_access_grants' && grantError ? { message:'unavailable' } : null };
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), then: Promise.resolve(response).then.bind(Promise.resolve(response)) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.maybeSingle.mockResolvedValue(response);
    return query;
  }) } as unknown as Parameters<typeof resolveUserEntitlements>[0];
}
const pro: Grant = { plan_code: 'pro', expires_at: null, revoked_at: null };
describe('explicit complimentary membership access', () => {
  it('restores Pro independently of an empty Stripe customer record without inventing a renewal', async () => {
    const result = await resolveUserEntitlements(database({ plan_code:'free',billing_state:'active',stripe_customer_id:'customer',stripe_subscription_id:null },pro), 'owner');
    expect(result).toMatchObject({effectivePlanCode:'pro',isPaid:true,accessSource:'complimentary',hasBillingAccount:false,renewalAt:null,effectiveInterval:'none'});
  });
  it('leaves ordinary free accounts free', async () => {
    expect(await resolveUserEntitlements(database(null,null),'user')).toMatchObject({effectivePlanCode:'free',isPaid:false,accessSource:'subscription'});
  });
  it.each([
    {...pro,revoked_at:'2026-01-01T00:00:00Z'},
    {...pro,expires_at:'2000-01-01T00:00:00Z'},
  ])('does not honor revoked or expired access', async grant => {
    expect(await resolveUserEntitlements(database(null,grant),'user')).toMatchObject({effectivePlanCode:'free',isPaid:false});
  });
  it('does not downgrade a paid Pro subscription to a lower complimentary plan', async () => {
    expect(await resolveUserEntitlements(database({plan_code:'pro',billing_state:'active',stripe_subscription_id:'subscription'}, {...pro,plan_code:'plus'}),'user')).toMatchObject({effectivePlanCode:'pro',accessSource:'subscription',hasBillingAccount:true});
  });
  it('fails visibly if access verification is unavailable instead of treating a member as free', async () => {
    await expect(resolveUserEntitlements(database(null,null,true),'user')).rejects.toThrow('Could not load account access');
  });
});
