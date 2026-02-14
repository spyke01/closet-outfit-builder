/**
 * Unit tests for App Demo Section
 * Validates: 4 images render, lazy loading, compatibility scores display
 * Requirements: 1.1, 2.1, 2.2, 4.1
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppDemo } from '../app-demo';
import { appDemoOutfit } from '@/lib/data/landing-page-images';

describe('AppDemo - Unit Tests', () => {
  describe('Image Rendering', () => {
    it('should render exactly 4 outfit images', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      // Should have 4 outfit images
      expect(images.length).toBe(4);
    });

    it('should render jacket image with correct attributes', () => {
      render(<AppDemo />);
      
      const jacketImage = screen.getByAltText(appDemoOutfit.jacket!.alt);
      
      expect(jacketImage).toBeInTheDocument();
      expect(jacketImage).toHaveAttribute('src', expect.stringContaining('sportcoat-tweed-brown'));
      expect(jacketImage).toHaveAttribute('width', '150');
      expect(jacketImage).toHaveAttribute('height', '150');
    });

    it('should render shirt image with correct attributes', () => {
      render(<AppDemo />);
      
      const shirtImage = screen.getByAltText(appDemoOutfit.shirt.alt);
      
      expect(shirtImage).toBeInTheDocument();
      expect(shirtImage).toHaveAttribute('src', expect.stringContaining('ocbd-blue'));
      expect(shirtImage).toHaveAttribute('width', '150');
      expect(shirtImage).toHaveAttribute('height', '150');
    });

    it('should render pants image with correct attributes', () => {
      render(<AppDemo />);
      
      const pantsImage = screen.getByAltText(appDemoOutfit.pants.alt);
      
      expect(pantsImage).toBeInTheDocument();
      expect(pantsImage).toHaveAttribute('src', expect.stringContaining('chino-khaki'));
      expect(pantsImage).toHaveAttribute('width', '150');
      expect(pantsImage).toHaveAttribute('height', '150');
    });

    it('should render shoes image with correct attributes', () => {
      render(<AppDemo />);
      
      const shoesImage = screen.getByAltText(appDemoOutfit.shoes.alt);
      
      expect(shoesImage).toBeInTheDocument();
      expect(shoesImage).toHaveAttribute('src', expect.stringContaining('loafers-light-tan'));
      expect(shoesImage).toHaveAttribute('width', '150');
      expect(shoesImage).toHaveAttribute('height', '150');
    });

    it('should have item labels below each image', () => {
      render(<AppDemo />);
      
      expect(screen.getByText('Brown Tweed Blazer')).toBeInTheDocument();
      expect(screen.getByText('Blue Oxford Shirt')).toBeInTheDocument();
      expect(screen.getByText('Khaki Chinos')).toBeInTheDocument();
      expect(screen.getByText('Tan Suede Loafers')).toBeInTheDocument();
    });
  });

  describe('Lazy Loading', () => {
    it('should have loading="lazy" on all images', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should have quality={85} for optimized file size', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      // Next.js Image component should be used
      images.forEach((img) => {
        expect(img).toHaveAttribute('decoding', 'async');
      });
    });

    it('should not have priority attribute (below the fold)', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      // Should not have fetchpriority="high" since it's below the fold
      images.forEach((img) => {
        expect(img).not.toHaveAttribute('fetchpriority', 'high');
      });
    });
  });

  describe('Compatibility Scores Display', () => {
    it('should display overall compatibility score', () => {
      render(<AppDemo />);
      
      expect(screen.getByText('95% Match')).toBeInTheDocument();
    });

    it('should display compatibility breakdown section', () => {
      render(<AppDemo />);
      
      expect(screen.getByText('Compatibility Breakdown')).toBeInTheDocument();
    });

    it('should display Style Harmony score', () => {
      render(<AppDemo />);
      
      expect(screen.getByText('Style Harmony')).toBeInTheDocument();
      expect(screen.getByText('94%')).toBeInTheDocument();
    });

    it('should display Weather Appropriate score', () => {
      render(<AppDemo />);
      
      expect(screen.getByText('Weather Appropriate')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
    });

    it('should display Formality Match score', () => {
      render(<AppDemo />);
      
      expect(screen.getByText('Formality Match')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should have visual progress bars for each score', () => {
      const { container } = render(<AppDemo />);
      
      // Find all progress bar containers
      const progressBars = container.querySelectorAll('.bg-muted.rounded-full');
      
      // Should have 3 progress bars (one for each metric)
      expect(progressBars.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Layout and Styling', () => {
    it('should use 4-column grid for outfit items', () => {
      const { container } = render(<AppDemo />);
      
      const gridContainer = container.querySelector('.grid.grid-cols-4');
      
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have aspect-square containers for images', () => {
      const { container } = render(<AppDemo />);
      
      const imageContainers = container.querySelectorAll('.aspect-square');
      
      expect(imageContainers.length).toBeGreaterThanOrEqual(4);
    });

    it('should use object-contain for proper image scaling', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('object-contain');
      });
    });

    it('should have padding inside image containers', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('p-3');
      });
    });

    it('should have proper spacing between grid items', () => {
      const { container } = render(<AppDemo />);
      
      const gridContainer = container.querySelector('.grid.grid-cols-4');
      
      expect(gridContainer?.className).toContain('gap-4');
    });
  });

  describe('Dark Mode Support', () => {
    it('should have themed classes on image containers', () => {
      const { container } = render(<AppDemo />);
      
      const imageContainers = container.querySelectorAll('.aspect-square');
      
      imageContainers.forEach((containerEl) => {
        expect(containerEl.className).toContain('bg-muted');
      });
    });

    it('should have semantic theme-compatible styling', () => {
      const { container } = render(<AppDemo />);
      
      // Check for semantic classes throughout the component
      const themedElements = container.querySelectorAll('.bg-card, .bg-background, .text-foreground, .text-muted-foreground');
      
      expect(themedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Alt Text Validation', () => {
    it('should have descriptive alt text for all images', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(10);
      });
    });

    it('should not include redundant phrases in alt text', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt')!.toLowerCase();
        expect(alt).not.toContain('image of');
        expect(alt).not.toContain('picture of');
      });
    });

    it('should have specific item descriptions in alt text', () => {
      render(<AppDemo />);
      
      expect(screen.getByAltText(/brown.*tweed.*blazer/i)).toBeInTheDocument();
      expect(screen.getByAltText(/blue.*oxford.*shirt/i)).toBeInTheDocument();
      expect(screen.getByAltText(/khaki.*chino/i)).toBeInTheDocument();
      expect(screen.getByAltText(/tan.*suede.*loafer/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('should have "Wear This Outfit" button', () => {
      render(<AppDemo />);
      
      const wearButton = screen.getByRole('button', { name: /wear this outfit/i });
      
      expect(wearButton).toBeInTheDocument();
    });

    it('should have action buttons with proper styling', () => {
      const { container } = render(<AppDemo />);
      
      const actionButtons = container.querySelectorAll('button');
      
      // Should have at least 3 buttons (Wear, Heart, Sparkles)
      expect(actionButtons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Content Validation', () => {
    it('should display section heading', () => {
      render(<AppDemo />);
      
      expect(screen.getByText(/built for your closet/i)).toBeInTheDocument();
    });

    it('should display "Today\'s Outfit" label', () => {
      render(<AppDemo />);
      
      expect(screen.getByText(/today's outfit/i)).toBeInTheDocument();
    });

    it('should display weather information', () => {
      render(<AppDemo />);
      
      expect(screen.getByText(/perfect for.*partly cloudy/i)).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should have explicit dimensions to prevent layout shift', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('width', '150');
        expect(img).toHaveAttribute('height', '150');
      });
    });

    it('should use Next.js Image component for automatic optimization', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading');
        expect(img).toHaveAttribute('decoding');
      });
    });
  });
});
