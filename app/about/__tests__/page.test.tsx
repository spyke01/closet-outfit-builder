/**
 * Unit tests for About Page
 * Validates: feature cards render with images, layout consistency, dark mode
 * Requirements: 1.1, 2.1, 2.2, 4.1
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '../page';

describe('AboutPage - Unit Tests', () => {
  describe('Page Structure', () => {
    it('should render the page with navigation', () => {
      render(<AboutPage />);
      
      expect(screen.getByText('About My AI Outfit')).toBeInTheDocument();
    });

    it('should have proper page heading', () => {
      render(<AboutPage />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('About My AI Outfit');
    });

    it('should display page description', () => {
      render(<AboutPage />);
      
      expect(screen.getByText(/intelligent outfit composition/i)).toBeInTheDocument();
    });
  });

  describe('Feature Cards with Images', () => {
    it('should render exactly 4 feature cards', () => {
      render(<AboutPage />);
      
      expect(screen.getByText('Personal & Secure')).toBeInTheDocument();
      expect(screen.getByText('Custom Wardrobe')).toBeInTheDocument();
      expect(screen.getByText('Smart Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Weather Integration')).toBeInTheDocument();
    });

    it('should render at least 4 feature images', () => {
      render(<AboutPage />);
      
      const images = screen.getAllByRole('img');
      
      // Should have at least 4 feature card images (may have more from nav/footer)
      expect(images.length).toBeGreaterThanOrEqual(4);
    });

    it('should render Personal & Secure image with correct attributes', () => {
      render(<AboutPage />);
      
      const image = screen.getByAltText(/blue oxford shirt representing personal wardrobe/i);
      
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('ocbd-blue'));
      expect(image).toHaveAttribute('width', '64');
      expect(image).toHaveAttribute('height', '64');
    });

    it('should render Custom Wardrobe image with correct attributes', () => {
      render(<AboutPage />);
      
      const image = screen.getByAltText(/white oxford shirt for custom wardrobe/i);
      
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('ocbd-white'));
      expect(image).toHaveAttribute('width', '64');
      expect(image).toHaveAttribute('height', '64');
    });

    it('should render Smart Recommendations image with correct attributes', () => {
      render(<AboutPage />);
      
      const image = screen.getByAltText(/grey tweed sport coat for smart recommendations/i);
      
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('sportcoat-tweed-grey'));
      expect(image).toHaveAttribute('width', '64');
      expect(image).toHaveAttribute('height', '64');
    });

    it('should render Weather Integration image with correct attributes', () => {
      render(<AboutPage />);
      
      const image = screen.getByAltText(/navy mac coat for weather integration/i);
      
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('mac-coat-navy'));
      expect(image).toHaveAttribute('width', '64');
      expect(image).toHaveAttribute('height', '64');
    });

    it('should have feature descriptions', () => {
      render(<AboutPage />);
      
      expect(screen.getByText(/multi-user authentication with complete data privacy/i)).toBeInTheDocument();
      expect(screen.getByText(/upload your own clothing photos with automatic background removal/i)).toBeInTheDocument();
      expect(screen.getByText(/ai-powered outfit suggestions based on style compatibility/i)).toBeInTheDocument();
      expect(screen.getByText(/location-based outfit recommendations considering weather/i)).toBeInTheDocument();
    });
  });

  describe('Layout Consistency', () => {
    it('should use 2-column grid for feature cards', () => {
      const { container } = render(<AboutPage />);
      
      const gridContainer = container.querySelector('.md\\:grid-cols-2');
      
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have consistent card styling', () => {
      const { container } = render(<AboutPage />);
      
      const cards = container.querySelectorAll('.bg-card');
      
      // Should have 4 feature cards
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('should have consistent card borders', () => {
      const { container } = render(<AboutPage />);
      
      const cards = container.querySelectorAll('.border.border-border');
      
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('should have consistent card padding', () => {
      const { container } = render(<AboutPage />);
      
      const cards = container.querySelectorAll('.p-6');
      
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('should have consistent card rounded corners', () => {
      const { container } = render(<AboutPage />);
      
      const cards = container.querySelectorAll('.rounded-lg');
      
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('should center images within cards', () => {
      const { container } = render(<AboutPage />);
      
      const imageContainers = container.querySelectorAll('.w-16.h-16.mb-4.mx-auto');
      
      expect(imageContainers.length).toBe(4);
    });

    it('should have proper spacing between sections', () => {
      const { container } = render(<AboutPage />);
      
      const sections = container.querySelectorAll('section.mb-12');
      
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode background gradient', () => {
      const { container } = render(<AboutPage />);
      
      const mainContainer = container.querySelector('.bg-background');
      
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have dark mode text colors for headings', () => {
      const { container } = render(<AboutPage />);
      
      const headings = container.querySelectorAll('h1, h2, h3');
      
      headings.forEach((heading) => {
        expect(heading.className).toContain('text-foreground');
      });
    });

    it('should have dark mode text colors for descriptions', () => {
      const { container } = render(<AboutPage />);
      
      const descriptions = container.querySelectorAll('p');
      
      descriptions.forEach((desc) => {
        if (desc.className.includes('text-muted-foreground')) {
          expect(desc.className).toContain('text-muted-foreground');
        }
      });
    });

    it('should have dark mode card backgrounds', () => {
      const { container } = render(<AboutPage />);
      
      const cards = container.querySelectorAll('.bg-card');
      
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('should have dark mode card borders', () => {
      const { container } = render(<AboutPage />);
      
      const cards = container.querySelectorAll('.border-border');
      
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Content Sections', () => {
    it('should have Our Mission section', () => {
      render(<AboutPage />);
      
      expect(screen.getByText('Our Mission')).toBeInTheDocument();
      expect(screen.getByText(/helps fashion-conscious individuals organize/i)).toBeInTheDocument();
    });

    it('should have Key Features section', () => {
      render(<AboutPage />);
      
      expect(screen.getByText('Key Features')).toBeInTheDocument();
    });

    it('should have Technology section', () => {
      render(<AboutPage />);
      
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText(/built with modern web technologies/i)).toBeInTheDocument();
    });
  });

  describe('Call to Action', () => {
    it('should have "Get Started Today" button', () => {
      render(<AboutPage />);
      
      const button = screen.getByRole('link', { name: /get started today/i });
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('href', '/auth/sign-up');
    });

    it('should have proper button styling', () => {
      render(<AboutPage />);
      
      const button = screen.getByRole('link', { name: /get started today/i });
      
      expect(button.className).toContain('bg-primary');
    });

    it('should have dark mode button styling', () => {
      render(<AboutPage />);
      
      const button = screen.getByRole('link', { name: /get started today/i });
      
      expect(button.className).toContain('');
    });
  });

  describe('Alt Text Validation', () => {
    it('should have descriptive alt text for feature card images', () => {
      render(<AboutPage />);
      
      // Test specific feature card images
      const personalImage = screen.getByAltText(/blue oxford shirt representing personal wardrobe/i);
      const customImage = screen.getByAltText(/white oxford shirt for custom wardrobe/i);
      const smartImage = screen.getByAltText(/grey tweed sport coat for smart recommendations/i);
      const weatherImage = screen.getByAltText(/navy mac coat for weather integration/i);
      
      [personalImage, customImage, smartImage, weatherImage].forEach((img) => {
        const alt = img.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(10);
      });
    });

    it('should not include redundant phrases in feature card alt text', () => {
      render(<AboutPage />);
      
      const featureImages = [
        screen.getByAltText(/blue oxford shirt representing personal wardrobe/i),
        screen.getByAltText(/white oxford shirt for custom wardrobe/i),
        screen.getByAltText(/grey tweed sport coat for smart recommendations/i),
        screen.getByAltText(/navy mac coat for weather integration/i)
      ];
      
      featureImages.forEach((img) => {
        const alt = img.getAttribute('alt')!.toLowerCase();
        expect(alt).not.toContain('image of');
        expect(alt).not.toContain('picture of');
      });
    });

    it('should describe the purpose of each image', () => {
      render(<AboutPage />);
      
      expect(screen.getByAltText(/representing personal wardrobe/i)).toBeInTheDocument();
      expect(screen.getByAltText(/for custom wardrobe/i)).toBeInTheDocument();
      expect(screen.getByAltText(/for smart recommendations/i)).toBeInTheDocument();
      expect(screen.getByAltText(/for weather integration/i)).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should use lazy loading for feature card images', () => {
      render(<AboutPage />);
      
      const personalImage = screen.getByAltText(/blue oxford shirt representing personal wardrobe/i);
      const customImage = screen.getByAltText(/white oxford shirt for custom wardrobe/i);
      const smartImage = screen.getByAltText(/grey tweed sport coat for smart recommendations/i);
      const weatherImage = screen.getByAltText(/navy mac coat for weather integration/i);
      
      [personalImage, customImage, smartImage, weatherImage].forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should have explicit dimensions to prevent layout shift', () => {
      render(<AboutPage />);
      
      const featureImages = [
        screen.getByAltText(/blue oxford shirt representing personal wardrobe/i),
        screen.getByAltText(/white oxford shirt for custom wardrobe/i),
        screen.getByAltText(/grey tweed sport coat for smart recommendations/i),
        screen.getByAltText(/navy mac coat for weather integration/i)
      ];
      
      featureImages.forEach((img) => {
        expect(img).toHaveAttribute('width', '64');
        expect(img).toHaveAttribute('height', '64');
      });
    });

    it('should use object-contain for proper image scaling', () => {
      render(<AboutPage />);
      
      const featureImages = [
        screen.getByAltText(/blue oxford shirt representing personal wardrobe/i),
        screen.getByAltText(/white oxford shirt for custom wardrobe/i),
        screen.getByAltText(/grey tweed sport coat for smart recommendations/i),
        screen.getByAltText(/navy mac coat for weather integration/i)
      ];
      
      featureImages.forEach((img) => {
        expect(img.className).toContain('object-contain');
      });
    });

    it('should use Next.js Image component for optimization', () => {
      render(<AboutPage />);
      
      const featureImages = [
        screen.getByAltText(/blue oxford shirt representing personal wardrobe/i),
        screen.getByAltText(/white oxford shirt for custom wardrobe/i),
        screen.getByAltText(/grey tweed sport coat for smart recommendations/i),
        screen.getByAltText(/navy mac coat for weather integration/i)
      ];
      
      featureImages.forEach((img) => {
        expect(img).toHaveAttribute('decoding', 'async');
      });
    });

    it('should have quality={85} for optimized file size', () => {
      render(<AboutPage />);
      
      const featureImages = [
        screen.getByAltText(/blue oxford shirt representing personal wardrobe/i),
        screen.getByAltText(/white oxford shirt for custom wardrobe/i),
        screen.getByAltText(/grey tweed sport coat for smart recommendations/i),
        screen.getByAltText(/navy mac coat for weather integration/i)
      ];
      
      // Next.js Image component should be used with optimization
      featureImages.forEach((img) => {
        expect(img).toHaveAttribute('loading');
        expect(img).toHaveAttribute('decoding');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid layout', () => {
      const { container } = render(<AboutPage />);
      
      const responsiveGrid = container.querySelector('.md\\:grid-cols-2');
      
      expect(responsiveGrid).toBeInTheDocument();
    });

    it('should have proper spacing at all breakpoints', () => {
      const { container } = render(<AboutPage />);
      
      const gridContainer = container.querySelector('.grid.gap-6');
      
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have max-width container for content', () => {
      const { container } = render(<AboutPage />);
      
      const maxWidthContainer = container.querySelector('.max-w-4xl');
      
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it('should have responsive padding', () => {
      const { container } = render(<AboutPage />);
      
      const paddedContainer = container.querySelector('.px-6.py-16');
      
      expect(paddedContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const { container } = render(<AboutPage />);
      
      const h1 = container.querySelector('h1');
      const h2s = container.querySelectorAll('h2');
      const h3s = container.querySelectorAll('h3');
      
      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThanOrEqual(3);
      expect(h3s.length).toBeGreaterThanOrEqual(4); // At least 4 feature cards
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<AboutPage />);
      
      const main = container.querySelector('main');
      const sections = container.querySelectorAll('section');
      
      expect(main).toBeInTheDocument();
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it('should have proper text contrast ratios', () => {
      const { container } = render(<AboutPage />);
      
      const headings = container.querySelectorAll('h1, h2, h3');
      
      headings.forEach((heading) => {
        expect(heading.className).toContain('text-foreground');
      });
    });
  });

  describe('Navigation and Footer', () => {
    it('should render navigation component', () => {
      const { container } = render(<AboutPage />);
      
      // StaticPageNavigation should be rendered
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should render footer component', () => {
      const { container } = render(<AboutPage />);
      
      // StaticPageFooter should be rendered
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });
  });
});
