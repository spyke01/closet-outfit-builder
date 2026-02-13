/**
 * Unit tests for How It Works Section (Homepage)
 * Validates: all 3 steps render correctly, animations work, responsive
 * Requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorks } from '../how-it-works';
import { uploadStepItems, aiMatchingItems, finalOutfitItems } from '@/lib/data/landing-page-images';

describe('HowItWorks - Unit Tests', () => {
  describe('Step 1: Upload Your Wardrobe', () => {
    it('should render step 1 heading and description', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText('Upload Your Wardrobe')).toBeInTheDocument();
      expect(screen.getByText(/snap or upload photos/i)).toBeInTheDocument();
    });

    it('should render 3 upload step images', () => {
      render(<HowItWorks />);
      
      const navyShirt = screen.getByAltText(uploadStepItems[0].alt);
      const greyChinos = screen.getByAltText(uploadStepItems[1].alt);
      const whiteSneakers = screen.getByAltText(uploadStepItems[2].alt);
      
      expect(navyShirt).toBeInTheDocument();
      expect(greyChinos).toBeInTheDocument();
      expect(whiteSneakers).toBeInTheDocument();
    });

    it('should have correct image dimensions for step 1', () => {
      render(<HowItWorks />);
      
      const navyShirt = screen.getByAltText(uploadStepItems[0].alt);
      
      expect(navyShirt).toHaveAttribute('width', '120');
      expect(navyShirt).toHaveAttribute('height', '120');
    });

    it('should display upload icon', () => {
      const { container } = render(<HowItWorks />);
      
      // Check for Upload icon in step 1
      const uploadText = screen.getByText(/drag & drop your photos/i);
      expect(uploadText).toBeInTheDocument();
    });

    it('should use 3-column grid for upload items', () => {
      const { container } = render(<HowItWorks />);
      
      const gridContainers = container.querySelectorAll('.grid.grid-cols-3');
      
      expect(gridContainers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 2: Let AI Do the Work', () => {
    it('should render step 2 heading and description', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText('Let AI Do the Work')).toBeInTheDocument();
      expect(screen.getByText(/intelligently matches shirts, pants/i)).toBeInTheDocument();
    });

    it('should render 3 AI matching images', () => {
      render(<HowItWorks />);
      
      const navyPolo = screen.getByAltText(aiMatchingItems[0].alt);
      const oliveChinos = screen.getByAltText(aiMatchingItems[1].alt);
      const tanLoafers = screen.getByAltText(aiMatchingItems[2].alt);
      
      expect(navyPolo).toBeInTheDocument();
      expect(oliveChinos).toBeInTheDocument();
      expect(tanLoafers).toBeInTheDocument();
    });

    it('should have correct image dimensions for step 2', () => {
      render(<HowItWorks />);
      
      const navyPolo = screen.getByAltText(aiMatchingItems[0].alt);
      
      expect(navyPolo).toHaveAttribute('width', '48');
      expect(navyPolo).toHaveAttribute('height', '48');
    });

    it('should display "Generating outfits..." text', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText(/generating outfits/i)).toBeInTheDocument();
    });

    it('should have progress bars for AI matching', () => {
      const { container } = render(<HowItWorks />);
      
      // Find progress bar containers
      const progressBars = container.querySelectorAll('.bg-muted.rounded-full');
      
      // Should have at least 3 progress bars (one for each item)
      expect(progressBars.length).toBeGreaterThanOrEqual(3);
    });

    it('should have animated Sparkles icon', () => {
      const { container } = render(<HowItWorks />);
      
      const animatedIcons = container.querySelectorAll('.animate-pulse');
      
      expect(animatedIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 3: Pick Your Outfit & Go', () => {
    it('should render step 3 heading and description', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText('Pick Your Outfit & Go')).toBeInTheDocument();
      expect(screen.getByText(/save your favorites or randomize/i)).toBeInTheDocument();
    });

    it('should render 4 final outfit images', () => {
      render(<HowItWorks />);
      
      const greyCardigan = screen.getByAltText(finalOutfitItems[0].alt);
      const whiteTee = screen.getByAltText(finalOutfitItems[1].alt);
      const mediumJeans = screen.getByAltText(finalOutfitItems[2].alt);
      const killshots = screen.getByAltText(finalOutfitItems[3].alt);
      
      expect(greyCardigan).toBeInTheDocument();
      expect(whiteTee).toBeInTheDocument();
      expect(mediumJeans).toBeInTheDocument();
      expect(killshots).toBeInTheDocument();
    });

    it('should have correct image dimensions for step 3', () => {
      render(<HowItWorks />);
      
      const greyCardigan = screen.getByAltText(finalOutfitItems[0].alt);
      
      expect(greyCardigan).toHaveAttribute('width', '120');
      expect(greyCardigan).toHaveAttribute('height', '120');
    });

    it('should display "Perfect match!" text', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText(/perfect match/i)).toBeInTheDocument();
    });

    it('should display compatibility badge', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText(/95% compatibility/i)).toBeInTheDocument();
    });

    it('should use 2x2 grid for final outfit', () => {
      const { container } = render(<HowItWorks />);
      
      const gridContainers = container.querySelectorAll('.grid.grid-cols-2');
      
      expect(gridContainers.length).toBeGreaterThanOrEqual(1);
    });

    it('should display Heart icon', () => {
      const { container } = render(<HowItWorks />);
      
      const heartIcons = container.querySelectorAll('.text-red-500.fill-current');
      
      expect(heartIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step Numbers and Icons', () => {
    it('should display all step numbers', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('02')).toBeInTheDocument();
      expect(screen.getByText('03')).toBeInTheDocument();
    });

    it('should have icon containers for each step', () => {
      const { container } = render(<HowItWorks />);
      
      const iconContainers = container.querySelectorAll('.bg-gradient-to-br.rounded-2xl');
      
      // Should have 3 icon containers
      expect(iconContainers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Animations', () => {
    it('should have animation classes on step containers', () => {
      const { container } = render(<HowItWorks />);
      
      const animatedElements = container.querySelectorAll('[class*="animate-slide-in"]');
      
      // Should have animated elements
      expect(animatedElements.length).toBeGreaterThanOrEqual(3);
    });

    it('should have progress bar animations', () => {
      const { container } = render(<HowItWorks />);
      
      const progressBars = container.querySelectorAll('.transition-all.duration-1000');
      
      expect(progressBars.length).toBeGreaterThanOrEqual(3);
    });

    it('should have pulse animation on Sparkles icon', () => {
      const { container } = render(<HowItWorks />);
      
      const pulsingElements = container.querySelectorAll('.animate-pulse');
      
      expect(pulsingElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Responsive Layout', () => {
    it('should have responsive grid classes', () => {
      const { container } = render(<HowItWorks />);
      
      const responsiveGrids = container.querySelectorAll('.lg\\:grid-cols-2');
      
      expect(responsiveGrids.length).toBeGreaterThanOrEqual(1);
    });

    it('should have responsive gap spacing', () => {
      const { container } = render(<HowItWorks />);
      
      const gapContainers = container.querySelectorAll('[class*="gap-"]');
      
      expect(gapContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('should have alternating layout for steps', () => {
      const { container } = render(<HowItWorks />);
      
      const flowDenseContainers = container.querySelectorAll('.lg\\:grid-flow-col-dense');
      
      // Should have at least one alternating layout
      expect(flowDenseContainers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Alt Text Validation', () => {
    it('should have descriptive alt text for all images', () => {
      render(<HowItWorks />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(5);
      });
    });

    it('should not include redundant phrases in alt text', () => {
      render(<HowItWorks />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        const alt = img.getAttribute('alt')!.toLowerCase();
        expect(alt).not.toContain('image of');
        expect(alt).not.toContain('picture of');
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('should use semantic themed container classes', () => {
      const { container } = render(<HowItWorks />);
      
      const themedContainers = container.querySelectorAll('.bg-card, .bg-background, .bg-muted');
      
      expect(themedContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('should use semantic text color classes', () => {
      const { container } = render(<HowItWorks />);
      
      const textElements = container.querySelectorAll('.text-foreground, .text-muted-foreground');
      
      expect(textElements.length).toBeGreaterThanOrEqual(3);
    });

    it('should use semantic image container backgrounds', () => {
      const { container } = render(<HowItWorks />);
      
      const imageContainers = container.querySelectorAll('.bg-card');
      
      expect(imageContainers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Content Validation', () => {
    it('should display section heading', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText('How it works')).toBeInTheDocument();
    });

    it('should display section description', () => {
      render(<HowItWorks />);
      
      expect(screen.getByText(/getting started is effortless/i)).toBeInTheDocument();
    });

    it('should have "Start Your Free Trial" button', () => {
      render(<HowItWorks />);
      
      const button = screen.getByRole('link', { name: /start your free trial/i });
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('href', '/auth/sign-up');
    });
  });

  describe('Performance Considerations', () => {
    it('should use object-contain for proper image scaling', () => {
      render(<HowItWorks />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img.className).toContain('object-contain');
      });
    });

    it('should have explicit dimensions to prevent layout shift', () => {
      render(<HowItWorks />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('width');
        expect(img).toHaveAttribute('height');
      });
    });

    it('should use Next.js Image component for optimization', () => {
      render(<HowItWorks />);
      
      const images = screen.getAllByRole('img');
      
      images.forEach((img) => {
        expect(img).toHaveAttribute('decoding');
      });
    });
  });
});
