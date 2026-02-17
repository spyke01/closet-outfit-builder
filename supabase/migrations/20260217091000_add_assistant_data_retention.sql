-- Assistant data retention helpers.
-- Keeps critical assistant metadata bounded while preserving current app behavior.

CREATE OR REPLACE FUNCTION cleanup_assistant_data(p_retention_days INTEGER DEFAULT 180)
RETURNS TABLE(
  deleted_messages BIGINT,
  deleted_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_deleted_messages BIGINT := 0;
  v_deleted_events BIGINT := 0;
BEGIN
  IF p_retention_days < 7 THEN
    RAISE EXCEPTION 'Retention period must be at least 7 days';
  END IF;

  v_cutoff := now() - make_interval(days => p_retention_days);

  WITH deleted AS (
    DELETE FROM assistant_inference_events
    WHERE created_at < v_cutoff
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_events FROM deleted;

  WITH deleted AS (
    DELETE FROM assistant_messages
    WHERE created_at < v_cutoff
      AND role = 'assistant'
      AND COALESCE((metadata_json->>'pending')::BOOLEAN, false) = false
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_messages FROM deleted;

  RETURN QUERY SELECT v_deleted_messages, v_deleted_events;
END;
$$;

REVOKE ALL ON FUNCTION cleanup_assistant_data(INTEGER) FROM PUBLIC;

