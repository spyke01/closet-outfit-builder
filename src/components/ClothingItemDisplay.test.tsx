import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ClothingItemDisplay } from './ClothingItemDisplay';
import { WardrobeItem } from '../types';

// No mocks needed since we're only using images now

const createMockItem = (name: string, category: any, image?: string): WardrobeItem => ({
  id: 'test-id',
  name,
  category,
  formalityScore: 5,
  active: true,
  image: image || ''
});

describe('ClothingItemDisplay', () => {
  describe('Image Display', () => {
    it('renders image when valid image URL is provided', async () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/shirt.jpg');
      
      render(<ClothingItemDisplay item={item} />);
      
      const img = screen.getByAltText('White Shirt');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/shirt.jpg');
    });

    it('shows loading state initially when image is provided', () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/shirt.jpg');
      
      render(<ClothingItemDisplay item={item} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('hides loading state after image loads', async () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/shirt.jpg');
      
      render(<ClothingItemDisplay item={item} />);
      
      const img = screen.getByAltText('White Shirt');
      fireEvent.load(img);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('renders nothing when image fails to load', async () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/broken-image.jpg');
      
      const { container } = render(<ClothingItemDisplay item={item} />);
      
      const img = screen.getByAltText('White Shirt');
      fireEvent.error(img);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('No Image Cases', () => {
    it('renders nothing when no image is provided', () => {
      const item = createMockItem('White Shirt', 'Shirt', '');
      
      const { container } = render(<ClothingItemDisplay item={item} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when image is null', () => {
      const item = createMockItem('White Shirt', 'Shirt');
      delete item.image;
      
      const { container } = render(<ClothingItemDisplay item={item} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when image is only whitespace', () => {
      const item = createMockItem('White Shirt', 'Shirt', '   ');
      
      const { container } = render(<ClothingItemDisplay item={item} />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Styling and Props', () => {
    it('applies custom className when image is present', () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/shirt.jpg');
      
      render(<ClothingItemDisplay item={item} className="custom-class" />);
      
      const wrapper = screen.getByAltText('White Shirt').closest('.clothing-item-wrapper');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('applies custom style including z-index when image is present', () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/shirt.jpg');
      const customStyle = { opacity: 0.5 };
      
      render(<ClothingItemDisplay item={item} style={customStyle} />);
      
      const wrapper = screen.getByAltText('White Shirt').closest('.clothing-item-wrapper');
      expect(wrapper).toHaveStyle({ opacity: '0.5' });
    });

    it('applies proper image styling when image is displayed', async () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/shirt.jpg');
      
      render(<ClothingItemDisplay item={item} />);
      
      const img = screen.getByAltText('White Shirt');
      expect(img).toHaveClass('w-full', 'h-full', 'object-contain');
    });
  });

  describe('Error Handling', () => {
    it('maintains loading state until image loads or errors', () => {
      const item = createMockItem('White Shirt', 'Shirt', 'https://example.com/shirt.jpg');
      
      render(<ClothingItemDisplay item={item} />);
      
      // Loading should be visible initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Image should have opacity 0 while loading
      const img = screen.getByAltText('White Shirt');
      expect(img).toHaveClass('opacity-0');
    });
  });
});