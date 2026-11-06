BEGIN;
ALTER TABLE public.assistant_inference_events ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.ai_jobs(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS assistant_inference_events_job ON public.assistant_inference_events(job_id);
-- Match web entitlements when a canceled subscription still has paid time left.
CREATE OR REPLACE FUNCTION public.get_effective_plan_code_for_user(p_user_id uuid)
RETURNS text LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE subscription public.user_subscriptions%ROWTYPE;
BEGIN
 SELECT * INTO subscription FROM public.user_subscriptions WHERE user_id=p_user_id;
 IF NOT FOUND OR subscription.plan_code IS NULL OR subscription.billing_state IN ('past_due','unpaid') THEN RETURN 'free'; END IF;
 IF subscription.cancel_at_period_end AND subscription.current_period_end>now() THEN RETURN subscription.plan_code; END IF;
 IF subscription.billing_state='canceled' THEN RETURN 'free'; END IF;
 RETURN subscription.plan_code;
END $$;
-- Keep anonymous spend records after deletion without retaining conversation text,
-- image references, or the original request fingerprint.
CREATE FUNCTION public.clear_deleted_ai_job_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.user_id IS NULL AND OLD.user_id IS NOT NULL THEN
  NEW.result_json:=NULL; NEW.prediction_id:=NULL; NEW.scope_key:=''; NEW.request_hash:=repeat('0',64);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ai_jobs_clear_deleted_identity BEFORE UPDATE OF user_id ON public.ai_jobs FOR EACH ROW EXECUTE FUNCTION public.clear_deleted_ai_job_identity();
COMMIT;
