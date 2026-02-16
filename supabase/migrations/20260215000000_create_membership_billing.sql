-- Membership + Billing foundation

-- Reusable updated_at trigger function (safe to re-run)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('none', 'month', 'year')),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  limits_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  features_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_plans_code_interval UNIQUE (code, interval)
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('free', 'plus', 'pro')),
  status TEXT NOT NULL DEFAULT 'active',
  billing_state TEXT NOT NULL CHECK (billing_state IN ('active', 'past_due', 'unpaid', 'canceled', 'trialing', 'scheduled_cancel')),
  stripe_customer_id TEXT NULL,
  stripe_subscription_id TEXT NULL,
  current_period_start TIMESTAMPTZ NULL,
  current_period_end TIMESTAMPTZ NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  plan_anchor_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_subscriptions_user UNIQUE (user_id),
  CONSTRAINT uq_user_subscriptions_stripe_subscription UNIQUE (stripe_subscription_id)
);

CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  period_key TEXT NOT NULL,
  period_start_at TIMESTAMPTZ NOT NULL,
  period_end_at TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_usage_counters_user_metric_period UNIQUE (user_id, metric_key, period_key)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  error_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  last_event_id UUID NULL REFERENCES billing_events(id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL CHECK (char_length(note_text) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_metric ON usage_counters(user_id, metric_key, period_end_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_issues_user_status ON billing_issues(user_id, status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- Seed plans (idempotent)
INSERT INTO plans (code, name, interval, price_cents, currency, limits_json, features_json, active)
VALUES
(
  'free',
  'Closet Starter',
  'none',
  0,
  'usd',
  jsonb_build_object(
    'wardrobe_items', 100,
    'saved_outfits', 50,
    'calendar_history_days', 60,
    'calendar_forward_days', 30,
    'active_trips', 1,
    'max_trip_days', 7,
    'ai_outfit_generations_monthly', 20,
    'ai_image_generations_monthly', 0,
    'packing_items_per_trip', 50,
    'ai_burst_per_hour', 5
  ),
  jsonb_build_object(
    'analytics_basic', false,
    'analytics_advanced', false,
    'export_share', false,
    'priority_support', false,
    'ai_image_generation', false
  ),
  true
),
(
  'plus',
  'Closet Plus Monthly',
  'month',
  499,
  'usd',
  jsonb_build_object(
    'wardrobe_items', 500,
    'saved_outfits', 300,
    'calendar_history_days', 365,
    'calendar_forward_days', 365,
    'active_trips', 10,
    'max_trip_days', 30,
    'ai_outfit_generations_monthly', 300,
    'ai_image_generations_monthly', 30,
    'packing_items_per_trip', 250,
    'ai_burst_per_hour', 5
  ),
  jsonb_build_object(
    'analytics_basic', true,
    'analytics_advanced', false,
    'export_share', false,
    'priority_support', false,
    'ai_image_generation', true
  ),
  true
),
(
  'plus',
  'Closet Plus Yearly',
  'year',
  3999,
  'usd',
  jsonb_build_object(
    'wardrobe_items', 500,
    'saved_outfits', 300,
    'calendar_history_days', 365,
    'calendar_forward_days', 365,
    'active_trips', 10,
    'max_trip_days', 30,
    'ai_outfit_generations_monthly', 300,
    'ai_image_generations_monthly', 30,
    'packing_items_per_trip', 250,
    'ai_burst_per_hour', 5
  ),
  jsonb_build_object(
    'analytics_basic', true,
    'analytics_advanced', false,
    'export_share', false,
    'priority_support', false,
    'ai_image_generation', true
  ),
  true
),
(
  'pro',
  'Closet Pro Monthly',
  'month',
  999,
  'usd',
  jsonb_build_object(
    'wardrobe_items', null,
    'saved_outfits', null,
    'calendar_history_days', null,
    'calendar_forward_days', null,
    'active_trips', null,
    'max_trip_days', 30,
    'ai_outfit_generations_monthly', null,
    'ai_image_generations_monthly', 100,
    'packing_items_per_trip', null,
    'ai_burst_per_hour', 5
  ),
  jsonb_build_object(
    'analytics_basic', true,
    'analytics_advanced', true,
    'export_share', true,
    'priority_support', true,
    'ai_image_generation', true
  ),
  true
),
(
  'pro',
  'Closet Pro Yearly',
  'year',
  7999,
  'usd',
  jsonb_build_object(
    'wardrobe_items', null,
    'saved_outfits', null,
    'calendar_history_days', null,
    'calendar_forward_days', null,
    'active_trips', null,
    'max_trip_days', 30,
    'ai_outfit_generations_monthly', null,
    'ai_image_generations_monthly', 100,
    'packing_items_per_trip', null,
    'ai_burst_per_hour', 5
  ),
  jsonb_build_object(
    'analytics_basic', true,
    'analytics_advanced', true,
    'export_share', true,
    'priority_support', true,
    'ai_image_generation', true
  ),
  true
)
ON CONFLICT (code, interval) DO UPDATE
SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  limits_json = EXCLUDED.limits_json,
  features_json = EXCLUDED.features_json,
  active = EXCLUDED.active,
  updated_at = now();

-- Seed admin role + initial assignment (if user exists)
INSERT INTO app_roles (role)
VALUES ('billing_admin')
ON CONFLICT (role) DO NOTHING;

DO $$
DECLARE
  role_id_var UUID;
  admin_user_id UUID;
BEGIN
  SELECT id INTO role_id_var FROM app_roles WHERE role = 'billing_admin' LIMIT 1;
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'padenc2001@gmail.com' LIMIT 1;

  IF role_id_var IS NOT NULL AND admin_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (admin_user_id, role_id_var)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- plans: authenticated users can read active rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'Authenticated users can view active plans'
  ) THEN
    CREATE POLICY "Authenticated users can view active plans"
    ON plans FOR SELECT
    USING (auth.role() = 'authenticated' AND active = true);
  END IF;
END $$;

-- user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_subscriptions' AND policyname = 'Users can view own subscriptions'
  ) THEN
    CREATE POLICY "Users can view own subscriptions"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- usage counters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_counters' AND policyname = 'Users can view own usage counters'
  ) THEN
    CREATE POLICY "Users can view own usage counters"
    ON usage_counters FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- billing issues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'billing_issues' AND policyname = 'Users can view own billing issues'
  ) THEN
    CREATE POLICY "Users can view own billing issues"
    ON billing_issues FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- app roles + user roles visibility (self)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_roles' AND policyname = 'Users can view roles referenced by their assignments'
  ) THEN
    CREATE POLICY "Users can view roles referenced by their assignments"
    ON app_roles FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.role_id = app_roles.id
          AND ur.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view own roles'
  ) THEN
    CREATE POLICY "Users can view own roles"
    ON user_roles FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- admin notes: user can view notes about themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_notes' AND policyname = 'Users can view own admin notes'
  ) THEN
    CREATE POLICY "Users can view own admin notes"
    ON admin_notes FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- no direct user access for billing_events

-- update triggers
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER update_usage_counters_updated_at BEFORE UPDATE ON usage_counters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_billing_issues_updated_at ON billing_issues;
CREATE TRIGGER update_billing_issues_updated_at BEFORE UPDATE ON billing_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
