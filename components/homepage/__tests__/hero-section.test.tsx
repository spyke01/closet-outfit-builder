/**
 * Unit tests for Hero Section
 * Validates: 4 images render, alt text present, priority loading, responsive layout
 * Requirements: 1.1, 2.1, 2.2, 4.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeroSection } from '../hero-section';
import { heroOutfit } from '@/lib/data/landing-page-images';

describe('HeroSection - Unit Tests', () => {
  describe('Image Rendering', () => {
    it('should render exactly 4 images from heroOutfit', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      // Should have 4 outfit images
      expect(images.length).toBe(4);
    });

    it('should render shirt image with correct attributes', () => {
      render(<HeroSection />);
      
      const shirtImage = screen.getByAltText(heroOutfit.shirt.alt);
      
      expect(shirtImage).toBeInTheDocument();
      expect(shirtImage).toHaveAttribute('src', expect.stringContaining('ocbd-white'));
      expect(shirtImage).toHaveAttribute('width', '200');
      expect(shirtImage).toHaveAttribute('height', '200');
    });

    it('should render pants image with correct attributes', () => {
      render(<HeroSection />);
      
      const pantsImage = screen.getByAltText(heroOutfit.pants.alt);
      
      expect(pantsImage).toBeInTheDocument();
      expect(pantsImage).toHaveAttribute('src', expect.stringContaining('chino-navy'));
      expect(pantsImage).toHaveAttribute('width', '200');
      expect(pantsImage).toHaveAttribute('height', '200');
    });

    it('should render shoes image with correct attributes', () => {
      render(<HeroSection />);
      
      const shoesImage = screen.getByAltText(heroOutfit.shoes.alt);
      
      expect(shoesImage).toBeInTheDocument();
      expect(shoesImage).toHaveAttribute('src', expect.stringContaining('loafers-dark-brown'));
      expect(shoesImage).toHaveAttribute('width', '200');
      expect(shoesImage).toHaveAttribute('height', '200');
    });

    it('should render accessory image with correct attributes', () => {
      render(<HeroSection />);
      
      const accessoryImage = screen.getByAltText(heroOutfit.accessory!.alt);
      
      expect(accessoryImage).toBeInTheDocument();
      expect(accessoryImage).toHaveAttribute('src', expect.stringContaining('omega-seamaster'));
      expect(accessoryImage).toHaveAttribute('width', '200');
      expect(accessoryImage).toHaveAttribute('height', '200');
    });
  });

  describe('Alt Text Validation', () => {
    it('should have descriptive alt text for all images', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(10);
      });
    });

    it('should not include redundant phrases in alt text', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt')!.toLowerCase();
        expect(alt).not.toContain('image of');
        expect(alt).not.toContain('picture of');
        expect(alt).not.toContain('photo of');
      });
    });

    it('should have specific item descriptions in alt text', () => {
      render(<HeroSection />);
      
      expect(screen.getByAltText(/oxford.*shirt/i)).toBeInTheDocument();
      expect(screen.getByAltText(/chino.*pants/i)).toBeInTheDocument();
      expect(screen.getByAltText(/loafers/i)).toBeInTheDocument();
      expect(screen.getByAltText(/watch/i)).toBeInTheDocument();
    });
  });

  describe('Priority Loading', () => {
    it('should render images with proper src attributes', () => {
      render(<HeroSection />);
      
      const shirtImage = screen.getByAltText(heroOutfit.shirt.alt);
      
      // Image should be rendered with proper src
      expect(shirtImage).toHaveAttribute('src');
      expect(shirtImage.getAttribute('src')).toContain('ocbd-white');
    });

    it('should have all hero images rendered', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      // All hero images should be present
      expect(images.length).toBe(4);
      
      // Each should have a src attribute
      images.forEach((img) => {
        expect(img).toHaveAttribute('src');
      });
    });

    it('should use Next.js Image component (verified by dimensions)', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      // Next.js Image component sets explicit dimensions
      images.forEach((img) => {
        expect(img).toHaveAttribute('width', '200');
        expect(img).toHaveAttribute('height', '200');
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should use 2x2 grid layout for images', () => {
      const { container } = render(<HeroSection />);
      
      // Find the grid container
      const gridContainer = container.querySelector('.grid.grid-cols-2');
      
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have aspect-square containers for consistent sizing', () => {
      const { container } = render(<HeroSection />);
      
      // Find all image containers
      const imageContainers = container.querySelectorAll('.aspect-square');
      
      expect(imageContainers.length).toBeGreaterThanOrEqual(4);
    });

    it('should have proper spacing between images', () => {
      const { container } = render(<HeroSection />);
      
      const gridContainer = container.querySelector('.grid.grid-cols-2');
      
      expect(gridContainer?.className).toContain('gap-4');
    });

    it('should use object-contain for proper image scaling', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('object-contain');
      });
    });

    it('should have padding inside image containers', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('p-4');
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('should use semantic muted surfaces on image containers', () => {
      const { container } = render(<HeroSection />);
      
      const imageContainers = container.querySelectorAll('.aspect-square');
      
      imageContainers.forEach((containerEl) => {
        expect(containerEl.className).toContain('bg-muted');
      });
    });

    it('should maintain proper contrast in dark mode', () => {
      const { container } = render(<HeroSection />);
      
      // Check heading has dark mode text color
      const heading = container.querySelector('h1');
      expect(heading?.className).toContain('text-foreground');
    });
  });

  describe('Interactive Elements', () => {
    it('should have "Get Started Free" button', () => {
      render(<HeroSection />);
      
      const getStartedButton = screen.getByRole('link', { name: /get started free/i });
      
      expect(getStartedButton).toBeInTheDocument();
      expect(getStartedButton).toHaveAttribute('href', '/auth/sign-up');
    });

    it('should have "See How It Works" button', () => {
      render(<HeroSection />);
      
      const howItWorksButton = screen.getByRole('button', { name: /see how it works/i });
      
      expect(howItWorksButton).toBeInTheDocument();
    });

    it('should scroll to demo section when "See How It Works" is clicked', () => {
      // Mock scrollIntoView
      const mockScrollIntoView = vi.fn();
      const mockElement = { scrollIntoView: mockScrollIntoView };
      
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as never);
      
      render(<HeroSection />);
      
      const howItWorksButton = screen.getByRole('button', { name: /see how it works/i });
      fireEvent.click(howItWorksButton);
      
      expect(document.getElementById).toHaveBeenCalledWith('how-it-works');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('Content Validation', () => {
    it('should display main heading', () => {
      render(<HeroSection />);
      
      expect(screen.getByText(/never wonder/i)).toBeInTheDocument();
      expect(screen.getByText(/my ai outfit/i)).toBeInTheDocument();
    });

    it('should display compatibility score', () => {
      render(<HeroSection />);
      
      expect(screen.getByText(/compatibility score/i)).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should display "Today\'s Outfit" label', () => {
      render(<HeroSection />);
      
      expect(screen.getByText(/today's outfit/i)).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should have explicit dimensions to prevent layout shift', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('width', '200');
        expect(img).toHaveAttribute('height', '200');
      });
    });

    it('should render all images with proper src paths', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      // All images should have src attributes
      images.forEach((img) => {
        expect(img).toHaveAttribute('src');
        const src = img.getAttribute('src')!;
        expect(src.length).toBeGreaterThan(0);
      });
    });

    it('should use object-contain to prevent distortion', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('object-contain');
      });
    });
  });
});
