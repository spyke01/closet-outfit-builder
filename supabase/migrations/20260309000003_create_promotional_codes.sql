-- Create promotional_codes table for beta discount codes
-- Each code maps 1:1 to a Stripe coupon for discount application
CREATE TABLE promotional_codes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text UNIQUE NOT NULL,
  stripe_coupon_id    text NOT NULL,
  discount_percent    smallint NOT NULL CHECK (discount_percent BETWEEN 1 AND 99),
  duration_months     smallint NOT NULL CHECK (duration_months BETWEEN 1 AND 12),
  max_redemptions     integer NOT NULL CHECK (max_redemptions BETWEEN 1 AND 10000),
  current_redemptions integer NOT NULL DEFAULT 0,
  expires_at          timestamptz,
  revoked_at          timestamptz,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotional_codes_code ON promotional_codes (code);
CREATE INDEX idx_promotional_codes_stripe_coupon_id ON promotional_codes (stripe_coupon_id);

ALTER TABLE promotional_codes ENABLE ROW LEVEL SECURITY;

-- Admins (billing role) can manage all codes
CREATE POLICY "Admins can manage promotional codes"
  ON promotional_codes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN app_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'billing'
  ));

-- Any authenticated user can read active (non-revoked) codes for validation
CREATE POLICY "Authenticated users can read active codes for validation"
  ON promotional_codes FOR SELECT
  USING (auth.uid() IS NOT NULL AND revoked_at IS NULL);
