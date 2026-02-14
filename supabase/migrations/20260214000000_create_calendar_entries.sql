-- Calendar + Wear Tracking MVP tables
-- Supports multiple entries per day per status and secure notes input.

CREATE TABLE IF NOT EXISTS calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'worn')),
  outfit_id UUID NULL REFERENCES outfits(id) ON DELETE SET NULL,
  notes TEXT NULL,
  weather_context JSONB NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT calendar_entries_notes_length_chk
    CHECK (notes IS NULL OR char_length(notes) <= 500),
  CONSTRAINT calendar_entries_notes_chars_chk
    CHECK (notes IS NULL OR notes ~ '^[A-Za-z0-9[:space:]]*$')
);

CREATE TABLE IF NOT EXISTS calendar_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_entry_id UUID NOT NULL REFERENCES calendar_entries(id) ON DELETE CASCADE,
  wardrobe_item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE calendar_entries IS 'User calendar entries for planned/worn outfits with weather context';
COMMENT ON TABLE calendar_entry_items IS 'Item-level mapping for calendar entries';
COMMENT ON COLUMN calendar_entries.status IS 'planned or worn';
COMMENT ON COLUMN calendar_entries.weather_context IS 'Weather metadata used when planning or logging';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_calendar_entries_user_date
  ON calendar_entries(user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_entries_user_status_date
  ON calendar_entries(user_id, status, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_entry_items_entry_id
  ON calendar_entry_items(calendar_entry_id);

CREATE INDEX IF NOT EXISTS idx_calendar_entry_items_item_id
  ON calendar_entry_items(wardrobe_item_id);

-- Prevent duplicate item references within the same entry
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_entry_items_entry_item
  ON calendar_entry_items(calendar_entry_id, wardrobe_item_id);

-- RLS
ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_entry_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entries'
      AND policyname = 'Users can view their own calendar entries'
  ) THEN
    CREATE POLICY "Users can view their own calendar entries"
      ON calendar_entries FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entries'
      AND policyname = 'Users can insert their own calendar entries'
  ) THEN
    CREATE POLICY "Users can insert their own calendar entries"
      ON calendar_entries FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entries'
      AND policyname = 'Users can update their own calendar entries'
  ) THEN
    CREATE POLICY "Users can update their own calendar entries"
      ON calendar_entries FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entries'
      AND policyname = 'Users can delete their own calendar entries'
  ) THEN
    CREATE POLICY "Users can delete their own calendar entries"
      ON calendar_entries FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entry_items'
      AND policyname = 'Users can view their own calendar entry items'
  ) THEN
    CREATE POLICY "Users can view their own calendar entry items"
      ON calendar_entry_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM calendar_entries ce
          WHERE ce.id = calendar_entry_items.calendar_entry_id
            AND ce.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entry_items'
      AND policyname = 'Users can insert their own calendar entry items'
  ) THEN
    CREATE POLICY "Users can insert their own calendar entry items"
      ON calendar_entry_items FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM calendar_entries ce
          WHERE ce.id = calendar_entry_items.calendar_entry_id
            AND ce.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entry_items'
      AND policyname = 'Users can update their own calendar entry items'
  ) THEN
    CREATE POLICY "Users can update their own calendar entry items"
      ON calendar_entry_items FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM calendar_entries ce
          WHERE ce.id = calendar_entry_items.calendar_entry_id
            AND ce.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM calendar_entries ce
          WHERE ce.id = calendar_entry_items.calendar_entry_id
            AND ce.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_entry_items'
      AND policyname = 'Users can delete their own calendar entry items'
  ) THEN
    CREATE POLICY "Users can delete their own calendar entry items"
      ON calendar_entry_items FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM calendar_entries ce
          WHERE ce.id = calendar_entry_items.calendar_entry_id
            AND ce.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_calendar_entries_updated_at ON calendar_entries;
CREATE TRIGGER update_calendar_entries_updated_at
  BEFORE UPDATE ON calendar_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
