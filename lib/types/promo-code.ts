/**
 * Type definitions for the promotional code system
 */

export interface PromoCode {
  id: string;
  code: string;
  stripeCouponId: string;
  discountPercent: number;
  durationMonths: number;
  maxRedemptions: number;
  currentRedemptions: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface CodeRedemption {
  id: string;
  codeId: string;
  userId: string;
  stripeSubscriptionId: string | null;
  redeemedAt: string;
}

export type PromoCodeInvalidReason =
  | 'not_found'
  | 'expired'
  | 'exhausted'
  | 'already_used'
  | 'yearly_not_eligible';

export type PromoCodeValidationResult =
  | {
      valid: true;
      discountPercent: number;
      durationMonths: number;
      fullPriceCents: number;
      discountedPriceCents: number;
      promoCodeDbId: string;
      message?: string;
    }
  | {
      valid: false;
      reason: PromoCodeInvalidReason;
      message: string;
    };
