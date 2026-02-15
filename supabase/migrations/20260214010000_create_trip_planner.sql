-- Trip Packing Planner MVP tables
-- Supports weather-aware trip planning, multiple outfit slots per day, and packing checklists.

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination_text TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NULL,
  destination_lon DOUBLE PRECISION NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT trips_name_length_chk CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT trips_destination_length_chk CHECK (char_length(destination_text) BETWEEN 1 AND 120),
  CONSTRAINT trips_date_order_chk CHECK (end_date >= start_date),
  CONSTRAINT trips_max_length_chk CHECK ((end_date - start_date) <= 29)
);

CREATE TABLE IF NOT EXISTS trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  slot_number INTEGER NOT NULL DEFAULT 1,
  slot_label TEXT NULL,
  weather_context JSONB NULL DEFAULT '{}'::JSONB,
  outfit_id UUID NULL REFERENCES outfits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT trip_days_slot_number_chk CHECK (slot_number >= 1 AND slot_number <= 5),
  CONSTRAINT trip_days_slot_label_length_chk CHECK (slot_label IS NULL OR char_length(slot_label) <= 40)
);

CREATE TABLE IF NOT EXISTS trip_day_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  wardrobe_item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  wardrobe_item_id UUID NULL REFERENCES wardrobe_items(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  packed BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL CHECK (source IN ('from_outfit', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT trip_pack_items_label_length_chk CHECK (char_length(label) BETWEEN 1 AND 120),
  CONSTRAINT trip_pack_items_label_chars_chk CHECK (label ~ '^[A-Za-z0-9[:space:]]*$')
);

COMMENT ON TABLE trips IS 'Trip records for weather-aware outfit planning';
COMMENT ON TABLE trip_days IS 'Trip daily planning slots with optional multiple outfits per day';
COMMENT ON TABLE trip_day_items IS 'Item-level mapping for each trip day slot';
COMMENT ON TABLE trip_pack_items IS 'Deduplicated checklist rows sourced from outfits or manual entries';

CREATE INDEX IF NOT EXISTS idx_trips_user_date_range
  ON trips(user_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_trip_days_trip_date
  ON trip_days(trip_id, day_date, slot_number);

CREATE INDEX IF NOT EXISTS idx_trip_day_items_trip_day_id
  ON trip_day_items(trip_day_id);

CREATE INDEX IF NOT EXISTS idx_trip_pack_items_trip_id
  ON trip_pack_items(trip_id, source, packed);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_days_trip_date_slot
  ON trip_days(trip_id, day_date, slot_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_day_items_trip_day_item
  ON trip_day_items(trip_day_id, wardrobe_item_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_pack_items_outfit_source
  ON trip_pack_items(trip_id, wardrobe_item_id, source)
  WHERE source = 'from_outfit' AND wardrobe_item_id IS NOT NULL;

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_day_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_pack_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'Users can view their own trips'
  ) THEN
    CREATE POLICY "Users can view their own trips"
      ON trips FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'Users can insert their own trips'
  ) THEN
    CREATE POLICY "Users can insert their own trips"
      ON trips FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'Users can update their own trips'
  ) THEN
    CREATE POLICY "Users can update their own trips"
      ON trips FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'Users can delete their own trips'
  ) THEN
    CREATE POLICY "Users can delete their own trips"
      ON trips FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_days'
      AND policyname = 'Users can view their own trip days'
  ) THEN
    CREATE POLICY "Users can view their own trip days"
      ON trip_days FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_days.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_days'
      AND policyname = 'Users can insert their own trip days'
  ) THEN
    CREATE POLICY "Users can insert their own trip days"
      ON trip_days FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_days.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_days'
      AND policyname = 'Users can update their own trip days'
  ) THEN
    CREATE POLICY "Users can update their own trip days"
      ON trip_days FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_days.trip_id
            AND t.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_days.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_days'
      AND policyname = 'Users can delete their own trip days'
  ) THEN
    CREATE POLICY "Users can delete their own trip days"
      ON trip_days FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_days.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_day_items'
      AND policyname = 'Users can view their own trip day items'
  ) THEN
    CREATE POLICY "Users can view their own trip day items"
      ON trip_day_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM trip_days td
          JOIN trips t ON t.id = td.trip_id
          WHERE td.id = trip_day_items.trip_day_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_day_items'
      AND policyname = 'Users can insert their own trip day items'
  ) THEN
    CREATE POLICY "Users can insert their own trip day items"
      ON trip_day_items FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM trip_days td
          JOIN trips t ON t.id = td.trip_id
          WHERE td.id = trip_day_items.trip_day_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_day_items'
      AND policyname = 'Users can update their own trip day items'
  ) THEN
    CREATE POLICY "Users can update their own trip day items"
      ON trip_day_items FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM trip_days td
          JOIN trips t ON t.id = td.trip_id
          WHERE td.id = trip_day_items.trip_day_id
            AND t.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM trip_days td
          JOIN trips t ON t.id = td.trip_id
          WHERE td.id = trip_day_items.trip_day_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_day_items'
      AND policyname = 'Users can delete their own trip day items'
  ) THEN
    CREATE POLICY "Users can delete their own trip day items"
      ON trip_day_items FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM trip_days td
          JOIN trips t ON t.id = td.trip_id
          WHERE td.id = trip_day_items.trip_day_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_pack_items'
      AND policyname = 'Users can view their own trip pack items'
  ) THEN
    CREATE POLICY "Users can view their own trip pack items"
      ON trip_pack_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_pack_items.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_pack_items'
      AND policyname = 'Users can insert their own trip pack items'
  ) THEN
    CREATE POLICY "Users can insert their own trip pack items"
      ON trip_pack_items FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_pack_items.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_pack_items'
      AND policyname = 'Users can update their own trip pack items'
  ) THEN
    CREATE POLICY "Users can update their own trip pack items"
      ON trip_pack_items FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_pack_items.trip_id
            AND t.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_pack_items.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_pack_items'
      AND policyname = 'Users can delete their own trip pack items'
  ) THEN
    CREATE POLICY "Users can delete their own trip pack items"
      ON trip_pack_items FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM trips t
          WHERE t.id = trip_pack_items.trip_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_days_updated_at ON trip_days;
CREATE TRIGGER update_trip_days_updated_at
  BEFORE UPDATE ON trip_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_pack_items_updated_at ON trip_pack_items;
CREATE TRIGGER update_trip_pack_items_updated_at
  BEFORE UPDATE ON trip_pack_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
