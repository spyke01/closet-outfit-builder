import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TopBar } from '../top-bar';
import { SelectionStrip } from '../selection-strip';
import { ItemsGrid } from '../items-grid';
import { OutfitDisplay } from '../outfit-display';

import { Logo } from '../logo';
import { WeatherWidget } from '../weather-widget';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getClaims: () => Promise.resolve({ data: null, error: null }),
    },
  }),
}));

describe('Migrated Components', () => {
  describe('TopBar', () => {
    it('renders without user', () => {
      render(<TopBar />);
      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });

    it('renders with user', () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };
      
      render(<TopBar user={mockUser} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });



  describe('Logo', () => {
    it('renders logo', () => {
      render(<Logo />);
      expect(screen.getByText('What to Wear')).toBeInTheDocument();
    });
  });

  describe('WeatherWidget', () => {
    it('renders loading state', () => {
      render(<WeatherWidget loading={true} />);
      expect(screen.getByText('Loading weather...')).toBeInTheDocument();
    });

    it('renders error state', () => {
      const error = { message: 'Weather unavailable', retryable: true };
      render(<WeatherWidget error={error} />);
      expect(screen.getByText('Weather unavailable')).toBeInTheDocument();
    });

    it('renders forecast data', () => {
      const forecast = [
        {
          date: '2024-01-01',
          temperature: 72,
          condition: 'sunny',
          icon: 'sun',
        },
      ];
      
      render(<WeatherWidget forecast={forecast} />);
      expect(screen.getByText('72°')).toBeInTheDocument();
      expect(screen.getByText('sunny')).toBeInTheDocument();
    });
  });

  describe('ItemsGrid', () => {
    it('renders empty state', () => {
      render(
        <ItemsGrid
          category="Shirts"
          items={[]}
          onItemSelect={vi.fn()}
        />
      );
      expect(screen.getByText('Choose Shirts')).toBeInTheDocument();
      expect(screen.getByText('No items available in this category.')).toBeInTheDocument();
    });

    it('renders with items', () => {
      const items = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          category_id: 'shirt-category-id',
          name: 'Test Shirt',
          brand: 'Test Brand',
          season: ['All'],
          active: true,
        },
      ];

      render(
        <ItemsGrid
          category="Shirts"
          items={items}
          onItemSelect={vi.fn()}
        />
      );
      
      expect(screen.getByText('Choose Shirts')).toBeInTheDocument();
      expect(screen.getByText('1 item found')).toBeInTheDocument();
      expect(screen.getByText('Test Brand Test Shirt')).toBeInTheDocument();
    });
  });

  describe('OutfitDisplay', () => {
    it('renders empty state', () => {
      const emptySelection = {
        tuck_style: 'Untucked' as const,
      };

      render(
        <OutfitDisplay
          selection={emptySelection}
          onRandomize={vi.fn()}
        />
      );
      
      expect(screen.getByText('Start Building Your Look')).toBeInTheDocument();
      expect(screen.getByText('Get Random Outfit')).toBeInTheDocument();
    });

    it('renders with complete outfit', () => {
      const completeSelection = {
        shirt: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          category_id: 'shirt-category-id',
          name: 'Test Shirt',
          season: ['All'],
          active: true,
        },
        pants: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          category_id: 'pants-category-id',
          name: 'Test Pants',
          season: ['All'],
          active: true,
        },
        shoes: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          category_id: 'shoes-category-id',
          name: 'Test Shoes',
          season: ['All'],
          active: true,
        },
        tuck_style: 'Untucked' as const,
      };

      render(
        <OutfitDisplay
          selection={completeSelection}
          onRandomize={vi.fn()}
        />
      );
      
      expect(screen.getByText('Current Outfit')).toBeInTheDocument();
      expect(screen.getByText('Try Another Combination')).toBeInTheDocument();
    });
  });

  describe('SelectionStrip', () => {
    it('renders null when no anchor item', () => {
      const { container } = render(
        <SelectionStrip
          selection={{ tuck_style: 'Untucked' }}
          anchorItem={null}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders with anchor item', () => {
      const anchorItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: 'Shirt',
        name: 'Anchor Shirt',
        season: ['All'],
        active: true,
      };

      render(
        <SelectionStrip
          selection={{ tuck_style: 'Untucked' }}
          anchorItem={anchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );
      
      expect(screen.getByText(/Building from.*Anchor Shirt/)).toBeInTheDocument();
    });
  });
});