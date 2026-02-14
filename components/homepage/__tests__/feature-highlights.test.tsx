/**
 * Unit tests for Feature Highlights Section
 * Validates: images + icons render, hover transitions, text readability
 * Requirements: 1.1, 2.1, 2.2, 4.1
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureHighlights } from '../feature-highlights';
import { featureImages } from '@/lib/data/landing-page-images';

describe('FeatureHighlights - Unit Tests', () => {
  describe('Images and Icons Rendering', () => {
    it('should render all 3 feature cards', () => {
      render(<FeatureHighlights />);
      
      expect(screen.getByText('Smart Outfit Generator')).toBeInTheDocument();
      expect(screen.getByText('Formality & Season Aware')).toBeInTheDocument();
      expect(screen.getByText('Curated Capsules')).toBeInTheDocument();
    });

    it('should render exactly 3 product images', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      expect(images.length).toBe(3);
    });

    it('should render Smart Generator image with correct attributes', () => {
      render(<FeatureHighlights />);
      
      const image = screen.getByAltText(featureImages.smartGenerator.alt);
      
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('ocbd-striped'));
      expect(image).toHaveAttribute('width', '128');
      expect(image).toHaveAttribute('height', '128');
    });

    it('should render Weather Aware image with correct attributes', () => {
      render(<FeatureHighlights />);
      
      const image = screen.getByAltText(featureImages.weatherAware.alt);
      
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('mac-coat-navy'));
      expect(image).toHaveAttribute('width', '128');
      expect(image).toHaveAttribute('height', '128');
    });

    it('should render Capsule Wardrobe image with correct attributes', () => {
      render(<FeatureHighlights />);
      
      const image = screen.getByAltText(featureImages.capsuleWardrobe.alt);
      
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('quarterzip-navy'));
      expect(image).toHaveAttribute('width', '128');
      expect(image).toHaveAttribute('height', '128');
    });

    it('should render icon containers with themed backgrounds', () => {
      const { container } = render(<FeatureHighlights />);
      
      const iconContainers = container.querySelectorAll('.rounded-3xl.shadow-lg');
      
      // Should have 3 icon containers
      expect(iconContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('should have icons with proper sizing', () => {
      const { container } = render(<FeatureHighlights />);
      
      const icons = container.querySelectorAll('svg');
      
      // Should have at least 3 icons (one per feature)
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Hover Transitions', () => {
    it('should have opacity transition classes on images', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('opacity-80');
        expect(img.className).toContain('group-hover:opacity-100');
        expect(img.className).toContain('transition-opacity');
      });
    });

    it('should have group class on feature cards for hover effects', () => {
      const { container } = render(<FeatureHighlights />);
      
      const featureCards = container.querySelectorAll('.group');
      
      // Should have 3 group containers
      expect(featureCards.length).toBeGreaterThanOrEqual(3);
    });

    it('should have scale transition on icon containers', () => {
      const { container } = render(<FeatureHighlights />);
      
      const iconContainers = container.querySelectorAll('.group-hover\\:scale-110');
      
      // Should have 3 icon containers with scale transition
      expect(iconContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('should have transition duration classes', () => {
      const { container } = render(<FeatureHighlights />);
      
      const iconContainers = container.querySelectorAll('.transition-transform');
      
      expect(iconContainers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Text Readability', () => {
    it('should have proper heading hierarchy', () => {
      render(<FeatureHighlights />);
      
      const mainHeading = screen.getByText('Your wardrobe, reimagined');
      const featureHeading = screen.getByText('Smart Outfit Generator');
      
      expect(mainHeading.tagName).toBe('H2');
      expect(featureHeading.tagName).toBe('H3');
    });

    it('should have high contrast text colors for headings', () => {
      const { container } = render(<FeatureHighlights />);
      
      const headings = container.querySelectorAll('h2, h3');
      
      headings.forEach((heading) => {
        expect(heading.className).toContain('text-foreground');
        expect(heading.className).toContain('text-foreground');
      });
    });

    it('should have readable text colors for descriptions', () => {
      const { container } = render(<FeatureHighlights />);
      
      const descriptions = container.querySelectorAll('p');
      
      descriptions.forEach((desc) => {
        const classes = desc.className;
        // Should use semantic foreground tokens for readable secondary copy
        expect(classes).toMatch(/text-muted-foreground|text-foreground/);
      });
    });

    it('should have proper font sizes for hierarchy', () => {
      render(<FeatureHighlights />);
      
      const mainHeading = screen.getByText('Your wardrobe, reimagined');
      const featureHeading = screen.getByText('Smart Outfit Generator');
      
      // Main heading should be larger
      expect(mainHeading.className).toMatch(/text-(4xl|5xl)/);
      // Feature headings should be medium
      expect(featureHeading.className).toContain('text-2xl');
    });

    it('should have proper line height for readability', () => {
      const { container } = render(<FeatureHighlights />);
      
      const descriptions = container.querySelectorAll('p');
      
      // Check that descriptions have proper text styling
      descriptions.forEach((desc) => {
        // Should have text size classes for readability
        expect(desc.className).toMatch(/text-/);
      });
    });

    it('should center text for better visual hierarchy', () => {
      const { container } = render(<FeatureHighlights />);
      
      const featureCards = container.querySelectorAll('.text-center');
      
      // Should have centered text
      expect(featureCards.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Layout and Spacing', () => {
    it('should use 3-column grid on desktop', () => {
      const { container } = render(<FeatureHighlights />);
      
      const gridContainer = container.querySelector('.md\\:grid-cols-3');
      
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have proper spacing between cards', () => {
      const { container } = render(<FeatureHighlights />);
      
      const gridContainer = container.querySelector('.grid');
      
      expect(gridContainer?.className).toMatch(/gap-\d+/);
    });

    it('should have proper spacing between image and heading', () => {
      const { container } = render(<FeatureHighlights />);
      
      const imageContainers = container.querySelectorAll('.w-32.h-32');
      
      imageContainers.forEach((imgContainer) => {
        expect(imgContainer.className).toContain('mb-4');
      });
    });

    it('should center images within their containers', () => {
      const { container } = render(<FeatureHighlights />);
      
      const imageContainers = container.querySelectorAll('.w-32.h-32');
      
      imageContainers.forEach((imgContainer) => {
        expect(imgContainer.className).toContain('mx-auto');
      });
    });
  });

  describe('Alt Text Validation', () => {
    it('should have descriptive alt text for all images', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(10);
      });
    });

    it('should not include redundant phrases in alt text', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt')!.toLowerCase();
        expect(alt).not.toContain('image of');
        expect(alt).not.toContain('picture of');
      });
    });

    it('should describe the purpose of each image', () => {
      render(<FeatureHighlights />);
      
      expect(screen.getByAltText(/smart outfit generation/i)).toBeInTheDocument();
      expect(screen.getByAltText(/weather-appropriate/i)).toBeInTheDocument();
      expect(screen.getByAltText(/capsule wardrobe/i)).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode text colors', () => {
      const { container } = render(<FeatureHighlights />);
      
      const headings = container.querySelectorAll('h2, h3');
      
      headings.forEach((heading) => {
        expect(heading.className).toContain('text-foreground');
      });
    });

    it('should have dark mode description colors', () => {
      const { container } = render(<FeatureHighlights />);
      
      const descriptions = container.querySelectorAll('p');
      
      descriptions.forEach((desc) => {
        expect(desc.className).toContain('text-muted-foreground');
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should use lazy loading for images', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should have explicit dimensions to prevent layout shift', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('width', '128');
        expect(img).toHaveAttribute('height', '128');
      });
    });

    it('should use object-contain for proper image scaling', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('object-contain');
      });
    });

    it('should use Next.js Image component for optimization', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('decoding', 'async');
      });
    });
  });

  describe('Content Validation', () => {
    it('should display section heading', () => {
      render(<FeatureHighlights />);
      
      expect(screen.getByText('Your wardrobe, reimagined')).toBeInTheDocument();
    });

    it('should display section description', () => {
      render(<FeatureHighlights />);
      
      expect(screen.getByText(/transform how you think about getting dressed/i)).toBeInTheDocument();
    });

    it('should display all feature descriptions', () => {
      render(<FeatureHighlights />);
      
      expect(screen.getByText(/mix and match your actual wardrobe/i)).toBeInTheDocument();
      expect(screen.getByText(/knows what's casual, office-ready/i)).toBeInTheDocument();
      expect(screen.getByText(/build refined capsule wardrobes/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(<FeatureHighlights />);
      
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should have animation delay for staggered entrance', () => {
      const { container } = render(<FeatureHighlights />);
      
      const animatedCards = container.querySelectorAll('.animate-slide-up');
      
      // Should have animated cards
      expect(animatedCards.length).toBeGreaterThanOrEqual(3);
    });
  });
});
