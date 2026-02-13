import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  TopBarSkeleton, 
  PageContentSkeleton, 
  OutfitGridSkeleton,
  SettingsSkeleton,
  ProtectedPageSkeleton 
} from '../loading-skeleton';

describe('Loading Skeletons', () => {
  describe('TopBarSkeleton', () => {
    it('should render loading skeleton for top bar', () => {
      render(<TopBarSkeleton />);
      
      // Check for skeleton elements with animation
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have proper structure', () => {
      const { container } = render(<TopBarSkeleton />);
      
      // Should have sticky top bar structure
      const topBar = container.querySelector('.sticky');
      expect(topBar).toBeTruthy();
      expect(topBar?.classList.contains('top-0')).toBe(true);
      expect(topBar?.classList.contains('z-50')).toBe(true);
    });
  });

  describe('PageContentSkeleton', () => {
    it('should render loading skeleton for page content', () => {
      render(<PageContentSkeleton />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render grid skeleton', () => {
      const { container } = render(<PageContentSkeleton />);
      
      // Should have grid layout
      const grid = container.querySelector('.grid');
      expect(grid).toBeTruthy();
    });
  });

  describe('OutfitGridSkeleton', () => {
    it('should render loading skeleton for outfit grid', () => {
      render(<OutfitGridSkeleton />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render multiple outfit card skeletons', () => {
      const { container } = render(<OutfitGridSkeleton />);
      
      // Should have grid with multiple cards
      const grid = container.querySelector('.grid');
      expect(grid).toBeTruthy();
      
      // Should have multiple card skeletons
      const cards = container.querySelectorAll('.border');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('SettingsSkeleton', () => {
    it('should render loading skeleton for settings page', () => {
      render(<SettingsSkeleton />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render multiple settings sections', () => {
      const { container } = render(<SettingsSkeleton />);
      
      // Should have multiple section skeletons
      const sections = container.querySelectorAll('.border');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('ProtectedPageSkeleton', () => {
    it('should render loading skeleton for protected page', () => {
      render(<ProtectedPageSkeleton />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have proper layout structure', () => {
      const { container } = render(<ProtectedPageSkeleton />);
      
      // Should have flex column layout
      const layout = container.querySelector('.flex-col');
      expect(layout).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations in TopBarSkeleton', () => {
      const { container } = render(<TopBarSkeleton />);
      
      // Skeleton should not have interactive elements
      const buttons = container.querySelectorAll('button');
      const links = container.querySelectorAll('a');
      expect(buttons.length).toBe(0);
      expect(links.length).toBe(0);
    });

    it('should not have accessibility violations in PageContentSkeleton', () => {
      const { container } = render(<PageContentSkeleton />);
      
      // Skeleton should not have interactive elements
      const buttons = container.querySelectorAll('button');
      const links = container.querySelectorAll('a');
      expect(buttons.length).toBe(0);
      expect(links.length).toBe(0);
    });
  });

  describe('Visual Consistency', () => {
    it('should use consistent animation classes', () => {
      const { container: topBar } = render(<TopBarSkeleton />);
      const { container: content } = render(<PageContentSkeleton />);
      const { container: outfits } = render(<OutfitGridSkeleton />);
      
      // All should use animate-pulse
      expect(topBar.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
      expect(content.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
      expect(outfits.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('should use consistent color scheme', () => {
      const { container } = render(<PageContentSkeleton />);
      
      // Should use slate colors for dark mode support
      const skeletons = container.querySelectorAll('.bg-muted, .dark\\:bg-card');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
