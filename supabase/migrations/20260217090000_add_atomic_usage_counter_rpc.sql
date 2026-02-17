-- Atomic usage counter reservation to prevent race conditions on quota enforcement.
-- Returns whether increment is allowed and the resulting count.

CREATE OR REPLACE FUNCTION reserve_usage_counter(
  p_user_id UUID,
  p_metric_key TEXT,
  p_period_key TEXT,
  p_period_start_at TIMESTAMPTZ,
  p_period_end_at TIMESTAMPTZ,
  p_limit INTEGER,
  p_increment_by INTEGER DEFAULT 1
)
RETURNS TABLE(allowed BOOLEAN, new_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row_id UUID;
  v_count INTEGER;
  v_next_count INTEGER;
BEGIN
  IF p_increment_by <= 0 THEN
    RAISE EXCEPTION 'p_increment_by must be positive';
  END IF;

  SELECT id, count
  INTO v_row_id, v_count
  FROM usage_counters
  WHERE user_id = p_user_id
    AND metric_key = p_metric_key
    AND period_key = p_period_key
  FOR UPDATE;

  IF v_row_id IS NULL THEN
    v_count := 0;
  END IF;

  v_next_count := v_count + p_increment_by;

  IF p_limit IS NOT NULL AND v_next_count > p_limit THEN
    RETURN QUERY SELECT FALSE, v_count;
    RETURN;
  END IF;

  IF v_row_id IS NULL THEN
    INSERT INTO usage_counters (
      user_id, metric_key, period_key, period_start_at, period_end_at, count
    )
    VALUES (
      p_user_id, p_metric_key, p_period_key, p_period_start_at, p_period_end_at, v_next_count
    )
    ON CONFLICT (user_id, metric_key, period_key)
    DO UPDATE SET count = usage_counters.count + p_increment_by
    RETURNING count INTO v_next_count;
  ELSE
    UPDATE usage_counters
    SET count = v_next_count
    WHERE id = v_row_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_next_count;
END;
$$;

GRANT EXECUTE ON FUNCTION reserve_usage_counter(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;

