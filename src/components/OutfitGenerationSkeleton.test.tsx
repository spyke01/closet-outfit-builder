import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OutfitGenerationSkeleton } from './OutfitGenerationSkeleton';

describe('OutfitGenerationSkeleton', () => {
  it('renders outfit generation skeleton with default count', () => {
    render(<OutfitGenerationSkeleton />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading outfit suggestions');
  });

  it('renders correct number of skeleton items', () => {
    const count = 4;
    render(<OutfitGenerationSkeleton count={count} />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    const skeletonItems = skeleton.querySelectorAll('.animate-pulse');
    expect(skeletonItems).toHaveLength(count);
  });

  it('applies custom className', () => {
    const customClass = 'custom-outfit-skeleton';
    render(<OutfitGenerationSkeleton className={customClass} />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    expect(skeleton).toHaveClass(customClass);
  });

  it('has proper grid layout classes', () => {
    render(<OutfitGenerationSkeleton />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    expect(skeleton).toHaveClass('grid');
    expect(skeleton).toHaveClass('grid-cols-1');
    expect(skeleton).toHaveClass('md:grid-cols-2');
    expect(skeleton).toHaveClass('lg:grid-cols-3');
    expect(skeleton).toHaveClass('gap-4');
  });

  it('renders skeleton elements for each outfit item', () => {
    const count = 3;
    render(<OutfitGenerationSkeleton count={count} />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    
    // Image skeletons
    const imageSkeletons = skeleton.querySelectorAll('.h-64.mb-3');
    expect(imageSkeletons).toHaveLength(count);
    
    // Title skeletons
    const titleSkeletons = skeleton.querySelectorAll('.h-4.bg-gray-300');
    expect(titleSkeletons.length).toBeGreaterThanOrEqual(count);
    
    // Description skeletons
    const descSkeletons = skeleton.querySelectorAll('.h-3.bg-gray-300');
    expect(descSkeletons.length).toBeGreaterThanOrEqual(count);
  });

  it('includes shimmer effect elements', () => {
    render(<OutfitGenerationSkeleton count={2} />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    const shimmerElements = skeleton.querySelectorAll('.animate-shimmer');
    expect(shimmerElements).toHaveLength(2); // One per outfit item
  });

  it('renders score skeleton elements', () => {
    render(<OutfitGenerationSkeleton count={2} />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    const scoreCircles = skeleton.querySelectorAll('.w-6.h-6.bg-gray-300');
    expect(scoreCircles).toHaveLength(2); // One per outfit item
  });

  it('handles zero count gracefully', () => {
    render(<OutfitGenerationSkeleton count={0} />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    const skeletonItems = skeleton.querySelectorAll('.animate-pulse');
    expect(skeletonItems).toHaveLength(0);
  });

  it('has proper accessibility attributes', () => {
    render(<OutfitGenerationSkeleton />);
    
    const skeleton = screen.getByTestId('outfit-generation-skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading outfit suggestions');
  });
});