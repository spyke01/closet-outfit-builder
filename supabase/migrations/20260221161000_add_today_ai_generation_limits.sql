-- Add dedicated Today AI generation limits to plans.

UPDATE plans
SET limits_json = jsonb_set(
  limits_json,
  '{ai_today_ai_generations_monthly}',
  CASE
    WHEN code = 'plus' THEN to_jsonb(7)
    WHEN code = 'pro' THEN to_jsonb(14)
    ELSE 'null'::jsonb
  END,
  true
)
WHERE code IN ('free', 'plus', 'pro');
