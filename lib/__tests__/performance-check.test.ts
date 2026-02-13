import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Performance Optimizations', () => {
  it('should have quality settings on hero section images', () => {
    const heroContent = readFileSync(
      join(process.cwd(), 'components/homepage/hero-section.tsx'),
      'utf-8'
    );
    
    // Check that quality={85} is present
    expect(heroContent).toContain('quality={85}');
    
    // Check that priority is set on hero images
    expect(heroContent).toContain('priority');
  });

  it('should have lazy loading on app demo images', () => {
    const appDemoContent = readFileSync(
      join(process.cwd(), 'components/homepage/app-demo.tsx'),
      'utf-8'
    );
    
    // Check that quality={85} is present
    expect(appDemoContent).toContain('quality={85}');
    
    // Check that lazy loading is set
    expect(appDemoContent).toContain('loading="lazy"');
  });

  it('should have lazy loading on feature highlights images', () => {
    const featureContent = readFileSync(
      join(process.cwd(), 'components/homepage/feature-highlights.tsx'),
      'utf-8'
    );
    
    // Check that quality={85} is present
    expect(featureContent).toContain('quality={85}');
    
    // Check that lazy loading is set
    expect(featureContent).toContain('loading="lazy"');
  });

  it('should have lazy loading on about page images', () => {
    const aboutContent = readFileSync(
      join(process.cwd(), 'app/about/page.tsx'),
      'utf-8'
    );
    
    // Check that quality={85} is present
    expect(aboutContent).toContain('quality={85}');
    
    // Check that lazy loading is set
    expect(aboutContent).toContain('loading="lazy"');
  });

  it('should have dark mode styling on image containers', () => {
    const heroContent = readFileSync(
      join(process.cwd(), 'components/homepage/hero-section.tsx'),
      'utf-8'
    );
    
    // Check for dark mode classes
    expect(heroContent).toContain('bg-card');
  });

  it('should have explicit width and height on all images', () => {
    const heroContent = readFileSync(
      join(process.cwd(), 'components/homepage/hero-section.tsx'),
      'utf-8'
    );
    
    // Check that width and height are specified
    expect(heroContent).toContain('width={200}');
    expect(heroContent).toContain('height={200}');
  });

  it('should have responsive image sizes configured in next.config', () => {
    const configContent = readFileSync(
      join(process.cwd(), 'next.config.ts'),
      'utf-8'
    );
    
    // Check for deviceSizes configuration
    expect(configContent).toContain('deviceSizes');
    expect(configContent).toContain('imageSizes');
  });
});
