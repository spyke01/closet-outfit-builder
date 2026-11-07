BEGIN;
-- The hosted service_role cannot SELECT auth.users directly. This trusted RPC
-- needs its owner's privileges to lock that row while reserving a complete
-- onboarding batch. Only the application service may invoke it; the API derives
-- p_user_id from the authenticated session and validates every selected category.
ALTER FUNCTION public.persist_onboarding_batch(uuid,text,text,jsonb) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.persist_onboarding_batch(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.persist_onboarding_batch(uuid,text,text,jsonb) TO service_role;
COMMIT;
