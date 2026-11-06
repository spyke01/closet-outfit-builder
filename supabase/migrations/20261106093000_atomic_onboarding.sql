BEGIN;
CREATE TABLE public.onboarding_batches(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_key text NOT NULL CHECK(length(request_key)<=160),
 request_hash text NOT NULL,
 item_count integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_key)
);
ALTER TABLE public.onboarding_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onboarding_batches FROM anon,authenticated;
GRANT ALL ON public.onboarding_batches TO service_role;
CREATE OR REPLACE FUNCTION public.persist_onboarding_batch(p_user_id uuid,p_key text,p_hash text,p_items jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE existing public.onboarding_batches%ROWTYPE; amount integer; maximum integer; category_ids uuid[];
BEGIN
 -- Serialize a user's batch with concurrent onboarding submissions.
 PERFORM id FROM auth.users WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 SELECT * INTO existing FROM public.onboarding_batches WHERE user_id=p_user_id AND request_key=p_key;
 IF FOUND THEN
  IF existing.request_hash<>p_hash THEN RAISE EXCEPTION 'Request changed'; END IF;
  RETURN existing.item_count;
 END IF;
 IF jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Invalid pieces'; END IF;
 amount:=jsonb_array_length(p_items);
 IF amount NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Choose between 1 and 200 pieces'; END IF;
 SELECT array_agg(DISTINCT (item->>'category_id')::uuid) INTO category_ids FROM jsonb_array_elements(p_items) item;
 IF (SELECT count(*) FROM public.categories WHERE id=ANY(category_ids) AND user_id=p_user_id)<>cardinality(category_ids) THEN RAISE EXCEPTION 'Category not found'; END IF;
 maximum:=public.get_plan_limit_int(public.get_effective_plan_code_for_user(p_user_id),'wardrobe_items');
 IF maximum IS NOT NULL AND (SELECT count(*) FROM public.wardrobe_items WHERE user_id=p_user_id AND active)+amount>maximum THEN RAISE EXCEPTION 'Your selections exceed your wardrobe allowance'; END IF;
 INSERT INTO public.wardrobe_items(user_id,category_id,name,color,formality_score,season,image_url,active,capsule_tags,bg_removal_status)
 SELECT p_user_id,(item->>'category_id')::uuid,item->>'name',item->>'color',(item->>'formality_score')::integer,
 ARRAY(SELECT jsonb_array_elements_text(item->'season')),item->>'image_url',true,ARRAY['onboarding'],'completed'
 FROM jsonb_array_elements(p_items) item;
 INSERT INTO public.onboarding_batches(user_id,request_key,request_hash,item_count) VALUES(p_user_id,p_key,p_hash,amount);
 RETURN amount;
END $$;
REVOKE ALL ON FUNCTION public.persist_onboarding_batch(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.persist_onboarding_batch(uuid,text,text,jsonb) TO service_role;
COMMIT;
