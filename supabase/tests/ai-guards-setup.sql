CREATE SCHEMA auth;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.plans(code text PRIMARY KEY,active boolean DEFAULT true,limits_json jsonb NOT NULL);
CREATE TABLE public.user_subscriptions(user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,plan_code text,billing_state text,plan_anchor_date date);
CREATE TABLE public.usage_counters(id uuid DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,metric_key text NOT NULL,period_key text NOT NULL,period_start_at timestamptz,period_end_at timestamptz,count integer NOT NULL DEFAULT 0 CHECK(count>=0),UNIQUE(user_id,metric_key,period_key));
CREATE TABLE public.assistant_messages(id uuid DEFAULT gen_random_uuid(),user_id uuid,thread_id uuid,role text,metadata_json jsonb);
CREATE TABLE public.assistant_inference_events(id uuid DEFAULT gen_random_uuid(),user_id uuid);
CREATE TABLE public.wardrobe_items(id uuid DEFAULT gen_random_uuid(),user_id uuid);
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_inference_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY old_counter_writes ON public.usage_counters FOR ALL USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY old_message_writes ON public.assistant_messages FOR ALL USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY old_event_writes ON public.assistant_inference_events FOR ALL USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
GRANT USAGE ON SCHEMA public,auth TO service_role,authenticated,anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.usage_counters,public.assistant_messages,public.assistant_inference_events TO authenticated;
CREATE FUNCTION public.get_effective_plan_code_for_user(p_user_id uuid) RETURNS text LANGUAGE sql AS $$ SELECT coalesce((SELECT CASE WHEN billing_state IN ('past_due','unpaid','canceled') THEN 'free' ELSE plan_code END FROM public.user_subscriptions WHERE user_id=p_user_id),'free') $$;
CREATE FUNCTION public.get_plan_limit_int(p_plan_code text,p_key text) RETURNS integer LANGUAGE sql AS $$ SELECT (limits_json->>p_key)::integer FROM public.plans WHERE code=p_plan_code $$;
INSERT INTO public.plans(code,limits_json) VALUES
 ('free','{"ai_image_generations_monthly":0,"ai_stylist_messages_monthly":0,"ai_stylist_vision_messages_monthly":0,"ai_today_ai_generations_monthly":null,"ai_burst_per_hour":5}'),
 ('plus','{"ai_image_generations_monthly":30,"ai_stylist_messages_monthly":300,"ai_stylist_vision_messages_monthly":30,"ai_today_ai_generations_monthly":7,"ai_burst_per_hour":5}'),
 ('pro','{"ai_image_generations_monthly":100,"ai_stylist_messages_monthly":null,"ai_stylist_vision_messages_monthly":100,"ai_today_ai_generations_monthly":14,"ai_burst_per_hour":5}');
