import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'admin-audit' });

export interface AdminAuditInput {
  actorUserId: string;
  action: string;
  outcome: 'success' | 'denied' | 'failed';
  resourceType: string;
  resourceId?: string | null;
  targetUserId?: string | null;
  errorCode?: string | null;
  reason?: string | null;
  requestId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.ADMIN_AUDIT_IP_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || 'admin-ip-fallback-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function writeAdminAuditLog(input: AdminAuditInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('admin_audit_log')
      .insert({
        actor_user_id: input.actorUserId,
        target_user_id: input.targetUserId || null,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId || null,
        outcome: input.outcome,
        error_code: input.errorCode || null,
        reason: input.reason || null,
        request_id: input.requestId || null,
        ip_hash: hashIp(input.ip),
        metadata_json: input.metadata || {},
      });

    if (error) {
      logger.error('Failed to write admin audit log', { error: error.message, action: input.action });
    }
  } catch (error) {
    logger.error('Admin audit logging exception', { error, action: input.action });
  }
}
