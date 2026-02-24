-- Support case enhancements:
-- - comments/threading
-- - explicit close/reopen window metadata
-- - status normalization

ALTER TABLE support_cases
  ADD COLUMN IF NOT EXISTS subject TEXT NULL,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS closed_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reopen_deadline_at TIMESTAMPTZ NULL;

UPDATE support_cases
SET status = 'closed'
WHERE status = 'resolved';

ALTER TABLE support_cases
  DROP CONSTRAINT IF EXISTS support_cases_status_check;

ALTER TABLE support_cases
  ADD CONSTRAINT support_cases_status_check
  CHECK (status IN ('open', 'in_progress', 'closed'));

ALTER TABLE support_cases
  DROP CONSTRAINT IF EXISTS support_cases_category_check;

ALTER TABLE support_cases
  ADD CONSTRAINT support_cases_category_check
  CHECK (category IN ('billing', 'account', 'bug', 'feature', 'other'));

UPDATE support_cases
SET
  subject = COALESCE(subject, LEFT(summary, 120)),
  closed_at = COALESCE(closed_at, CASE WHEN status = 'closed' THEN updated_at ELSE NULL END),
  reopen_deadline_at = COALESCE(reopen_deadline_at, CASE WHEN status = 'closed' THEN updated_at + interval '7 days' ELSE NULL END)
WHERE subject IS NULL OR (status = 'closed' AND (closed_at IS NULL OR reopen_deadline_at IS NULL));

ALTER TABLE support_cases
  ALTER COLUMN subject SET NOT NULL;

CREATE TABLE IF NOT EXISTS support_case_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('user', 'admin')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_cases_user_updated ON support_cases(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_cases_status_updated ON support_cases(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_cases_reopen_deadline ON support_cases(reopen_deadline_at);
CREATE INDEX IF NOT EXISTS idx_support_case_comments_case_created ON support_case_comments(case_id, created_at ASC);

DROP TRIGGER IF EXISTS update_support_case_comments_updated_at ON support_case_comments;
CREATE TRIGGER update_support_case_comments_updated_at BEFORE UPDATE ON support_case_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE support_case_comments ENABLE ROW LEVEL SECURITY;
