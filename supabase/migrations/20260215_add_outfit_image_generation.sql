-- Migration: Add outfit image generation tables
-- Feature: 003-outfit-image-generation

-- =============================================================================
-- 1. generated_outfit_images table
-- =============================================================================

CREATE TABLE IF NOT EXISTS generated_outfit_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id uuid NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL DEFAULT '',
  storage_path text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'cancelled')),
  is_primary boolean NOT NULL DEFAULT false,
  prompt_text text,
  prompt_hash text,
  model_version text NOT NULL DEFAULT 'google-deepmind/imagen-4',
  generation_duration_ms integer,
  cost_cents integer,
  error_message text,
  retry_of uuid REFERENCES generated_outfit_images(id),
  retry_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_generated_outfit_images_outfit_id ON generated_outfit_images(outfit_id);
CREATE INDEX idx_generated_outfit_images_user_id ON generated_outfit_images(user_id);
CREATE INDEX idx_generated_outfit_images_pending ON generated_outfit_images(status) WHERE status = 'pending';

-- Unique partial index: only one primary image per outfit
CREATE UNIQUE INDEX idx_generated_outfit_images_primary
  ON generated_outfit_images(outfit_id) WHERE is_primary = true;

-- RLS
ALTER TABLE generated_outfit_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated images"
  ON generated_outfit_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated images"
  ON generated_outfit_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated images"
  ON generated_outfit_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated images"
  ON generated_outfit_images FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 2. image_generation_usage table
-- =============================================================================

CREATE TABLE IF NOT EXISTS image_generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_count integer NOT NULL DEFAULT 0,
  monthly_reset_at timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  hourly_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT image_generation_usage_user_id_key UNIQUE (user_id)
);

-- RLS
ALTER TABLE image_generation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON image_generation_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles INSERT/UPDATE via Edge Function (no user-level policies needed)

-- =============================================================================
-- 3. generation_log table (append-only audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  outfit_id uuid REFERENCES outfits(id) ON DELETE SET NULL,
  generated_image_id uuid REFERENCES generated_outfit_images(id) ON DELETE SET NULL,
  model_used text NOT NULL,
  prompt_hash text,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
  error_message text,
  api_response_time_ms integer,
  cost_cents integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_log_user_id ON generation_log(user_id);
CREATE INDEX idx_generation_log_created_at ON generation_log(created_at);

-- RLS
ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation logs"
  ON generation_log FOR SELECT
  USING (auth.uid() = user_id);

-- No UPDATE or DELETE policies (append-only audit log)

-- =============================================================================
-- 4. updated_at trigger for generated_outfit_images and image_generation_usage
-- =============================================================================

-- Reuse existing trigger function if it exists, otherwise create
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_generated_outfit_images_updated_at
  BEFORE UPDATE ON generated_outfit_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_image_generation_usage_updated_at
  BEFORE UPDATE ON image_generation_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. Add account_tier column to user_preferences (for quota enforcement)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'account_tier'
  ) THEN
    ALTER TABLE user_preferences
      ADD COLUMN account_tier text NOT NULL DEFAULT 'starter'
      CHECK (account_tier IN ('starter', 'plus', 'pro'));
  END IF;
END $$;
