-- Assistant threads/messages/events with RLS ownership enforcement

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT assistant_threads_title_length_chk
    CHECK (title IS NULL OR char_length(title) <= 120)
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES assistant_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT assistant_messages_role_chk
    CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT assistant_messages_content_length_chk
    CHECK (char_length(content) BETWEEN 1 AND 8000)
);

CREATE TABLE IF NOT EXISTS assistant_inference_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NULL REFERENCES assistant_threads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INTEGER NULL,
  input_tokens INTEGER NULL,
  output_tokens INTEGER NULL,
  cost_estimate_usd NUMERIC(10, 6) NULL,
  error_code TEXT NULL,
  safety_flags_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT assistant_inference_events_status_chk
    CHECK (status IN ('succeeded', 'failed', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_assistant_threads_user_created_at
  ON assistant_threads(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_thread_created_at
  ON assistant_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_created_at
  ON assistant_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistant_inference_events_user_created_at
  ON assistant_inference_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistant_inference_events_model_created_at
  ON assistant_inference_events(model, created_at DESC);

ALTER TABLE assistant_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_inference_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_threads' AND policyname = 'Users can view their own assistant threads'
  ) THEN
    CREATE POLICY "Users can view their own assistant threads"
      ON assistant_threads FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_threads' AND policyname = 'Users can insert their own assistant threads'
  ) THEN
    CREATE POLICY "Users can insert their own assistant threads"
      ON assistant_threads FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_threads' AND policyname = 'Users can update their own assistant threads'
  ) THEN
    CREATE POLICY "Users can update their own assistant threads"
      ON assistant_threads FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_threads' AND policyname = 'Users can delete their own assistant threads'
  ) THEN
    CREATE POLICY "Users can delete their own assistant threads"
      ON assistant_threads FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_messages' AND policyname = 'Users can view their own assistant messages'
  ) THEN
    CREATE POLICY "Users can view their own assistant messages"
      ON assistant_messages FOR SELECT
      USING (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM assistant_threads t
          WHERE t.id = assistant_messages.thread_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_messages' AND policyname = 'Users can insert their own assistant messages'
  ) THEN
    CREATE POLICY "Users can insert their own assistant messages"
      ON assistant_messages FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM assistant_threads t
          WHERE t.id = assistant_messages.thread_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_messages' AND policyname = 'Users can update their own assistant messages'
  ) THEN
    CREATE POLICY "Users can update their own assistant messages"
      ON assistant_messages FOR UPDATE
      USING (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM assistant_threads t
          WHERE t.id = assistant_messages.thread_id
            AND t.user_id = auth.uid()
        )
      )
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM assistant_threads t
          WHERE t.id = assistant_messages.thread_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_messages' AND policyname = 'Users can delete their own assistant messages'
  ) THEN
    CREATE POLICY "Users can delete their own assistant messages"
      ON assistant_messages FOR DELETE
      USING (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM assistant_threads t
          WHERE t.id = assistant_messages.thread_id
            AND t.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_inference_events' AND policyname = 'Users can view their own assistant inference events'
  ) THEN
    CREATE POLICY "Users can view their own assistant inference events"
      ON assistant_inference_events FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_inference_events' AND policyname = 'Users can insert their own assistant inference events'
  ) THEN
    CREATE POLICY "Users can insert their own assistant inference events"
      ON assistant_inference_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_inference_events' AND policyname = 'Users can update their own assistant inference events'
  ) THEN
    CREATE POLICY "Users can update their own assistant inference events"
      ON assistant_inference_events FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assistant_inference_events' AND policyname = 'Users can delete their own assistant inference events'
  ) THEN
    CREATE POLICY "Users can delete their own assistant inference events"
      ON assistant_inference_events FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_assistant_threads_updated_at ON assistant_threads;
CREATE TRIGGER update_assistant_threads_updated_at
  BEFORE UPDATE ON assistant_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
