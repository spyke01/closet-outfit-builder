import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnhancedWeatherWidget } from './EnhancedWeatherWidget';

// Mock the OptimisticWeatherWidget
vi.mock('./OptimisticWeatherWidget', () => ({
  OptimisticWeatherWidget: ({ location, className, autoLoad }: any) => (
    <div data-testid="optimistic-weather-widget">
      <span>Location: {location}</span>
      <span>ClassName: {className}</span>
      <span>AutoLoad: {autoLoad.toString()}</span>
    </div>
  )
}));

// Mock the SuspenseErrorBoundary
vi.mock('./SuspenseErrorBoundary', () => ({
  WeatherSuspenseBoundary: ({ children, className, onError, onRetry, resetKeys }: any) => (
    <div data-testid="weather-suspense-boundary">
      <span>ClassName: {className}</span>
      <span>ResetKeys: {resetKeys?.join(',')}</span>
      {children}
    </div>
  )
}));

describe('EnhancedWeatherWidget', () => {
  it('renders with default props', () => {
    render(<EnhancedWeatherWidget />);

    expect(screen.getByTestId('weather-suspense-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('optimistic-weather-widget')).toBeInTheDocument();
    expect(screen.getByText('Location: New York, NY')).toBeInTheDocument();
    expect(screen.getByText('AutoLoad: true')).toBeInTheDocument();
  });

  it('passes location prop correctly', () => {
    render(<EnhancedWeatherWidget location="Miami, FL" />);

    expect(screen.getByText('Location: Miami, FL')).toBeInTheDocument();
  });

  it('passes className prop correctly', () => {
    const customClass = 'custom-weather-class';
    render(<EnhancedWeatherWidget className={customClass} />);

    expect(screen.getAllByText(`ClassName: ${customClass}`)).toHaveLength(2);
  });

  it('passes autoLoad prop correctly', () => {
    render(<EnhancedWeatherWidget autoLoad={false} />);

    expect(screen.getByText('AutoLoad: false')).toBeInTheDocument();
  });

  it('sets resetKeys based on location', () => {
    render(<EnhancedWeatherWidget location="Chicago, IL" />);

    expect(screen.getByText('ResetKeys: Chicago, IL')).toBeInTheDocument();
  });

  it('updates resetKeys when location changes', () => {
    const { rerender } = render(<EnhancedWeatherWidget location="Boston, MA" />);
    
    expect(screen.getByText('ResetKeys: Boston, MA')).toBeInTheDocument();

    rerender(<EnhancedWeatherWidget location="Seattle, WA" />);
    
    expect(screen.getByText('ResetKeys: Seattle, WA')).toBeInTheDocument();
  });

  it('handles error callback', () => {
    const onError = vi.fn();
    
    render(<EnhancedWeatherWidget onError={onError} />);

    // The component should render without calling onError initially
    expect(screen.getByTestId('weather-suspense-boundary')).toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });

  it('handles retry callback', () => {
    const onRetry = vi.fn();
    
    render(<EnhancedWeatherWidget onRetry={onRetry} />);

    // The component should render without calling onRetry initially
    expect(screen.getByTestId('weather-suspense-boundary')).toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('passes all props to underlying components', () => {
    const props = {
      location: 'Denver, CO',
      className: 'test-class',
      autoLoad: false,
      onError: vi.fn(),
      onRetry: vi.fn()
    };

    render(<EnhancedWeatherWidget {...props} />);

    expect(screen.getByText('Location: Denver, CO')).toBeInTheDocument();
    expect(screen.getAllByText('ClassName: test-class')).toHaveLength(2);
    expect(screen.getByText('AutoLoad: false')).toBeInTheDocument();
    expect(screen.getByText('ResetKeys: Denver, CO')).toBeInTheDocument();
  });
});