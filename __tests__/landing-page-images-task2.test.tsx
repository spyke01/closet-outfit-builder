/**
 * Tests for Task 2: Feature Highlights and About Page Images
 * Validates that real wardrobe images are properly integrated
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureHighlights } from '@/components/homepage/feature-highlights';
import { featureImages } from '@/lib/data/landing-page-images';

describe('Task 2: Feature Highlights and About Page Images', () => {
  describe('featureImages configuration', () => {
    it('should have all required feature images defined', () => {
      expect(featureImages.smartGenerator).toBeDefined();
      expect(featureImages.weatherAware).toBeDefined();
      expect(featureImages.capsuleWardrobe).toBeDefined();
    });

    it('should have correct image paths', () => {
      expect(featureImages.smartGenerator.src).toBe('/images/wardrobe/ocbd-striped.png');
      expect(featureImages.weatherAware.src).toBe('/images/wardrobe/mac-coat-navy.png');
      expect(featureImages.capsuleWardrobe.src).toBe('/images/wardrobe/quarterzip-navy.png');
    });

    it('should have descriptive alt text for all images', () => {
      expect(featureImages.smartGenerator.alt).toContain('Striped Oxford shirt');
      expect(featureImages.smartGenerator.alt.length).toBeGreaterThan(10);
      
      expect(featureImages.weatherAware.alt).toContain('Navy mac coat');
      expect(featureImages.weatherAware.alt.length).toBeGreaterThan(10);
      
      expect(featureImages.capsuleWardrobe.alt).toContain('Navy quarter-zip');
      expect(featureImages.capsuleWardrobe.alt.length).toBeGreaterThan(10);
    });

    it('should have proper category and style metadata', () => {
      expect(featureImages.smartGenerator.category).toBe('shirt');
      expect(featureImages.smartGenerator.style).toBe('business-casual');
      
      expect(featureImages.weatherAware.category).toBe('jacket');
      expect(featureImages.weatherAware.style).toBe('casual');
      
      expect(featureImages.capsuleWardrobe.category).toBe('jacket');
      expect(featureImages.capsuleWardrobe.style).toBe('casual');
    });
  });

  describe('FeatureHighlights component', () => {
    it('should render all three feature cards with images', () => {
      render(<FeatureHighlights />);
      
      // Check for feature titles
      expect(screen.getByText('Smart Outfit Generator')).toBeInTheDocument();
      expect(screen.getByText('Formality & Season Aware')).toBeInTheDocument();
      expect(screen.getByText('Curated Capsules')).toBeInTheDocument();
    });

    it('should render images with correct dimensions', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      // Should have 3 images (one per feature)
      expect(images.length).toBe(3);
      
      // Check dimensions (128x128 as per spec)
      images.forEach(img => {
        expect(img).toHaveAttribute('width', '128');
        expect(img).toHaveAttribute('height', '128');
      });
    });

    it('should have descriptive alt text on all images', () => {
      render(<FeatureHighlights />);
      
      expect(screen.getByAltText(/Striped Oxford shirt/i)).toBeInTheDocument();
      expect(screen.getByAltText(/Navy mac coat/i)).toBeInTheDocument();
      expect(screen.getByAltText(/Navy quarter-zip/i)).toBeInTheDocument();
    });

    it('should apply opacity transition classes', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach(img => {
        // Check for opacity and transition classes
        expect(img.className).toContain('opacity-80');
        expect(img.className).toContain('group-hover:opacity-100');
        expect(img.className).toContain('transition-opacity');
      });
    });

    it('should use object-contain for proper image scaling', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach(img => {
        expect(img.className).toContain('object-contain');
      });
    });
  });

  describe('Image accessibility', () => {
    it('should not include redundant phrases in alt text', () => {
      const altTexts = [
        featureImages.smartGenerator.alt,
        featureImages.weatherAware.alt,
        featureImages.capsuleWardrobe.alt
      ];

      altTexts.forEach(alt => {
        expect(alt.toLowerCase()).not.toContain('image of');
        expect(alt.toLowerCase()).not.toContain('picture of');
        expect(alt.toLowerCase()).not.toContain('photo of');
      });
    });

    it('should have meaningful alt text that describes the item', () => {
      expect(featureImages.smartGenerator.alt).toMatch(/shirt/i);
      expect(featureImages.weatherAware.alt).toMatch(/coat/i);
      expect(featureImages.capsuleWardrobe.alt).toMatch(/quarter-zip/i);
    });
  });

  describe('Layout preservation', () => {
    it('should maintain existing gradient and icon elements', () => {
      render(<FeatureHighlights />);
      
      // Check that gradients are still present (via class names)
      const container = screen.getByText('Smart Outfit Generator').closest('div');
      expect(container?.parentElement?.innerHTML).toContain('bg-gradient-to-br');
    });

    it('should preserve section heading and description', () => {
      render(<FeatureHighlights />);
      
      expect(screen.getByText('Your wardrobe, reimagined')).toBeInTheDocument();
      expect(screen.getByText(/Transform how you think about getting dressed/i)).toBeInTheDocument();
    });
  });

  describe('Performance considerations', () => {
    it('should use Next.js Image component for optimization', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      // Next.js Image component adds specific attributes
      images.forEach(img => {
        // Check for Next.js Image optimization attributes
        expect(img).toHaveAttribute('loading');
        expect(img).toHaveAttribute('decoding');
      });
    });

    it('should have appropriate image dimensions to prevent layout shift', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach(img => {
        expect(img).toHaveAttribute('width');
        expect(img).toHaveAttribute('height');
      });
    });
  });
});
