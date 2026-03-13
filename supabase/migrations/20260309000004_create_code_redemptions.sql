-- Create code_redemptions table for tracking confirmed promo code usage
-- Inserts happen only via the Stripe webhook handler after payment confirmation
CREATE TABLE code_redemptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id                uuid NOT NULL REFERENCES promotional_codes(id),
  user_id                uuid NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id text,
  redeemed_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE (code_id, user_id)
);

CREATE INDEX idx_code_redemptions_code_id ON code_redemptions (code_id);
CREATE INDEX idx_code_redemptions_user_id ON code_redemptions (user_id);

ALTER TABLE code_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own redemption records
CREATE POLICY "Users can read their own redemptions"
  ON code_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins with billing.read permission can read all redemptions
CREATE POLICY "Admins can read all redemptions"
  ON code_redemptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN app_roles r ON ur.role_id = r.id
    JOIN admin_role_permissions arp ON arp.role_id = r.id
    JOIN admin_permissions p ON arp.permission_id = p.id
    WHERE ur.user_id = auth.uid() AND p.key = 'billing.read'
  ));

-- Service role only inserts (enforced at application layer via webhook handler)
CREATE POLICY "Service role can insert redemptions"
  ON code_redemptions FOR INSERT
  WITH CHECK (true);
