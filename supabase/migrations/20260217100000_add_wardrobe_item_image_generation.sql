-- Migration: Add wardrobe item image generation tables
-- Feature: 004-wardrobe-item-image-generation
--
-- This feature generates AI images for individual wardrobe items.
-- Generated images directly replace wardrobe_items.image_url.
-- Usage tracking uses the existing usage_counters table.
-- Only a generation_log audit table is added.

-- =============================================================================
-- 1. generation_log table (append-only audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  wardrobe_item_id uuid REFERENCES wardrobe_items(id) ON DELETE SET NULL,
  model_used text NOT NULL,
  prompt_text text,
  prompt_hash text,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
  error_message text,
  api_response_time_ms integer,
  cost_cents integer,
  is_retry boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_log_user_id ON generation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_log_wardrobe_item_id ON generation_log(wardrobe_item_id);

-- RLS
ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generation_log'
    AND policyname = 'Users can view their own generation logs'
  ) THEN
    CREATE POLICY "Users can view their own generation logs"
      ON generation_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- INSERT is service role only (server actions use service role or RLS-authenticated inserts)
-- No UPDATE or DELETE policies (append-only audit log)
