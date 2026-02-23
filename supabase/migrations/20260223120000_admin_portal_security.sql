-- Admin portal foundations: permissions, impersonation, audit, support cases, durable rate limits

CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_role_permissions UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  owner_admin_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'admin_portal',
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('read_only')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  ticket_id TEXT NOT NULL CHECK (char_length(ticket_id) BETWEEN 1 AND 120),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NULL,
  ended_reason TEXT NULL CHECK (ended_reason IS NULL OR char_length(ended_reason) BETWEEN 1 AND 500),
  created_ip TEXT NULL,
  user_agent TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_impersonation_not_self CHECK (actor_user_id <> target_user_id)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failed')),
  error_code TEXT NULL,
  reason TEXT NULL,
  request_id TEXT NULL,
  ip_hash TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_rate_limits_user_scope UNIQUE (user_id, scope)
);

ALTER TABLE admin_notes
  ADD COLUMN IF NOT EXISTS case_id UUID NULL REFERENCES support_cases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_role_id ON admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_permission_id ON admin_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_user_status ON support_cases(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_cases_owner_status ON support_cases(owner_admin_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_actor ON admin_impersonation_sessions(actor_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_target ON admin_impersonation_sessions(target_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_status ON admin_impersonation_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor_time ON admin_audit_log(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_time ON admin_audit_log(target_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action_time ON admin_audit_log(action, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_rate_limits_reset_at ON admin_rate_limits(reset_at);

DROP TRIGGER IF EXISTS update_admin_permissions_updated_at ON admin_permissions;
CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON admin_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_cases_updated_at ON support_cases;
CREATE TRIGGER update_support_cases_updated_at BEFORE UPDATE ON support_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_impersonation_sessions_updated_at ON admin_impersonation_sessions;
CREATE TRIGGER update_admin_impersonation_sessions_updated_at BEFORE UPDATE ON admin_impersonation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_rate_limits_updated_at ON admin_rate_limits;
CREATE TRIGGER update_admin_rate_limits_updated_at BEFORE UPDATE ON admin_rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_admin_audit_log_updates ON admin_audit_log;
CREATE TRIGGER protect_admin_audit_log_updates
BEFORE UPDATE ON admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_admin_audit_log_update();

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role is expected to access these tables via server code.
-- No public/authenticated policies are added intentionally.

INSERT INTO app_roles (role)
VALUES
  ('support_admin'),
  ('impersonation_admin'),
  ('super_admin')
ON CONFLICT (role) DO NOTHING;

INSERT INTO admin_permissions (key, description)
VALUES
  ('billing.read', 'Read billing admin data'),
  ('billing.write', 'Modify billing-related records'),
  ('support.read', 'Read user support context and cases'),
  ('support.write', 'Create and update support cases and notes'),
  ('impersonation.start', 'Start read-only impersonation sessions'),
  ('impersonation.stop', 'Stop active impersonation sessions'),
  ('audit.read', 'Read admin audit log'),
  ('roles.manage', 'Manage admin role assignments')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_roles r
JOIN admin_permissions p ON TRUE
WHERE
  (r.role = 'billing_admin' AND p.key IN ('billing.read', 'billing.write', 'support.read', 'audit.read'))
  OR (r.role = 'support_admin' AND p.key IN ('support.read', 'support.write', 'audit.read'))
  OR (r.role = 'impersonation_admin' AND p.key IN ('support.read', 'impersonation.start', 'impersonation.stop', 'audit.read'))
  OR (r.role = 'super_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
