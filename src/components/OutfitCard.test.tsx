import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OutfitCard } from './OutfitCard';
import { OutfitSelection } from '../types';

// Mock the OutfitLayout component
vi.mock('./OutfitLayout', () => ({
  OutfitLayout: ({ selection, size, className }: any) => (
    <div data-testid="outfit-layout" data-size={size} className={className}>
      Mock Outfit Layout for {selection.shirt?.name || 'No shirt'}
    </div>
  )
}));

const mockOutfit: OutfitSelection = {
  jacket: {
    id: '1',
    name: 'Navy Blazer',
    category: 'Jacket/Overshirt',
    formalityScore: 8
  },
  shirt: {
    id: '2',
    name: 'White OCBD',
    category: 'Shirt',
    formalityScore: 7
  },
  pants: {
    id: '3',
    name: 'Khaki Chinos',
    category: 'Pants',
    formalityScore: 6
  },
  shoes: {
    id: '4',
    name: 'Brown Loafers',
    category: 'Shoes',
    formalityScore: 7
  }
};

describe('OutfitCard Flip Functionality', () => {
  it('renders compact variant without flip functionality by default', () => {
    render(<OutfitCard outfit={mockOutfit} variant="compact" />);
    
    expect(screen.getByText('Navy Blazer')).toBeInTheDocument();
    expect(screen.queryByTitle('View visual layout')).not.toBeInTheDocument();
  });

  it('renders flip button when enableFlip is true', () => {
    render(<OutfitCard outfit={mockOutfit} variant="compact" enableFlip={true} />);
    
    expect(screen.getByText('View Mockup')).toBeInTheDocument();
  });

  it('flips to visual view when flip button is clicked', async () => {
    render(<OutfitCard outfit={mockOutfit} variant="compact" enableFlip={true} />);
    
    const flipButton = screen.getByText('View Mockup');
    fireEvent.click(flipButton);

    // Should show loading state initially
    expect(screen.getByText('Visual Mockup')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('outfit-layout')).toBeInTheDocument();
    }, { timeout: 500 });

    // Should show back button
    expect(screen.getByText('Back to Details')).toBeInTheDocument();
  });

  it('flips back to text view when back button is clicked', async () => {
    render(<OutfitCard outfit={mockOutfit} variant="compact" enableFlip={true} />);
    
    // Flip to visual view
    const flipButton = screen.getByText('View Mockup');
    fireEvent.click(flipButton);

    await waitFor(() => {
      expect(screen.getByTestId('outfit-layout')).toBeInTheDocument();
    });

    // Flip back to text view
    const backButton = screen.getByText('Back to Details');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Navy Blazer')).toBeInTheDocument();
    });
  });

  it('renders detailed variant with flip functionality', () => {
    render(<OutfitCard outfit={mockOutfit} variant="detailed" enableFlip={true} />);
    
    expect(screen.getByText('Your Curated Outfit')).toBeInTheDocument();
    expect(screen.getByText('View Mockup')).toBeInTheDocument();
  });

  it('starts flipped when defaultFlipped is true', () => {
    render(<OutfitCard outfit={mockOutfit} variant="compact" enableFlip={true} defaultFlipped={true} />);
    
    expect(screen.getByText('Visual Mockup')).toBeInTheDocument();
  });

  it('prevents flip when loading', async () => {
    render(<OutfitCard outfit={mockOutfit} variant="compact" enableFlip={true} />);
    
    const flipButton = screen.getByText('View Mockup');
    fireEvent.click(flipButton);

    // Try to click again while loading - get all loading buttons and check the first one
    const loadingButtons = screen.getAllByText('Loading...');
    expect(loadingButtons[0]).toBeDisabled();
  });

  it('calls onClick when card is clicked and flip is disabled', () => {
    const mockOnClick = vi.fn();
    render(<OutfitCard outfit={mockOutfit} variant="compact" onClick={mockOnClick} />);
    
    const card = screen.getByText('Navy Blazer').closest('div');
    fireEvent.click(card!);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('does not call onClick when flip button is clicked', () => {
    const mockOnClick = vi.fn();
    render(<OutfitCard outfit={mockOutfit} variant="compact" enableFlip={true} onClick={mockOnClick} />);
    
    const flipButton = screen.getByText('View Mockup');
    fireEvent.click(flipButton);

    expect(mockOnClick).not.toHaveBeenCalled();
  });
});