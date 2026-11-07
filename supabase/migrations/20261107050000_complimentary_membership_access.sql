BEGIN;

-- Explicit service-managed access, independent of Stripe subscription history.
CREATE TABLE public.membership_access_grants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('plus', 'pro')),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.membership_access_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_access_grants FROM anon, authenticated;
GRANT SELECT ON public.membership_access_grants TO authenticated;
GRANT ALL ON public.membership_access_grants TO service_role;
CREATE POLICY "Users can read their own membership grant"
  ON public.membership_access_grants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Database limits and AI reservations must use the same effective access as web
-- entitlements. An admin role alone never grants a membership.
CREATE OR REPLACE FUNCTION public.get_effective_plan_code_for_user(p_user_id uuid)
RETURNS text LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE
  subscription public.user_subscriptions%ROWTYPE;
  subscription_plan text := 'free';
  granted_plan text;
BEGIN
  SELECT * INTO subscription FROM public.user_subscriptions WHERE user_id=p_user_id;
  IF FOUND AND subscription.billing_state NOT IN ('past_due','unpaid') THEN
    IF subscription.cancel_at_period_end AND subscription.current_period_end>now() THEN
      subscription_plan := subscription.plan_code;
    ELSIF subscription.billing_state <> 'canceled' THEN
      subscription_plan := subscription.plan_code;
    END IF;
  END IF;
  SELECT plan_code INTO granted_plan FROM public.membership_access_grants
    WHERE user_id=p_user_id AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at>now());
  IF subscription_plan='pro' OR granted_plan='pro' THEN RETURN 'pro'; END IF;
  IF subscription_plan='plus' OR granted_plan='plus' THEN RETURN 'plus'; END IF;
  RETURN 'free';
END $$;

COMMIT;
