BEGIN;
ALTER TABLE public.calendar_entries ADD COLUMN IF NOT EXISTS creation_hash text;
CREATE OR REPLACE FUNCTION public.save_calendar_entry(p_id uuid,p_payload jsonb,p_items uuid[],p_create boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); existing public.calendar_entries%ROWTYPE; saved public.calendar_entries%ROWTYPE; fingerprint text;
BEGIN
 IF actor IS NULL OR p_id IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Authentication and a valid entry are required'; END IF;
 IF p_items IS NOT NULL AND cardinality(p_items)>100 THEN RAISE EXCEPTION 'Too many pieces'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('calendar-entry:'||p_id::text,0));
 SELECT * INTO existing FROM public.calendar_entries WHERE id=p_id AND user_id=actor FOR UPDATE;
 fingerprint:=md5(p_payload::text||coalesce(to_jsonb(p_items)::text,'null'));
 IF p_create AND FOUND THEN
  IF existing.creation_hash IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'The retry has changed'; END IF;
  RETURN to_jsonb(existing);
 END IF;
 IF NOT p_create AND NOT FOUND THEN RAISE EXCEPTION 'Entry not found'; END IF;
 IF p_items IS NOT NULL AND (SELECT count(DISTINCT id) FROM public.wardrobe_items WHERE id=ANY(p_items) AND user_id=actor)<>(SELECT count(DISTINCT item) FROM unnest(p_items) item)
 THEN RAISE EXCEPTION 'Clothing item not found'; END IF;
 IF p_payload->>'outfit_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.outfits WHERE id=(p_payload->>'outfit_id')::uuid AND user_id=actor)
 THEN RAISE EXCEPTION 'Outfit not found'; END IF;
 IF p_create THEN
  INSERT INTO public.calendar_entries(id,user_id,entry_date,status,outfit_id,notes,weather_context,creation_hash)
  VALUES(p_id,actor,(p_payload->>'entry_date')::date,p_payload->>'status',(p_payload->>'outfit_id')::uuid,p_payload->>'notes',coalesce(p_payload->'weather_context','{}'),fingerprint) RETURNING * INTO saved;
 ELSE
  UPDATE public.calendar_entries SET
   entry_date=CASE WHEN p_payload?'entry_date' THEN (p_payload->>'entry_date')::date ELSE entry_date END,
   status=CASE WHEN p_payload?'status' THEN p_payload->>'status' ELSE status END,
   outfit_id=CASE WHEN p_payload?'outfit_id' THEN (p_payload->>'outfit_id')::uuid ELSE outfit_id END,
   notes=CASE WHEN p_payload?'notes' THEN p_payload->>'notes' ELSE notes END,
   weather_context=CASE WHEN p_payload?'weather_context' THEN p_payload->'weather_context' ELSE weather_context END
  WHERE id=p_id AND user_id=actor RETURNING * INTO saved;
 END IF;
 IF p_items IS NOT NULL THEN
  DELETE FROM public.calendar_entry_items WHERE calendar_entry_id=p_id;
  INSERT INTO public.calendar_entry_items(calendar_entry_id,wardrobe_item_id) SELECT p_id,item FROM (SELECT DISTINCT unnest(p_items) item) pieces;
 END IF;
 RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.save_calendar_entry(uuid,jsonb,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_calendar_entry(uuid,jsonb,uuid[],boolean) TO authenticated;

-- Cover direct PostgREST writes as well as the transactional RPC.
CREATE FUNCTION public.check_calendar_piece_ownership() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.calendar_entries entry JOIN public.wardrobe_items item ON item.user_id=entry.user_id WHERE entry.id=NEW.calendar_entry_id AND item.id=NEW.wardrobe_item_id)
 THEN RAISE EXCEPTION 'Clothing item not found'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER calendar_piece_ownership BEFORE INSERT OR UPDATE ON public.calendar_entry_items FOR EACH ROW EXECUTE FUNCTION public.check_calendar_piece_ownership();
CREATE FUNCTION public.check_calendar_outfit_ownership() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.outfit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.outfits WHERE id=NEW.outfit_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Outfit not found'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER calendar_outfit_ownership BEFORE INSERT OR UPDATE ON public.calendar_entries FOR EACH ROW EXECUTE FUNCTION public.check_calendar_outfit_ownership();
COMMIT;
