import { describe, expect, it } from 'vitest';
import {
  getPlanDisplayName,
  isFreePlan,
  toPlanCodeFromLabel,
  toPlanLabelCode,
} from '@/lib/services/billing/plan-labels';

describe('plan-labels', () => {
  it('maps free billing code to starter label', () => {
    expect(toPlanLabelCode('free')).toBe('starter');
    expect(toPlanCodeFromLabel('starter')).toBe('free');
  });

  it('keeps plus/pro mappings stable', () => {
    expect(toPlanLabelCode('plus')).toBe('plus');
    expect(toPlanLabelCode('pro')).toBe('pro');
    expect(toPlanCodeFromLabel('plus')).toBe('plus');
    expect(toPlanCodeFromLabel('pro')).toBe('pro');
  });

  it('returns expected free-plan guard and display names', () => {
    expect(isFreePlan('free')).toBe(true);
    expect(isFreePlan('plus')).toBe(false);
    expect(getPlanDisplayName('free')).toBe('Starter');
    expect(getPlanDisplayName('plus')).toBe('Plus');
    expect(getPlanDisplayName('pro')).toBe('Pro');
  });
});
