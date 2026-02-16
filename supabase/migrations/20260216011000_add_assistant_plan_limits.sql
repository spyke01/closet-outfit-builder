-- Add Sebastian assistant limits/features to plans catalog rows.

UPDATE plans
SET limits_json = jsonb_set(
  jsonb_set(limits_json, '{ai_stylist_messages_monthly}',
    CASE
      WHEN code = 'free' THEN to_jsonb(0)
      WHEN code = 'plus' THEN to_jsonb(300)
      WHEN code = 'pro' THEN 'null'::jsonb
      ELSE to_jsonb(0)
    END,
    true
  ),
  '{ai_stylist_vision_messages_monthly}',
  CASE
    WHEN code = 'free' THEN to_jsonb(0)
    WHEN code = 'plus' THEN to_jsonb(30)
    WHEN code = 'pro' THEN to_jsonb(100)
    ELSE to_jsonb(0)
  END,
  true
)
WHERE code IN ('free', 'plus', 'pro');

UPDATE plans
SET features_json = jsonb_set(
  features_json,
  '{sebastian_assistant}',
  CASE
    WHEN code = 'free' THEN 'false'::jsonb
    WHEN code = 'plus' THEN 'true'::jsonb
    WHEN code = 'pro' THEN 'true'::jsonb
    ELSE 'false'::jsonb
  END,
  true
)
WHERE code IN ('free', 'plus', 'pro');
