-- Align billing_admin with support comment/write actions used in admin portal.

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_roles r
JOIN admin_permissions p ON p.key = 'support.write'
WHERE r.role = 'billing_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
