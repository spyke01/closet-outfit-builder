/**
 * Tests for About Page Feature Card Images
 * Validates that feature cards display real wardrobe images correctly
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';

describe('About Page Feature Card Images', () => {
  it('should render all four feature cards with images', () => {
    render(<AboutPage />);
    
    // Check for feature card headings
    expect(screen.getByText('Personal & Secure')).toBeInTheDocument();
    expect(screen.getByText('Custom Wardrobe')).toBeInTheDocument();
    expect(screen.getByText('Smart Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Weather Integration')).toBeInTheDocument();
  });

  it('should render images with correct dimensions (64x64)', () => {
    render(<AboutPage />);
    
    const images = screen.getAllByRole('img');
    
    // Filter to only feature card images (exclude navigation/footer images)
    const featureImages = images.filter(img => 
      img.getAttribute('width') === '64' && 
      img.getAttribute('height') === '64'
    );
    
    // Should have 4 feature card images
    expect(featureImages.length).toBeGreaterThanOrEqual(4);
    
    featureImages.forEach(img => {
      expect(img).toHaveAttribute('width', '64');
      expect(img).toHaveAttribute('height', '64');
    });
  });

  it('should have correct image paths for each feature', () => {
    render(<AboutPage />);
    
    // Check for specific images
    expect(screen.getByAltText(/Blue Oxford shirt/i)).toBeInTheDocument();
    expect(screen.getByAltText(/White Oxford shirt/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Grey tweed sport coat/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Navy mac coat/i)).toBeInTheDocument();
  });

  it('should have descriptive alt text for all feature images', () => {
    render(<AboutPage />);
    
    const images = screen.getAllByRole('img');
    const featureImages = images.filter(img => 
      img.getAttribute('width') === '64'
    );
    
    featureImages.forEach(img => {
      const alt = img.getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(10);
    });
  });

  it('should use object-contain for proper image scaling', () => {
    render(<AboutPage />);
    
    const images = screen.getAllByRole('img');
    const featureImages = images.filter(img => 
      img.getAttribute('width') === '64'
    );
    
    featureImages.forEach(img => {
      expect(img.className).toContain('object-contain');
    });
  });

  it('should maintain dark mode compatible styling', () => {
    render(<AboutPage />);
    
    // Check that feature cards have dark mode classes
    const personalSecureCard = screen.getByText('Personal & Secure').closest('div');
    expect(personalSecureCard?.className).toContain('dark:bg-slate-800');
    expect(personalSecureCard?.className).toContain('dark:border-slate-700');
  });

  it('should preserve existing card layout and styling', () => {
    render(<AboutPage />);
    
    // Check that cards maintain their structure
    const cards = screen.getAllByText(/Multi-user authentication|Upload your own|AI-powered|Location-based/i);
    expect(cards.length).toBe(4);
    
    // Each card should have its description
    cards.forEach(card => {
      expect(card.textContent!.length).toBeGreaterThan(20);
    });
  });

  it('should center images within their containers', () => {
    render(<AboutPage />);
    
    const personalSecureImage = screen.getByAltText(/Blue Oxford shirt/i);
    const imageContainer = personalSecureImage.closest('div');
    
    expect(imageContainer?.className).toContain('mx-auto');
  });

  it('should have proper spacing between image and heading', () => {
    render(<AboutPage />);
    
    const personalSecureImage = screen.getByAltText(/Blue Oxford shirt/i);
    const imageContainer = personalSecureImage.closest('div');
    
    expect(imageContainer?.className).toContain('mb-4');
  });

  it('should maintain WCAG AA contrast ratios', () => {
    render(<AboutPage />);
    
    // Check that text colors maintain proper contrast
    const heading = screen.getByText('Personal & Secure');
    expect(heading.className).toContain('text-slate-900');
    expect(heading.className).toContain('dark:text-slate-100');
    
    const description = screen.getByText(/Multi-user authentication/i);
    expect(description.className).toContain('text-slate-700');
    expect(description.className).toContain('dark:text-slate-300');
  });

  it('should use representative items for each feature', () => {
    render(<AboutPage />);
    
    // Personal & Secure: Blue OCBD
    const personalImage = screen.getByAltText(/Blue Oxford shirt.*personal/i);
    expect(personalImage.getAttribute('src')).toContain('ocbd-blue');
    
    // Custom Wardrobe: White OCBD (upload item)
    const customImage = screen.getByAltText(/White Oxford shirt.*upload/i);
    expect(customImage.getAttribute('src')).toContain('ocbd-white');
    
    // Smart Recommendations: Grey sport coat
    const smartImage = screen.getByAltText(/Grey tweed sport coat/i);
    expect(smartImage.getAttribute('src')).toContain('sportcoat-tweed-grey');
    
    // Weather Integration: Navy mac coat
    const weatherImage = screen.getByAltText(/Navy mac coat/i);
    expect(weatherImage.getAttribute('src')).toContain('mac-coat-navy');
  });
});
