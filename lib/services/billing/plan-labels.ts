import type { PlanCode } from './plans';

export type PlanLabelCode = 'starter' | 'plus' | 'pro';

const PLAN_LABEL_BY_CODE: Record<PlanCode, PlanLabelCode> = {
  free: 'starter',
  plus: 'plus',
  pro: 'pro',
};

const PLAN_CODE_BY_LABEL: Record<PlanLabelCode, PlanCode> = {
  starter: 'free',
  plus: 'plus',
  pro: 'pro',
};

const PLAN_DISPLAY_NAME_BY_CODE: Record<PlanCode, string> = {
  free: 'Starter',
  plus: 'Plus',
  pro: 'Pro',
};

export function toPlanLabelCode(planCode: PlanCode): PlanLabelCode {
  return PLAN_LABEL_BY_CODE[planCode];
}

export function toPlanCodeFromLabel(labelCode: PlanLabelCode): PlanCode {
  return PLAN_CODE_BY_LABEL[labelCode];
}

export function isFreePlan(planCode: PlanCode): boolean {
  return planCode === 'free';
}

export function getPlanDisplayName(planCode: PlanCode): string {
  return PLAN_DISPLAY_NAME_BY_CODE[planCode];
}
