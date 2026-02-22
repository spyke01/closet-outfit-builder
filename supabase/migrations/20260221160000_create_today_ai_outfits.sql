-- Daily AI-generated outfit state for Today page.

CREATE TABLE IF NOT EXISTS today_ai_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  style_preset TEXT NOT NULL,
  style_custom TEXT NULL,
  formality_level TEXT NOT NULL CHECK (formality_level IN ('casual', 'smart', 'formal')),
  sebastian_explanation TEXT NOT NULL CHECK (char_length(sebastian_explanation) BETWEEN 1 AND 1200),
  weather_context_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_today_ai_outfits_user_entry UNIQUE (user_id, entry_date),
  CONSTRAINT today_ai_outfits_event_type_length_chk CHECK (char_length(event_type) BETWEEN 1 AND 100),
  CONSTRAINT today_ai_outfits_style_preset_length_chk CHECK (char_length(style_preset) BETWEEN 1 AND 60),
  CONSTRAINT today_ai_outfits_style_custom_length_chk CHECK (style_custom IS NULL OR char_length(style_custom) <= 120)
);

CREATE INDEX IF NOT EXISTS idx_today_ai_outfits_user_expires
  ON today_ai_outfits(user_id, expires_at DESC);

ALTER TABLE today_ai_outfits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'today_ai_outfits'
      AND policyname = 'Users can view own today ai outfits'
  ) THEN
    CREATE POLICY "Users can view own today ai outfits"
      ON today_ai_outfits FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'today_ai_outfits'
      AND policyname = 'Users can insert own today ai outfits'
  ) THEN
    CREATE POLICY "Users can insert own today ai outfits"
      ON today_ai_outfits FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'today_ai_outfits'
      AND policyname = 'Users can update own today ai outfits'
  ) THEN
    CREATE POLICY "Users can update own today ai outfits"
      ON today_ai_outfits FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'today_ai_outfits'
      AND policyname = 'Users can delete own today ai outfits'
  ) THEN
    CREATE POLICY "Users can delete own today ai outfits"
      ON today_ai_outfits FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_today_ai_outfits_updated_at ON today_ai_outfits;
CREATE TRIGGER update_today_ai_outfits_updated_at
  BEFORE UPDATE ON today_ai_outfits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
