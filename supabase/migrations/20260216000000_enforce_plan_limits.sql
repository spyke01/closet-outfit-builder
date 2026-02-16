-- Enforce membership plan limits at the database layer.
-- This protects write paths that go directly from client -> Supabase tables.

CREATE OR REPLACE FUNCTION get_effective_plan_code_for_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  state_text TEXT;
  code_text TEXT;
BEGIN
  SELECT billing_state, plan_code
  INTO state_text, code_text
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  IF code_text IS NULL THEN
    RETURN 'free';
  END IF;

  IF state_text IN ('past_due', 'unpaid', 'canceled') THEN
    RETURN 'free';
  END IF;

  RETURN code_text;
END;
$$;

CREATE OR REPLACE FUNCTION get_plan_limit_int(p_plan_code TEXT, p_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  limits JSONB;
  value_text TEXT;
BEGIN
  -- Monthly and yearly paid plans share limits in this MVP, so we can read month rows.
  SELECT limits_json
  INTO limits
  FROM plans
  WHERE code = p_plan_code
    AND (
      (p_plan_code = 'free' AND interval = 'none')
      OR (p_plan_code <> 'free' AND interval = 'month')
    )
  LIMIT 1;

  IF limits IS NULL THEN
    RETURN NULL;
  END IF;

  value_text := limits ->> p_key;
  IF value_text IS NULL OR lower(value_text) = 'null' THEN
    RETURN NULL;
  END IF;

  RETURN value_text::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_wardrobe_item_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_code TEXT;
  item_limit INTEGER;
  item_count INTEGER;
BEGIN
  plan_code := get_effective_plan_code_for_user(NEW.user_id);
  item_limit := get_plan_limit_int(plan_code, 'wardrobe_items');

  IF item_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO item_count
  FROM wardrobe_items
  WHERE user_id = NEW.user_id;

  IF item_count >= item_limit THEN
    RAISE EXCEPTION 'Wardrobe limit reached for your plan (% items). Upgrade to add more.', item_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_saved_outfit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_code TEXT;
  outfit_limit INTEGER;
  outfit_count INTEGER;
BEGIN
  plan_code := get_effective_plan_code_for_user(NEW.user_id);
  outfit_limit := get_plan_limit_int(plan_code, 'saved_outfits');

  IF outfit_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO outfit_count
  FROM outfits
  WHERE user_id = NEW.user_id;

  IF outfit_count >= outfit_limit THEN
    RAISE EXCEPTION 'Saved outfit limit reached for your plan (% outfits). Upgrade to add more.', outfit_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_trip_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_code TEXT;
  active_trip_limit INTEGER;
  max_trip_days INTEGER;
  active_trip_count INTEGER;
  trip_length_days INTEGER;
  target_user_id UUID;
BEGIN
  target_user_id := NEW.user_id;
  plan_code := get_effective_plan_code_for_user(target_user_id);

  max_trip_days := get_plan_limit_int(plan_code, 'max_trip_days');
  IF max_trip_days IS NOT NULL THEN
    trip_length_days := (NEW.end_date - NEW.start_date) + 1;
    IF trip_length_days > max_trip_days THEN
      RAISE EXCEPTION 'Trip length exceeds your plan limit (% days).', max_trip_days;
    END IF;
  END IF;

  active_trip_limit := get_plan_limit_int(plan_code, 'active_trips');
  IF active_trip_limit IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.end_date < CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_trip_count
  FROM trips
  WHERE user_id = target_user_id
    AND end_date >= CURRENT_DATE
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF active_trip_count >= active_trip_limit THEN
    RAISE EXCEPTION 'Active trip limit reached for your plan (% trips).', active_trip_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_trip_pack_item_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_user_id UUID;
  plan_code TEXT;
  pack_limit INTEGER;
  pack_count INTEGER;
BEGIN
  SELECT user_id
  INTO target_user_id
  FROM trips
  WHERE id = NEW.trip_id;

  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  plan_code := get_effective_plan_code_for_user(target_user_id);
  pack_limit := get_plan_limit_int(plan_code, 'packing_items_per_trip');

  IF pack_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO pack_count
  FROM trip_pack_items
  WHERE trip_id = NEW.trip_id;

  IF pack_count >= pack_limit THEN
    RAISE EXCEPTION 'Packing checklist limit reached for this trip (% items).', pack_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_calendar_window_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_code TEXT;
  history_days INTEGER;
  forward_days INTEGER;
BEGIN
  plan_code := get_effective_plan_code_for_user(NEW.user_id);

  history_days := get_plan_limit_int(plan_code, 'calendar_history_days');
  forward_days := get_plan_limit_int(plan_code, 'calendar_forward_days');

  IF history_days IS NOT NULL AND NEW.entry_date < (CURRENT_DATE - history_days) THEN
    RAISE EXCEPTION 'Calendar history window exceeded for your plan (% days).', history_days;
  END IF;

  IF forward_days IS NOT NULL AND NEW.entry_date > (CURRENT_DATE + forward_days) THEN
    RAISE EXCEPTION 'Calendar forward window exceeded for your plan (% days).', forward_days;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_wardrobe_item_limit ON wardrobe_items;
CREATE TRIGGER trigger_enforce_wardrobe_item_limit
BEFORE INSERT ON wardrobe_items
FOR EACH ROW
EXECUTE FUNCTION enforce_wardrobe_item_limit();

DROP TRIGGER IF EXISTS trigger_enforce_saved_outfit_limit ON outfits;
CREATE TRIGGER trigger_enforce_saved_outfit_limit
BEFORE INSERT ON outfits
FOR EACH ROW
EXECUTE FUNCTION enforce_saved_outfit_limit();

DROP TRIGGER IF EXISTS trigger_enforce_trip_limits ON trips;
CREATE TRIGGER trigger_enforce_trip_limits
BEFORE INSERT OR UPDATE OF start_date, end_date ON trips
FOR EACH ROW
EXECUTE FUNCTION enforce_trip_limits();

DROP TRIGGER IF EXISTS trigger_enforce_trip_pack_item_limit ON trip_pack_items;
CREATE TRIGGER trigger_enforce_trip_pack_item_limit
BEFORE INSERT ON trip_pack_items
FOR EACH ROW
EXECUTE FUNCTION enforce_trip_pack_item_limit();

DROP TRIGGER IF EXISTS trigger_enforce_calendar_window_limit ON calendar_entries;
CREATE TRIGGER trigger_enforce_calendar_window_limit
BEFORE INSERT OR UPDATE OF entry_date ON calendar_entries
FOR EACH ROW
EXECUTE FUNCTION enforce_calendar_window_limit();
