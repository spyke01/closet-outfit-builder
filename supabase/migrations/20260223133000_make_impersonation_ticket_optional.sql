-- Make support ticket linkage optional for impersonation sessions
-- while support tooling is still being scoped.

ALTER TABLE admin_impersonation_sessions
  ALTER COLUMN ticket_id DROP NOT NULL;

ALTER TABLE admin_impersonation_sessions
  DROP CONSTRAINT IF EXISTS admin_impersonation_sessions_ticket_id_check;

ALTER TABLE admin_impersonation_sessions
  ADD CONSTRAINT admin_impersonation_sessions_ticket_id_check
  CHECK (ticket_id IS NULL OR char_length(ticket_id) BETWEEN 1 AND 120);
