-- Allow authenticated users to write their own usage counter rows.
-- Needed for assistant and AI metering paths that insert/update usage_counters.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'usage_counters'
      AND policyname = 'Users can insert own usage counters'
  ) THEN
    CREATE POLICY "Users can insert own usage counters"
    ON usage_counters
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'usage_counters'
      AND policyname = 'Users can update own usage counters'
  ) THEN
    CREATE POLICY "Users can update own usage counters"
    ON usage_counters
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'usage_counters'
      AND policyname = 'Users can delete own usage counters'
  ) THEN
    CREATE POLICY "Users can delete own usage counters"
    ON usage_counters
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;
