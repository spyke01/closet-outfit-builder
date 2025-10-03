import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WeatherSkeleton } from './WeatherSkeleton';

describe('WeatherSkeleton', () => {
  it('renders weather skeleton with proper structure', () => {
    render(<WeatherSkeleton />);
    
    const skeleton = screen.getByTestId('weather-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading weather data');
  });

  it('applies custom className', () => {
    const customClass = 'custom-weather-skeleton';
    render(<WeatherSkeleton className={customClass} />);
    
    const skeleton = screen.getByTestId('weather-skeleton');
    expect(skeleton).toHaveClass(customClass);
  });

  it('has proper accessibility attributes', () => {
    render(<WeatherSkeleton />);
    
    const skeleton = screen.getByTestId('weather-skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading weather data');
  });

  it('renders with default styling classes', () => {
    render(<WeatherSkeleton />);
    
    const skeleton = screen.getByTestId('weather-skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('bg-blue-50/80');
    expect(skeleton).toHaveClass('dark:bg-blue-950/80');
    expect(skeleton).toHaveClass('backdrop-blur-sm');
    expect(skeleton).toHaveClass('rounded-lg');
  });

  it('renders forecast skeleton elements', () => {
    render(<WeatherSkeleton />);
    
    // Should have 3 forecast day skeletons
    const skeleton = screen.getByTestId('weather-skeleton');
    const forecastSkeletons = skeleton.querySelectorAll('.flex-1.text-center');
    expect(forecastSkeletons).toHaveLength(3);
  });

  it('renders main weather info skeleton elements', () => {
    render(<WeatherSkeleton />);
    
    const skeleton = screen.getByTestId('weather-skeleton');
    
    // Weather icon skeleton
    const iconSkeleton = skeleton.querySelector('.w-12.h-12.bg-gray-300');
    expect(iconSkeleton).toBeInTheDocument();
    
    // Text skeletons
    const textSkeletons = skeleton.querySelectorAll('.bg-gray-300.dark\\:bg-gray-600.rounded');
    expect(textSkeletons.length).toBeGreaterThan(0);
  });
});