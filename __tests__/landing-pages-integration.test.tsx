/**
 * Integration tests for complete landing pages
 * Validates: About page and component integration
 * Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1
 * 
 * Note: Homepage and How It Works page use client-side routing (useRouter)
 * which requires Next.js App Router context. These are tested via their
 * individual component tests instead.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';
import { HeroSection } from '@/components/homepage/hero-section';
import { AppDemo } from '@/components/homepage/app-demo';
import { FeatureHighlights } from '@/components/homepage/feature-highlights';
import { HowItWorks } from '@/components/homepage/how-it-works';

describe('Landing Pages Integration Tests', () => {
  describe('Homepage Components Integration', () => {
    it('should render Hero Section with all images', () => {
      render(<HeroSection />);
      
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(4);
      
      // Verify hero content
      expect(screen.getByText(/never wonder/i)).toBeInTheDocument();
    });

    it('should render App Demo with compatibility scores', () => {
      render(<AppDemo />);
      
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(4);
      
      // Verify compatibility scores
      expect(screen.getByText('95% Match')).toBeInTheDocument();
      expect(screen.getByText('Style Harmony')).toBeInTheDocument();
    });

    it('should render Feature Highlights with images', () => {
      render(<FeatureHighlights />);
      
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(3);
      
      // Verify feature content
      expect(screen.getByText('Your wardrobe, reimagined')).toBeInTheDocument();
    });

    it('should render How It Works section with all steps', () => {
      render(<HowItWorks />);
      
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThanOrEqual(10);
      
      // Verify all steps
      expect(screen.getByText('Upload Your Wardrobe')).toBeInTheDocument();
      expect(screen.getByText('Let AI Do the Work')).toBeInTheDocument();
      expect(screen.getByText('Pick Your Outfit & Go')).toBeInTheDocument();
    });

    it('should have consistent image optimization across components', () => {
      const hero = render(<HeroSection />);
      const heroImages = hero.getAllByRole('img');
      hero.unmount();
      
      const demo = render(<AppDemo />);
      const demoImages = demo.getAllByRole('img');
      demo.unmount();
      
      // All should use Next.js Image component
      [...heroImages, ...demoImages].forEach((img) => {
        expect(img).toHaveAttribute('decoding');
      });
    });

    it('should have proper loading strategy across components', () => {
      const hero = render(<HeroSection />);
      hero.getAllByRole('img');
      hero.unmount();
      
      const demo = render(<AppDemo />);
      const demoImages = demo.getAllByRole('img');
      
      // Demo images should be lazy loaded
      demoImages.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
      
      demo.unmount();
    });
  });

  describe('About Page Integration', () => {
    it('should render complete About page', () => {
      render(<AboutPage />);
      
      expect(screen.getByText('About My AI Outfit')).toBeInTheDocument();
      expect(screen.getByText('Our Mission')).toBeInTheDocument();
      expect(screen.getByText('Key Features')).toBeInTheDocument();
    });

    it('should have all feature card images loaded', () => {
      render(<AboutPage />);
      
      const images = screen.getAllByRole('img');
      
      // Should have at least 4 feature card images
      const featureImages = images.filter(img => 
        img.getAttribute('width') === '64'
      );
      expect(featureImages.length).toBeGreaterThanOrEqual(4);
    });

    it('should have all feature cards present', () => {
      render(<AboutPage />);
      
      expect(screen.getByText('Personal & Secure')).toBeInTheDocument();
      expect(screen.getByText('Custom Wardrobe')).toBeInTheDocument();
      expect(screen.getByText('Smart Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Weather Integration')).toBeInTheDocument();
    });

    it('should have CTA button', () => {
      render(<AboutPage />);
      
      const button = screen.getByRole('link', { name: /get started today/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('href', '/auth/sign-up');
    });

    it('should have consistent card styling', () => {
      const { container } = render(<AboutPage />);
      
      // Check for feature cards
      const cards = container.querySelectorAll('.bg-card');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Cross-Component Consistency', () => {
    it('should use consistent image dimensions for feature images', () => {
      const hero = render(<HeroSection />);
      const heroImages = hero.getAllByRole('img');
      
      // Hero images should have explicit dimensions
      heroImages.forEach((img) => {
        expect(img).toHaveAttribute('width');
        expect(img).toHaveAttribute('height');
      });
      
      hero.unmount();
    });

    it('should use consistent alt text patterns', () => {
      const components = [
        render(<HeroSection />),
        render(<AppDemo />),
        render(<FeatureHighlights />),
        render(<AboutPage />)
      ];
      
      components.forEach((component) => {
        const images = component.getAllByRole('img');
        
        images.forEach((img) => {
          const alt = img.getAttribute('alt')!;
          if (alt) { // Some images may not have alt (decorative)
            expect(alt.length).toBeGreaterThan(5);
            expect(alt.toLowerCase()).not.toContain('image of');
            expect(alt.toLowerCase()).not.toContain('picture of');
          }
        });
        
        component.unmount();
      });
    });

    it('should use consistent dark mode classes', () => {
      const components = [
        render(<HeroSection />),
        render(<AppDemo />),
        render(<FeatureHighlights />),
        render(<AboutPage />)
      ];
      
      components.forEach((component) => {
        const { container } = component;
        
        // Check for semantic text colors
        const tokenText = container.querySelectorAll('.text-muted-foreground, .text-foreground');
        expect(tokenText.length).toBeGreaterThan(0);
        
        component.unmount();
      });
    });

    it('should have consistent CTA styling in components', () => {
      const hero = render(<HeroSection />);
      const heroButton = hero.getByRole('link', { name: /get started free/i });
      expect(heroButton.querySelector('button')?.className).toContain('bg-primary');
      hero.unmount();
      
      const about = render(<AboutPage />);
      const aboutButton = about.getByRole('link', { name: /get started today/i });
      expect(aboutButton.className).toContain('bg-primary');
      about.unmount();
    });
  });

  describe('Performance Across Components', () => {
    it('should have optimized images on homepage components', () => {
      const components = [
        render(<HeroSection />),
        render(<AppDemo />),
        render(<FeatureHighlights />)
      ];
      
      components.forEach((component) => {
        const images = component.getAllByRole('img');
        
        images.forEach((img) => {
          // Next.js Image optimization attributes
          expect(img).toHaveAttribute('decoding', 'async');
        });
        
        component.unmount();
      });
    });

    it('should use object-contain consistently', () => {
      const components = [
        render(<HeroSection />),
        render(<AppDemo />),
        render(<FeatureHighlights />)
      ];
      
      components.forEach((component) => {
        const images = component.getAllByRole('img');
        
        images.forEach((img) => {
          expect(img.className).toContain('object-contain');
        });
        
        component.unmount();
      });
    });
  });

  describe('Accessibility Across Components', () => {
    it('should have proper heading hierarchy on all pages', () => {
      const about = render(<AboutPage />);
      const h1 = about.container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      about.unmount();
      
      const features = render(<FeatureHighlights />);
      const h2 = features.container.querySelector('h2');
      expect(h2).toBeInTheDocument();
      features.unmount();
    });

    it('should have descriptive alt text on all components', () => {
      const components = [
        render(<HeroSection />),
        render(<AppDemo />),
        render(<FeatureHighlights />),
        render(<AboutPage />)
      ];
      
      components.forEach((component) => {
        const images = component.getAllByRole('img');
        
        images.forEach((img) => {
          const alt = img.getAttribute('alt');
          if (alt) { // Some images may be decorative
            expect(alt.length).toBeGreaterThan(5);
          }
        });
        
        component.unmount();
      });
    });
  });

  describe('Responsive Design Across Components', () => {
    it('should have responsive grid layouts', () => {
      const components = [
        render(<HeroSection />),
        render(<AppDemo />),
        render(<FeatureHighlights />)
      ];

      let hasResponsiveLayout = false;
      
      components.forEach((component) => {
        const { container } = component;
        
        // Check for responsive layout classes used in this project
        const responsiveGrids = container.querySelectorAll(
          '[class*="sm:flex-row"], [class*="md:grid-cols"], [class*="lg:grid-cols"]'
        );
        if (responsiveGrids.length > 0) {
          hasResponsiveLayout = true;
        }
        
        component.unmount();
      });

      expect(hasResponsiveLayout).toBe(true);
    });

    it('should have proper spacing at all breakpoints', () => {
      const components = [
        render(<HeroSection />),
        render(<AppDemo />),
        render(<FeatureHighlights />),
        render(<AboutPage />)
      ];
      
      components.forEach((component) => {
        const { container } = component;
        
        // Check for gap classes
        const gapElements = container.querySelectorAll('[class*="gap-"]');
        expect(gapElements.length).toBeGreaterThan(0);
        
        component.unmount();
      });
    });
  });
});
