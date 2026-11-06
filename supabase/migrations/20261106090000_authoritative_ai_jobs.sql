-- Metering and provider handles are server-owned. Deploy compatible server/Edge
-- callers with this migration; never restore client counter writes as a rollback.
BEGIN;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_counters' AND cmd <> 'SELECT'
  LOOP EXECUTE format('DROP POLICY %I ON public.usage_counters',p.policyname); END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.usage_counters FROM anon, authenticated;
CREATE POLICY "Read own authoritative usage" ON public.usage_counters FOR SELECT TO authenticated USING(auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.reserve_usage_counter(
 p_user_id uuid,p_metric_key text,p_period_key text,p_period_start_at timestamptz,
 p_period_end_at timestamptz,p_limit integer,p_increment_by integer DEFAULT 1
) RETURNS TABLE(allowed boolean,new_count integer)
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE current_count integer;
BEGIN
 IF p_increment_by NOT BETWEEN 1 AND 1000 OR (p_limit IS NOT NULL AND p_limit<0)
   OR length(p_metric_key)>160 OR length(p_period_key)>160 THEN
   RAISE EXCEPTION 'Invalid usage reservation';
 END IF;
 -- Insert first: a SELECT FOR UPDATE cannot lock a nonexistent counter.
 INSERT INTO public.usage_counters(user_id,metric_key,period_key,period_start_at,period_end_at,count)
 VALUES(p_user_id,p_metric_key,p_period_key,p_period_start_at,p_period_end_at,0)
 ON CONFLICT(user_id,metric_key,period_key) DO NOTHING;
 SELECT count INTO current_count FROM public.usage_counters
 WHERE user_id=p_user_id AND metric_key=p_metric_key AND period_key=p_period_key FOR UPDATE;
 IF p_limit IS NOT NULL AND current_count+p_increment_by>p_limit THEN
  RETURN QUERY SELECT false,current_count; RETURN;
 END IF;
 UPDATE public.usage_counters SET count=count+p_increment_by
 WHERE user_id=p_user_id AND metric_key=p_metric_key AND period_key=p_period_key
 RETURNING count INTO current_count;
 RETURN QUERY SELECT true,current_count;
END $$;
REVOKE ALL ON FUNCTION public.reserve_usage_counter(uuid,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_usage_counter(uuid,text,text,timestamptz,timestamptz,integer,integer) TO service_role;

ALTER TABLE public.assistant_messages ADD COLUMN IF NOT EXISTS request_key text;
CREATE UNIQUE INDEX assistant_messages_request ON public.assistant_messages(user_id,thread_id,role,request_key);

CREATE TABLE public.ai_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 -- Retain global spending history when an account is deleted.
 user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 task text NOT NULL CHECK(task IN ('assistant_text','assistant_vision','today_outfit','wardrobe_image','outfit_image','background_removal','media_upload')),
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 160),
 request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 scope_key text NOT NULL DEFAULT '' CHECK(length(scope_key)<=300),
 provider text NOT NULL,
 model text NOT NULL,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','processing','succeeded','failed','canceled')),
 prediction_id text,
 reserved_cost_micros bigint NOT NULL CHECK(reserved_cost_micros>=0),
 actual_cost_micros bigint CHECK(actual_cost_micros>=0),
 metric_key text NOT NULL,
 period_key text NOT NULL,
 result_json jsonb,
 error_code text,
 retry_parent_id uuid REFERENCES public.ai_jobs(id),
 lease_expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,task,idempotency_key)
);
CREATE UNIQUE INDEX ai_jobs_one_courtesy_retry ON public.ai_jobs(retry_parent_id) WHERE retry_parent_id IS NOT NULL;
CREATE INDEX ai_jobs_budget ON public.ai_jobs(created_at) INCLUDE(reserved_cost_micros,actual_cost_micros);
CREATE INDEX ai_jobs_owner ON public.ai_jobs(user_id,created_at DESC);
CREATE INDEX ai_jobs_pending ON public.ai_jobs(user_id,lease_expires_at) WHERE status IN ('reserved','processing');
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_jobs FROM anon,authenticated;
GRANT ALL ON public.ai_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_job(
 p_user_id uuid,p_task text,p_key text,p_hash text,p_scope text,p_provider text,p_model text,
 p_max_cost_micros bigint,p_global_daily_micros bigint,p_global_monthly_micros bigint,
 p_user_monthly_micros bigint,p_max_inflight integer DEFAULT 2,p_retry_parent uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE
 existing public.ai_jobs%ROWTYPE; parent public.ai_jobs%ROWTYPE; job public.ai_jobs%ROWTYPE;
 plan_code text; metric text; limit_key text; monthly_limit integer; count_now integer;
 period_start timestamptz; period_end timestamptz; period_text text; anchor_day integer;
 global_cost bigint; user_cost bigint; hour_count integer; burst integer; free_retry boolean:=false;
BEGIN
 IF p_max_cost_micros NOT BETWEEN 1 AND 100000000 OR p_global_daily_micros<=0
 OR p_global_monthly_micros<=0 OR p_user_monthly_micros<=0 OR p_max_inflight NOT BETWEEN 1 AND 20
 OR p_task NOT IN ('assistant_text','assistant_vision','today_outfit','wardrobe_image','outfit_image','background_removal','media_upload')
 THEN RAISE EXCEPTION 'Invalid AI policy'; END IF;
 -- One short transaction serializes the shared budget and first reservations.
 PERFORM pg_advisory_xact_lock(hashtextextended('my-ai-outfit:ai-reservation',0));
 SELECT * INTO existing FROM public.ai_jobs WHERE user_id=p_user_id AND task=p_task AND idempotency_key=p_key;
 IF FOUND THEN
  IF existing.request_hash<>p_hash THEN RETURN jsonb_build_object('allowed',false,'code','IDEMPOTENCY_CONFLICT'); END IF;
  RETURN jsonb_build_object('allowed',true,'created',false,'job',to_jsonb(existing));
 END IF;
 plan_code:=public.get_effective_plan_code_for_user(p_user_id);
 IF p_task IN ('assistant_text','assistant_vision','wardrobe_image','outfit_image') AND plan_code='free'
 THEN RETURN jsonb_build_object('allowed',false,'code','PLAN_REQUIRED'); END IF;
 metric:=CASE p_task WHEN 'assistant_text' THEN 'ai_stylist_messages' WHEN 'assistant_vision' THEN 'ai_stylist_vision_messages'
  WHEN 'wardrobe_image' THEN 'ai_wardrobe_image_generations' WHEN 'outfit_image' THEN 'ai_outfit_image_generations'
  WHEN 'today_outfit' THEN CASE WHEN plan_code='free' THEN 'ai_today_ai_trial_lifetime' ELSE 'ai_today_ai_generations' END
  WHEN 'background_removal' THEN 'ai_background_removals' ELSE 'media_uploads' END;
 limit_key:=CASE p_task WHEN 'assistant_text' THEN 'ai_stylist_messages_monthly'
  WHEN 'assistant_vision' THEN 'ai_stylist_vision_messages_monthly'
  WHEN 'today_outfit' THEN 'ai_today_ai_generations_monthly' ELSE 'ai_image_generations_monthly' END;
 monthly_limit:=CASE WHEN p_task='today_outfit' AND plan_code='free' THEN 1
  WHEN p_task='background_removal' THEN CASE plan_code WHEN 'pro' THEN 2000 WHEN 'plus' THEN 500 ELSE 100 END
  WHEN p_task='media_upload' THEN CASE plan_code WHEN 'pro' THEN 4000 WHEN 'plus' THEN 1000 ELSE 200 END
  ELSE public.get_plan_limit_int(plan_code,limit_key) END;
 IF p_task NOT IN ('background_removal','media_upload') AND NOT (p_task='today_outfit' AND plan_code='free') AND NOT EXISTS(SELECT 1 FROM public.plans WHERE code=plan_code AND active AND limits_json ? limit_key)
 THEN RETURN jsonb_build_object('allowed',false,'code','AI_POLICY_UNAVAILABLE'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.plans WHERE code=plan_code AND active)
 THEN RETURN jsonb_build_object('allowed',false,'code','AI_POLICY_UNAVAILABLE'); END IF;
 SELECT least(extract(day FROM coalesce(plan_anchor_date,date '2000-01-01'))::integer,28)
 INTO anchor_day FROM public.user_subscriptions WHERE user_id=p_user_id;
 anchor_day:=coalesce(anchor_day,1);
 period_start:=(date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')+make_interval(days=>anchor_day-1);
 IF period_start>now() THEN period_start:=period_start-interval '1 month'; END IF;
 period_end:=period_start+interval '1 month';period_text:=to_char(period_start AT TIME ZONE 'UTC','YYYY-MM-DD');
 IF metric='ai_today_ai_trial_lifetime' THEN period_text:='lifetime';period_start:='1970-01-01';period_end:='2999-12-31'; END IF;
 IF p_retry_parent IS NOT NULL THEN
  SELECT * INTO parent FROM public.ai_jobs WHERE id=p_retry_parent AND user_id=p_user_id AND task=p_task
   AND scope_key=p_scope AND status='succeeded' AND retry_parent_id IS NULL AND created_at>now()-interval '5 minutes';
  IF NOT FOUND OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE retry_parent_id=p_retry_parent)
  THEN RETURN jsonb_build_object('allowed',false,'code','RETRY_LIMIT_EXCEEDED'); END IF;
  free_retry:=true;
 END IF;
 IF p_task<>'media_upload' THEN
 SELECT coalesce(sum(coalesce(actual_cost_micros,reserved_cost_micros)),0) INTO global_cost
 FROM public.ai_jobs WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF global_cost+p_max_cost_micros>p_global_daily_micros THEN RETURN jsonb_build_object('allowed',false,'code','AI_BUDGET_EXCEEDED'); END IF;
 SELECT coalesce(sum(coalesce(actual_cost_micros,reserved_cost_micros)),0) INTO global_cost
 FROM public.ai_jobs WHERE created_at>=date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF global_cost+p_max_cost_micros>p_global_monthly_micros THEN RETURN jsonb_build_object('allowed',false,'code','AI_BUDGET_EXCEEDED'); END IF;
 SELECT coalesce(sum(coalesce(actual_cost_micros,reserved_cost_micros)),0) INTO user_cost FROM public.ai_jobs
 WHERE user_id=p_user_id AND created_at>=date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF user_cost+p_max_cost_micros>p_user_monthly_micros THEN RETURN jsonb_build_object('allowed',false,'code','AI_USER_BUDGET_EXCEEDED'); END IF;
 IF (SELECT count(*) FROM public.ai_jobs WHERE user_id=p_user_id AND status IN ('reserved','processing') AND lease_expires_at>now())>=p_max_inflight
 THEN RETURN jsonb_build_object('allowed',false,'code','AI_BUSY'); END IF;
 END IF;
 burst:=CASE WHEN p_task IN ('background_removal','media_upload') THEN 20 ELSE coalesce(public.get_plan_limit_int(plan_code,'ai_burst_per_hour'),5) END;
 SELECT count(*) INTO hour_count FROM public.ai_jobs WHERE user_id=p_user_id AND created_at>now()-interval '1 hour'
 AND CASE WHEN p_task IN ('background_removal','media_upload') THEN task IN ('background_removal','media_upload') ELSE task NOT IN ('background_removal','media_upload') END;
 IF hour_count>=burst THEN RETURN jsonb_build_object('allowed',false,'code','BURST_LIMIT_EXCEEDED'); END IF;
 IF NOT free_retry THEN
  SELECT new_count INTO count_now FROM public.reserve_usage_counter(p_user_id,metric,period_text,period_start,period_end,monthly_limit,1) WHERE allowed;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed',false,'code','USAGE_LIMIT_EXCEEDED'); END IF;
 END IF;
 INSERT INTO public.ai_jobs(user_id,task,idempotency_key,request_hash,scope_key,provider,model,reserved_cost_micros,metric_key,period_key,retry_parent_id)
 VALUES(p_user_id,p_task,p_key,p_hash,coalesce(p_scope,''),p_provider,p_model,p_max_cost_micros,metric,period_text,p_retry_parent) RETURNING * INTO job;
 IF p_task='media_upload' THEN UPDATE public.ai_jobs SET actual_cost_micros=0 WHERE id=job.id RETURNING * INTO job; END IF;
 RETURN jsonb_build_object('allowed',true,'created',true,'job',to_jsonb(job));
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_job(uuid,text,text,text,text,text,text,bigint,bigint,bigint,bigint,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_job(uuid,text,text,text,text,text,text,bigint,bigint,bigint,bigint,integer,uuid) TO service_role;

-- Inference events and assistant metadata cannot be forged through PostgREST.
DO $$ DECLARE t text;p record; BEGIN
 FOREACH t IN ARRAY ARRAY['assistant_messages','assistant_inference_events'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd<>'SELECT'
  LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  EXECUTE format('REVOKE INSERT,UPDATE,DELETE ON public.%I FROM anon,authenticated',t);
 END LOOP;
END $$;

ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS purchase_price numeric(12,2) CHECK(purchase_price>=0);
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS purchase_currency text NOT NULL DEFAULT 'USD' CHECK(purchase_currency ~ '^[A-Z]{3}$');

COMMIT;
