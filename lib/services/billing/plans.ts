export type PlanCode = 'free' | 'plus' | 'pro';
export type PlanInterval = 'none' | 'month' | 'year';

export interface PlanLimits {
  wardrobe_items: number | null;
  saved_outfits: number | null;
  calendar_history_days: number | null;
  calendar_forward_days: number | null;
  active_trips: number | null;
  max_trip_days: number;
  ai_outfit_generations_monthly: number | null;
  ai_image_generations_monthly: number;
  ai_stylist_messages_monthly: number | null;
  ai_stylist_vision_messages_monthly: number;
  ai_today_ai_generations_monthly: number | null;
  packing_items_per_trip: number | null;
  ai_burst_per_hour: number;
}

export interface PlanFeatures {
  analytics_basic: boolean;
  analytics_advanced: boolean;
  export_share: boolean;
  priority_support: boolean;
  ai_image_generation: boolean;
  sebastian_assistant: boolean;
}

export interface BillingPlan {
  code: PlanCode;
  interval: PlanInterval;
  name: string;
  priceCents: number;
  limits: PlanLimits;
  features: PlanFeatures;
}

const FREE_LIMITS: PlanLimits = {
  wardrobe_items: 100,
  saved_outfits: 50,
  calendar_history_days: 60,
  calendar_forward_days: 30,
  active_trips: 1,
  max_trip_days: 7,
  ai_outfit_generations_monthly: 20,
  ai_image_generations_monthly: 0,
  ai_stylist_messages_monthly: 0,
  ai_stylist_vision_messages_monthly: 0,
  ai_today_ai_generations_monthly: null,
  packing_items_per_trip: 50,
  ai_burst_per_hour: 5,
};

const PLUS_LIMITS: PlanLimits = {
  wardrobe_items: 500,
  saved_outfits: 300,
  calendar_history_days: 365,
  calendar_forward_days: 365,
  active_trips: 10,
  max_trip_days: 30,
  ai_outfit_generations_monthly: 300,
  ai_image_generations_monthly: 30,
  ai_stylist_messages_monthly: 300,
  ai_stylist_vision_messages_monthly: 30,
  ai_today_ai_generations_monthly: 7,
  packing_items_per_trip: 250,
  ai_burst_per_hour: 5,
};

const PRO_LIMITS: PlanLimits = {
  wardrobe_items: null,
  saved_outfits: null,
  calendar_history_days: null,
  calendar_forward_days: null,
  active_trips: null,
  max_trip_days: 30,
  ai_outfit_generations_monthly: null,
  ai_image_generations_monthly: 100,
  ai_stylist_messages_monthly: null,
  ai_stylist_vision_messages_monthly: 100,
  ai_today_ai_generations_monthly: 14,
  packing_items_per_trip: null,
  ai_burst_per_hour: 5,
};

const FREE_FEATURES: PlanFeatures = {
  analytics_basic: false,
  analytics_advanced: false,
  export_share: false,
  priority_support: false,
  ai_image_generation: false,
  sebastian_assistant: false,
};

const PLUS_FEATURES: PlanFeatures = {
  analytics_basic: true,
  analytics_advanced: false,
  export_share: false,
  priority_support: false,
  ai_image_generation: true,
  sebastian_assistant: true,
};

const PRO_FEATURES: PlanFeatures = {
  analytics_basic: true,
  analytics_advanced: true,
  export_share: true,
  priority_support: true,
  ai_image_generation: true,
  sebastian_assistant: true,
};

export const PLAN_CATALOG: BillingPlan[] = [
  {
    code: 'free',
    interval: 'none',
    name: 'Closet Starter',
    priceCents: 0,
    limits: FREE_LIMITS,
    features: FREE_FEATURES,
  },
  {
    code: 'plus',
    interval: 'month',
    name: 'Closet Plus Monthly',
    priceCents: 499,
    limits: PLUS_LIMITS,
    features: PLUS_FEATURES,
  },
  {
    code: 'plus',
    interval: 'year',
    name: 'Closet Plus Yearly',
    priceCents: 3999,
    limits: PLUS_LIMITS,
    features: PLUS_FEATURES,
  },
  {
    code: 'pro',
    interval: 'month',
    name: 'Closet Pro Monthly',
    priceCents: 999,
    limits: PRO_LIMITS,
    features: PRO_FEATURES,
  },
  {
    code: 'pro',
    interval: 'year',
    name: 'Closet Pro Yearly',
    priceCents: 7999,
    limits: PRO_LIMITS,
    features: PRO_FEATURES,
  },
];

export function getPlanCatalogByCode(code: PlanCode): BillingPlan[] {
  return PLAN_CATALOG.filter((plan) => plan.code === code);
}

export function getPlanByCodeAndInterval(code: PlanCode, interval: PlanInterval): BillingPlan {
  const plan = PLAN_CATALOG.find((candidate) => candidate.code === code && candidate.interval === interval);
  if (!plan) {
    throw new Error(`Unknown plan combination: ${code}/${interval}`);
  }
  return plan;
}

export function getDefaultFreePlan(): BillingPlan {
  return getPlanByCodeAndInterval('free', 'none');
}
