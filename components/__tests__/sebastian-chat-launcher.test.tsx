import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SebastianChatLauncher } from '../sebastian-chat-launcher';

vi.mock('@/components/sebastian-avatar', () => ({
  SebastianAvatar: ({ className }: { className?: string }) => (
    <div data-testid="sebastian-avatar" className={className}>S</div>
  ),
}));

describe('SebastianChatLauncher', () => {
  it('renders floating trigger styles in floating variant', () => {
    render(<SebastianChatLauncher variant="floating" />);

    const button = screen.getByRole('button', { name: 'Ask Sebastian' });
    expect(button.className).toContain('fixed');
    expect(button.className).toContain('dark:bg-[#111A20]');
    expect(button.className).toContain('dark:text-white');
  });

  it('opens and closes chat dialog from floating trigger', () => {
    render(<SebastianChatLauncher variant="floating" />);

    fireEvent.click(screen.getByRole('button', { name: 'Ask Sebastian' }));
    expect(screen.getByRole('dialog', { name: 'Sebastian chat' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(screen.queryByRole('dialog', { name: 'Sebastian chat' })).not.toBeInTheDocument();
  });
});
