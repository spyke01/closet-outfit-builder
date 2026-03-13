/**
 * Type definitions for the new user walkthrough coach mark system
 */

export interface WalkthroughStep {
  targetId: string;
  title: string;
  body: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface WalkthroughState {
  currentStep: number | null;
  isActive: boolean;
  completed: boolean;
}
