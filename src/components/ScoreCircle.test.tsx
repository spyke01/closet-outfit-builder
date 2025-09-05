import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreCircle } from './ScoreCircle';
import { OutfitSelection } from '../types';

describe('ScoreCircle', () => {
  const mockOutfit: OutfitSelection = {
    shirt: {
      id: 'shirt-1',
      name: 'White Shirt',
      category: 'Shirt',
      formalityScore: 8
    },
    pants: {
      id: 'pants-1',
      name: 'Black Trousers',
      category: 'Pants',
      formalityScore: 7
    },
    shoes: {
      id: 'shoes-1',
      name: 'Oxford Shoes',
      category: 'Shoes',
      formalityScore: 9
    },
    watch: {
      id: 'watch-1',
      name: 'Dress Watch',
      category: 'Watch',
      formalityScore: 8
    }
  };

  it('renders score circle with percentage', () => {
    render(<ScoreCircle score={85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows tooltip on hover when outfit data is provided', async () => {
    render(<ScoreCircle score={85} outfit={mockOutfit} />);
    
    const scoreCircle = screen.getByText('85%').closest('div');
    expect(scoreCircle).toBeInTheDocument();
    
    // Hover over the score circle
    if (scoreCircle) {
      fireEvent.mouseEnter(scoreCircle);
      
      // Should show breakdown
      expect(screen.getByText('Total Score')).toBeInTheDocument();
      expect(screen.getByText('Formality')).toBeInTheDocument();
      expect(screen.getByText('Consistency')).toBeInTheDocument();
    }
  });

  it('does not show tooltip when no outfit data is provided', () => {
    render(<ScoreCircle score={85} />);
    
    const scoreCircle = screen.getByText('85%').closest('div');
    if (scoreCircle) {
      fireEvent.mouseEnter(scoreCircle);
      
      // Should not show breakdown
      expect(screen.queryByText('Total Score')).not.toBeInTheDocument();
    }
  });

  it('updates label when outfit data is provided', () => {
    render(<ScoreCircle score={85} outfit={mockOutfit} showLabel={true} />);
    expect(screen.getByText('Outfit Score')).toBeInTheDocument();
  });

  it('shows formality score label when no outfit data', () => {
    render(<ScoreCircle score={85} showLabel={true} />);
    expect(screen.getByText('Formality Score')).toBeInTheDocument();
  });
});