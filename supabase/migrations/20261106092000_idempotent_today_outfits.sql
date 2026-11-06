BEGIN;
ALTER TABLE public.outfits ADD COLUMN IF NOT EXISTS ai_job_id uuid REFERENCES public.ai_jobs(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS outfits_ai_job ON public.outfits(ai_job_id) WHERE ai_job_id IS NOT NULL;

-- Persist the generated outfit, its pieces, and today's selection together.
-- Only the server can attach a completed, owned AI job to an outfit.
CREATE OR REPLACE FUNCTION public.persist_today_ai_outfit(
 p_user_id uuid,p_job_id uuid,p_item_ids uuid[],p_score integer,p_date date,
 p_event text,p_style text,p_custom text,p_formality text,p_explanation text,p_weather jsonb,p_expires timestamptz
) RETURNS uuid LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE job public.ai_jobs%ROWTYPE; outfit_id uuid; expected integer;
BEGIN
 SELECT * INTO job FROM public.ai_jobs WHERE id=p_job_id AND user_id=p_user_id AND task='today_outfit' FOR UPDATE;
 IF NOT FOUND OR job.status<>'succeeded' OR job.scope_key<>p_date::text THEN RAISE EXCEPTION 'Invalid outfit request'; END IF;
 SELECT id INTO outfit_id FROM public.outfits WHERE ai_job_id=p_job_id AND user_id=p_user_id;
 IF FOUND THEN RETURN outfit_id; END IF;
 expected:=cardinality(p_item_ids);
 IF expected NOT BETWEEN 2 AND 20 OR (SELECT count(DISTINCT id) FROM public.wardrobe_items WHERE id=ANY(p_item_ids) AND user_id=p_user_id AND active)<>expected
 THEN RAISE EXCEPTION 'Invalid outfit items'; END IF;
 INSERT INTO public.outfits(user_id,source,name,score,weight,loved,ai_job_id)
 VALUES(p_user_id,'generated','Today’s outfit',p_score,1,false,p_job_id) RETURNING id INTO outfit_id;
 INSERT INTO public.outfit_items(outfit_id,item_id,category_id)
 SELECT outfit_id,id,category_id FROM public.wardrobe_items WHERE id=ANY(p_item_ids) AND user_id=p_user_id;
 INSERT INTO public.today_ai_outfits(user_id,entry_date,outfit_id,event_type,style_preset,style_custom,formality_level,sebastian_explanation,weather_context_json,expires_at)
 VALUES(p_user_id,p_date,outfit_id,p_event,p_style,p_custom,p_formality,p_explanation,p_weather,p_expires)
 ON CONFLICT(user_id,entry_date) DO UPDATE SET outfit_id=excluded.outfit_id,event_type=excluded.event_type,
 style_preset=excluded.style_preset,style_custom=excluded.style_custom,formality_level=excluded.formality_level,
 sebastian_explanation=excluded.sebastian_explanation,weather_context_json=excluded.weather_context_json,expires_at=excluded.expires_at,user_saved=false;
 RETURN outfit_id;
END $$;
REVOKE ALL ON FUNCTION public.persist_today_ai_outfit(uuid,uuid,uuid[],integer,date,text,text,text,text,text,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.persist_today_ai_outfit(uuid,uuid,uuid[],integer,date,text,text,text,text,text,jsonb,timestamptz) TO service_role;
COMMIT;
