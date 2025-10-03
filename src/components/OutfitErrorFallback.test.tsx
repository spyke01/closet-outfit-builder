import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OutfitErrorFallback } from './OutfitErrorFallback';

describe('OutfitErrorFallback', () => {
  const mockRetry = vi.fn();
  const mockShowAlternatives = vi.fn();
  const mockTryDifferentAnchor = vi.fn();

  beforeEach(() => {
    mockRetry.mockClear();
    mockShowAlternatives.mockClear();
    mockTryDifferentAnchor.mockClear();
  });

  it('renders outfit error fallback with basic error', () => {
    const error = new Error('Outfit generation failed');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByTestId('outfit-error-fallback')).toBeInTheDocument();
    expect(screen.getByText('Outfit generation failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to generate outfit combinations.')).toBeInTheDocument();
  });

  it('shows generation error message for generation errors', () => {
    const error = new Error('outfit generation timeout');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Unable to generate outfit combinations.')).toBeInTheDocument();
    expect(screen.getByText('Try selecting a different anchor item or use alternative suggestions.')).toBeInTheDocument();
  });

  it('shows wardrobe error message for wardrobe errors', () => {
    const error = new Error('wardrobe items not found');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Unable to load wardrobe items.')).toBeInTheDocument();
    expect(screen.getByText('Try refreshing the page to reload your wardrobe items.')).toBeInTheDocument();
  });

  it('shows scoring error message for scoring errors', () => {
    const error = new Error('compatibility scoring failed');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Unable to calculate outfit compatibility scores.')).toBeInTheDocument();
  });

  it('calls retry function when retry button is clicked', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    const retryButton = screen.getByText('Retry Generation');
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('disables retry button after max retries', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={3}
      />
    );

    const retryButton = screen.getByText('Retry Generation');
    expect(retryButton).toBeDisabled();
  });

  it('shows retry count when retries have been attempted', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={1}
      />
    );

    expect(screen.getByText('Retry attempt 1')).toBeInTheDocument();
  });

  it('shows alternatives button when alternatives are available', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        hasAlternatives={true}
        onShowAlternatives={mockShowAlternatives}
      />
    );

    const alternativesButton = screen.getByText('Show Alternatives');
    expect(alternativesButton).toBeInTheDocument();
    
    fireEvent.click(alternativesButton);
    expect(mockShowAlternatives).toHaveBeenCalledTimes(1);
  });

  it('does not show alternatives button when no alternatives available', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        hasAlternatives={false}
      />
    );

    expect(screen.queryByText('Show Alternatives')).not.toBeInTheDocument();
  });

  it('calls try different anchor function when button is clicked', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        onTryDifferentAnchor={mockTryDifferentAnchor}
      />
    );

    const differentAnchorButton = screen.getByText('Try Different Item');
    fireEvent.click(differentAnchorButton);

    expect(mockTryDifferentAnchor).toHaveBeenCalledTimes(1);
  });

  it('dispatches reset outfit generation event', () => {
    const error = new Error('generation error');
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    const startOverButton = screen.getByText('Start Over');
    fireEvent.click(startOverButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resetOutfitGeneration'
      })
    );

    dispatchEventSpy.mockRestore();
  });

  it('has proper accessibility attributes', () => {
    const error = new Error('test error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    const fallback = screen.getByTestId('outfit-error-fallback');
    expect(fallback).toHaveAttribute('role', 'alert');
  });

  it('renders appropriate icons for different actions', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        hasAlternatives={true}
        onShowAlternatives={mockShowAlternatives}
        onTryDifferentAnchor={mockTryDifferentAnchor}
      />
    );

    // Check that buttons are rendered with appropriate text
    expect(screen.getByText('Retry Generation')).toBeInTheDocument();
    expect(screen.getByText('Show Alternatives')).toBeInTheDocument();
    expect(screen.getByText('Try Different Item')).toBeInTheDocument();
    expect(screen.getByText('Start Over')).toBeInTheDocument();
  });

  it('handles missing callback props gracefully', () => {
    const error = new Error('generation error');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
        hasAlternatives={true}
        // onShowAlternatives and onTryDifferentAnchor not provided
      />
    );

    const alternativesButton = screen.getByText('Show Alternatives');
    const differentAnchorButton = screen.getByText('Try Different Item');
    
    fireEvent.click(alternativesButton);
    fireEvent.click(differentAnchorButton);

    // Should not throw errors
    expect(true).toBe(true);
  });

  it('shows default error message for unknown error types', () => {
    const error = new Error('unknown error type');
    
    render(
      <OutfitErrorFallback
        error={error}
        errorInfo={null}
        retry={mockRetry}
        retryCount={0}
      />
    );

    expect(screen.getByText('Outfit generation failed.')).toBeInTheDocument();
    expect(screen.getByText('You can try again or explore alternative outfit suggestions.')).toBeInTheDocument();
  });
});