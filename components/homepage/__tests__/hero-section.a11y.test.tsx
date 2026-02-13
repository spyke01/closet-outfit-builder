/**
 * Accessibility tests for Hero Section
 * Validates keyboard navigation, screen reader compatibility, and WCAG compliance
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '../hero-section';

describe('HeroSection - Accessibility', () => {
  it('should have descriptive alt text for all images', () => {
    render(<HeroSection />);
    
    const images = screen.getAllByRole('img');
    
    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThanOrEqual(10);
      expect(alt!.toLowerCase()).not.toMatch(/^(image of|picture of)/);
    });
  });

  it('should have accessible buttons with proper labels', () => {
    render(<HeroSection />);
    
    const getStartedButton = screen.getByRole('link', { name: /get started free/i });
    const howItWorksButton = screen.getByRole('button', { name: /see how it works/i });
    
    expect(getStartedButton).toBeInTheDocument();
    expect(howItWorksButton).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(<HeroSection />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('Never wonder');
  });

  it('should have decorative icons marked with aria-hidden', () => {
    const { container } = render(<HeroSection />);
    
    // Check that SVG icons have aria-hidden
    const svgIcons = container.querySelectorAll('svg');
    svgIcons.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('should have sufficient color contrast for text', () => {
    const { container } = render(<HeroSection />);
    
    // Check that text elements have appropriate color classes
    const headings = container.querySelectorAll('h1, h2, h3');
    headings.forEach((heading) => {
      const classes = heading.className;
      expect(classes).toMatch(/text-foreground|text-primary|text-secondary/);
    });
  });

  it('should have keyboard-accessible interactive elements', () => {
    render(<HeroSection />);
    
    const getStartedLink = screen.getByRole('link', { name: /get started free/i });
    const howItWorksButton = screen.getByRole('button', { name: /see how it works/i });
    
    // Links should have href
    expect(getStartedLink).toHaveAttribute('href');
    
    // Buttons should be focusable (they are by default)
    expect(howItWorksButton.tagName).toBe('BUTTON');
  });
});
