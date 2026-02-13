import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedIcon, SpinningIcon, PulsingIcon } from '../animated-icon';

describe('AnimatedIcon', () => {
  it('should render children', () => {
    render(
      <AnimatedIcon>
        <div data-testid="icon">Icon</div>
      </AnimatedIcon>
    );
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should apply animation class when isAnimating is true', () => {
    const { container } = render(
      <AnimatedIcon animation="animate-spin" isAnimating={true}>
        <div>Icon</div>
      </AnimatedIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-spin');
  });

  it('should not apply animation class when isAnimating is false', () => {
    const { container } = render(
      <AnimatedIcon animation="animate-spin" isAnimating={false}>
        <div>Icon</div>
      </AnimatedIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('animate-spin');
  });

  it('should apply hardware acceleration styles by default', () => {
    const { container } = render(
      <AnimatedIcon animation="animate-spin">
        <div>Icon</div>
      </AnimatedIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.willChange).toBe('transform');
    expect(wrapper.style.transform).toBe('translateZ(0)');
  });

  it('should not apply hardware acceleration when disabled', () => {
    const { container } = render(
      <AnimatedIcon animation="animate-spin" enableHardwareAcceleration={false}>
        <div>Icon</div>
      </AnimatedIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.willChange).toBe('');
    expect(wrapper.style.transform).toBe('');
  });

  it('should combine animation and additional classes', () => {
    const { container } = render(
      <AnimatedIcon animation="animate-spin" className="text-primary">
        <div>Icon</div>
      </AnimatedIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-spin');
    expect(wrapper.className).toContain('text-primary');
  });

  it('should have aria-hidden attribute', () => {
    const { container } = render(
      <AnimatedIcon>
        <div>Icon</div>
      </AnimatedIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('SpinningIcon', () => {
  it('should render with spin animation', () => {
    const { container } = render(
      <SpinningIcon>
        <div data-testid="icon">Icon</div>
      </SpinningIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-spin');
  });

  it('should not spin when isSpinning is false', () => {
    const { container } = render(
      <SpinningIcon isSpinning={false}>
        <div>Icon</div>
      </SpinningIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('animate-spin');
  });
});

describe('PulsingIcon', () => {
  it('should render with pulse animation', () => {
    const { container } = render(
      <PulsingIcon>
        <div data-testid="icon">Icon</div>
      </PulsingIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-pulse');
  });

  it('should not pulse when isPulsing is false', () => {
    const { container } = render(
      <PulsingIcon isPulsing={false}>
        <div>Icon</div>
      </PulsingIcon>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('animate-pulse');
  });
});
