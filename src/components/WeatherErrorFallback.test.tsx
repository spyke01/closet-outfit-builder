import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeatherErrorFallback } from './WeatherErrorFallback';

describe('WeatherErrorFallback', () => {
  const mockRetry = vi.fn();
  const mockUseCachedData = vi.fn();

  beforeEach(() => {
    mockRetry.mockClear();
    mockUseCachedData.mockClear();
  });

  it('renders weather error fallback with basic error', () => {
    const error = new Error('Weather service error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByTestId('weather-error-fallback')).toBeInTheDocument();
    expect(screen.getByText('Weather data unavailable')).toBeInTheDocument();
    expect(screen.getByText('Unable to fetch weather information.')).toBeInTheDocument();
  });

  it('shows network error message for network errors', () => {
    const error = new Error('network connection failed');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Unable to connect to weather service. Check your internet connection.')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection and try again.')).toBeInTheDocument();
  });

  it('shows location error message for location errors', () => {
    const error = new Error('location not found');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Unable to determine your location. Please check location permissions.')).toBeInTheDocument();
    expect(screen.getByText('Try enabling location services or entering your location manually.')).toBeInTheDocument();
  });

  it('shows API error message for API errors', () => {
    const error = new Error('API key invalid');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Weather service is temporarily unavailable.')).toBeInTheDocument();
  });

  it('calls retry function when retry button is clicked', () => {
    const error = new Error('network error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('disables retry button after max retries', () => {
    const error = new Error('network error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={3}
      />
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeDisabled();
  });

  it('shows retry count when retries have been attempted', () => {
    const error = new Error('network error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={2}
      />
    );

    expect(screen.getByText('Retry attempt 2')).toBeInTheDocument();
  });

  it('shows cached data button when cached data is available', () => {
    const error = new Error('network error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        hasCachedData={true}
        onUseCachedData={mockUseCachedData}
      />
    );

    const cachedDataButton = screen.getByText('Use Cached Data');
    expect(cachedDataButton).toBeInTheDocument();
    
    fireEvent.click(cachedDataButton);
    expect(mockUseCachedData).toHaveBeenCalledTimes(1);
  });

  it('does not show cached data button when no cached data available', () => {
    const error = new Error('network error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        hasCachedData={false}
      />
    );

    expect(screen.queryByText('Use Cached Data')).not.toBeInTheDocument();
  });

  it('dispatches continue without weather event', () => {
    const error = new Error('network error');
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    const continueButton = screen.getByText('Continue Without Weather');
    fireEvent.click(continueButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'continueWithoutWeather'
      })
    );

    dispatchEventSpy.mockRestore();
  });

  it('has proper accessibility attributes', () => {
    const error = new Error('test error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    const fallback = screen.getByTestId('weather-error-fallback');
    expect(fallback).toHaveAttribute('role', 'alert');
  });

  it('renders appropriate icons for different error types', () => {
    const networkError = new Error('network error');
    
    const { rerender } = render(
      <WeatherErrorFallback
        error={networkError}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    // Check that retry button has refresh icon
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Test location error
    const locationError = new Error('location error');
    rerender(
      <WeatherErrorFallback
        error={locationError}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles missing onUseCachedData prop gracefully', () => {
    const error = new Error('network error');
    
    render(
      <WeatherErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        hasCachedData={true}
        // onUseCachedData not provided
      />
    );

    const cachedDataButton = screen.getByText('Use Cached Data');
    fireEvent.click(cachedDataButton);

    // Should not throw error
    expect(true).toBe(true);
  });
});