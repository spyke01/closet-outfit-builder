import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PlanSelector } from '@/components/billing/plan-selector';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('PlanSelector', () => {
  it('uses Starter wording for public free-tier CTA', () => {
    render(
      <PlanSelector
        context="public"
        isAuthenticated={false}
      />
    );

    expect(screen.getByRole('link', { name: /start starter/i })).toBeInTheDocument();
    expect(screen.queryByText(/start free/i)).not.toBeInTheDocument();
  });

  it('uses Starter wording for billing free-tier switch action', () => {
    render(
      <PlanSelector
        context="billing"
        isAuthenticated={true}
        currentPlanCode="plus"
        onSwitchToFree={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /switch to starter/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch to free/i })).not.toBeInTheDocument();
  });
});
