import type { SupabaseClient } from '@supabase/supabase-js';
import { getDefaultFreePlan, getPlanByCodeAndInterval, type PlanCode, type PlanInterval, type BillingPlan } from './plans';

export type BillingState = 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing' | 'scheduled_cancel';

export interface UserSubscriptionRecord {
  user_id: string;
  plan_code: PlanCode;
  status: string;
  billing_state: BillingState;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_anchor_date: string | null;
}

export interface Entitlements {
  effectivePlanCode: PlanCode;
  effectiveInterval: PlanInterval;
  billingState: BillingState;
  isPaid: boolean;
  hasBillingAccount: boolean;
  plan: BillingPlan;
  period: {
    start: Date;
    end: Date;
    key: string;
  };
  renewalAt: string | null;
  usage: Record<string, number>;
}

export type MonthlyUsageMetric =
  | 'ai_outfit_generations'
  | 'ai_outfit_image_generations'
  | 'ai_stylist_messages'
  | 'ai_stylist_vision_messages';

function toMonthPeriod(anchor: Date, now: Date) {
  const day = anchor.getUTCDate();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const currentAnchor = new Date(Date.UTC(year, month, Math.min(day, 28), 0, 0, 0));
  const start = now.getTime() >= currentAnchor.getTime()
    ? currentAnchor
    : new Date(Date.UTC(year, month - 1, Math.min(day, 28), 0, 0, 0));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate(), 0, 0, 0));
  const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;

  return { start, end, key };
}

function resolveEffectiveState(subscription: UserSubscriptionRecord | null): {
  planCode: PlanCode;
  interval: PlanInterval;
  billingState: BillingState;
  isPaid: boolean;
} {
  if (!subscription) {
    return { planCode: 'free', interval: 'none', billingState: 'active', isPaid: false };
  }

  if (subscription.billing_state === 'past_due' || subscription.billing_state === 'unpaid') {
    return { planCode: 'free', interval: 'none', billingState: subscription.billing_state, isPaid: false };
  }

  const now = new Date();
  if (subscription.cancel_at_period_end && subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    if (periodEnd.getTime() > now.getTime()) {
      return { planCode: subscription.plan_code, interval: 'month', billingState: 'scheduled_cancel', isPaid: true };
    }
  }

  if (subscription.billing_state === 'canceled') {
    return { planCode: 'free', interval: 'none', billingState: 'canceled', isPaid: false };
  }

  return {
    planCode: subscription.plan_code,
    interval: subscription.plan_code === 'free' ? 'none' : 'month',
    billingState: subscription.billing_state,
    isPaid: subscription.plan_code !== 'free',
  };
}

async function getSubscription(supabase: SupabaseClient, userId: string): Promise<UserSubscriptionRecord | null> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_code, status, billing_state, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, plan_anchor_date')
    .eq('user_id', userId)
    .maybeSingle();

  return (data || null) as UserSubscriptionRecord | null;
}

async function getUsageMap(supabase: SupabaseClient, userId: string, periodKey: string) {
  const { data } = await supabase
    .from('usage_counters')
    .select('metric_key, count')
    .eq('user_id', userId)
    .eq('period_key', periodKey);

  const usage: Record<string, number> = {};
  for (const row of data || []) {
    usage[row.metric_key] = row.count;
  }

  return usage;
}

export async function resolveUserEntitlements(supabase: SupabaseClient, userId: string): Promise<Entitlements> {
  const subscription = await getSubscription(supabase, userId);
  const resolved = resolveEffectiveState(subscription);

  let plan = getDefaultFreePlan();
  if (resolved.planCode === 'free') {
    plan = getDefaultFreePlan();
  } else {
    plan = getPlanByCodeAndInterval(resolved.planCode, resolved.interval);
  }

  const anchor = subscription?.plan_anchor_date
    ? new Date(`${subscription.plan_anchor_date}T00:00:00Z`)
    : new Date();
  const period = toMonthPeriod(anchor, new Date());
  const usage = await getUsageMap(supabase, userId, period.key);

  return {
    effectivePlanCode: resolved.planCode,
    effectiveInterval: resolved.interval,
    billingState: resolved.billingState,
    isPaid: resolved.isPaid,
    hasBillingAccount: Boolean(subscription?.stripe_subscription_id),
    plan,
    period,
    renewalAt: subscription?.current_period_end || null,
    usage,
  };
}

export function getUsageLimitForMetric(entitlements: Entitlements, metricKey: string): number | null {
  if (metricKey === 'ai_outfit_generations') {
    return entitlements.plan.limits.ai_outfit_generations_monthly;
  }
  if (metricKey === 'ai_outfit_image_generations') {
    return entitlements.plan.limits.ai_image_generations_monthly;
  }
  if (metricKey === 'ai_stylist_messages') {
    return entitlements.plan.limits.ai_stylist_messages_monthly;
  }
  if (metricKey === 'ai_stylist_vision_messages') {
    return entitlements.plan.limits.ai_stylist_vision_messages_monthly;
  }
  return null;
}

export function canUseFeature(entitlements: Entitlements, featureKey: keyof BillingPlan['features']): boolean {
  return entitlements.plan.features[featureKey];
}

export function isUsageExceeded(entitlements: Entitlements, metricKey: string): boolean {
  const limit = getUsageLimitForMetric(entitlements, metricKey);
  if (limit == null) return false;

  const usage = entitlements.usage[metricKey] || 0;
  return usage >= limit;
}

export async function incrementUsageCounter(
  supabase: SupabaseClient,
  userId: string,
  metricKey: MonthlyUsageMetric,
  period: Entitlements['period'],
  incrementBy: number = 1
): Promise<number> {
  const { data: existing } = await supabase
    .from('usage_counters')
    .select('id, count')
    .eq('user_id', userId)
    .eq('metric_key', metricKey)
    .eq('period_key', period.key)
    .maybeSingle();

  if (!existing) {
    const { data, error } = await supabase
      .from('usage_counters')
      .insert({
        user_id: userId,
        metric_key: metricKey,
        period_key: period.key,
        period_start_at: period.start.toISOString(),
        period_end_at: period.end.toISOString(),
        count: incrementBy,
      })
      .select('count')
      .single();

    if (error) throw new Error(`Failed to create usage counter: ${error.message}`);
    return data.count;
  }

  const nextCount = existing.count + incrementBy;
  const { error } = await supabase
    .from('usage_counters')
    .update({ count: nextCount })
    .eq('id', existing.id);

  if (error) throw new Error(`Failed to update usage counter: ${error.message}`);
  return nextCount;
}

export function getAiBurstHourKey(now: Date = new Date()): string {
  return `ai_requests_hourly:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`;
}

export function getAssistantBurstHourKey(now: Date = new Date()): string {
  return `ai_stylist_requests_hourly:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`;
}
