import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScoreCircle, type ScoreBreakdownData } from '../score-circle';
import { type OutfitSelection } from '@/lib/schemas';

// Mock createPortal for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe('ScoreCircle', () => {
  const mockOutfit: OutfitSelection = {
    shirt: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Blue Oxford Shirt',
      category_id: '550e8400-e29b-41d4-a716-446655440002',
      formality_score: 7,
      brand: 'Test Brand'
    },
    pants: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Navy Chinos',
      category_id: '550e8400-e29b-41d4-a716-446655440004',
      formality_score: 6,
      brand: 'Test Brand'
    },
    shoes: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Brown Loafers',
      category_id: '550e8400-e29b-41d4-a716-446655440006',
      formality_score: 8,
      brand: 'Test Brand'
    },
    tuck_style: 'Tucked'
  };

  const mockBreakdown: ScoreBreakdownData = {
    formalityScore: 70,
    formalityWeight: 0.7,
    consistencyBonus: 10,
    consistencyWeight: 0.3,
    layerAdjustments: [
      {
        itemId: 'shirt-1',
        itemName: 'Blue Oxford Shirt',
        category: 'shirt',
        originalScore: 7,
        adjustedScore: 7,
        weight: 1.0,
        reason: 'visible'
      },
      {
        itemId: 'pants-1',
        itemName: 'Navy Chinos',
        category: 'pants',
        originalScore: 6,
        adjustedScore: 6,
        weight: 1.0,
        reason: 'visible'
      }
    ],
    total: 85,
    percentage: 85
  };

  it('renders score circle with percentage', () => {
    render(<ScoreCircle score={85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows different sizes correctly', () => {
    const { rerender } = render(<ScoreCircle score={75} size="sm" />);
    expect(screen.getByText('75%')).toBeInTheDocument();

    rerender(<ScoreCircle score={75} size="lg" />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows label when enabled', () => {
    render(<ScoreCircle score={90} showLabel={true} />);
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('shows outfit score label when outfit is provided', () => {
    render(<ScoreCircle score={90} showLabel={true} outfit={mockOutfit} />);
    expect(screen.getByText('Outfit Score')).toBeInTheDocument();
  });

  it('handles invalid scores gracefully', () => {
    render(<ScoreCircle score={NaN} />);
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('Invalid Score')).toBeInTheDocument();
  });

  it('shows tooltip on hover when breakdown is available', async () => {
    render(<ScoreCircle score={85} breakdown={mockBreakdown} />);
    
    const scoreCircle = screen.getByText('85%').closest('div');
    expect(scoreCircle).toBeInTheDocument();
    
    if (scoreCircle) {
      fireEvent.mouseEnter(scoreCircle);
      
      await waitFor(() => {
        expect(screen.getByText('Total Score')).toBeInTheDocument();
        expect(screen.getByText('Formality (70% weight)')).toBeInTheDocument();
        expect(screen.getByText('Style Consistency (30% weight)')).toBeInTheDocument();
      });
    }
  });

  it('shows tooltip on click when breakdown is available', async () => {
    render(<ScoreCircle score={85} breakdown={mockBreakdown} />);
    
    const scoreCircle = screen.getByText('85%').closest('div');
    expect(scoreCircle).toBeInTheDocument();
    
    if (scoreCircle) {
      fireEvent.click(scoreCircle);
      
      await waitFor(() => {
        expect(screen.getByText('Total Score')).toBeInTheDocument();
      });
    }
  });

  it('supports keyboard navigation', async () => {
    render(<ScoreCircle score={85} breakdown={mockBreakdown} />);
    
    const scoreCircle = screen.getByText('85%').closest('div');
    expect(scoreCircle).toBeInTheDocument();
    
    if (scoreCircle) {
      scoreCircle.focus();
      fireEvent.keyDown(scoreCircle, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Total Score')).toBeInTheDocument();
      });
    }
  });

  it('calculates breakdown from outfit when no breakdown provided', async () => {
    render(<ScoreCircle score={85} outfit={mockOutfit} />);
    
    const scoreCircle = screen.getByText('85%').closest('div');
    expect(scoreCircle).toBeInTheDocument();
    
    if (scoreCircle) {
      fireEvent.mouseEnter(scoreCircle);
      // Should show calculated breakdown
      await waitFor(() => {
        expect(screen.getByText('Total Score')).toBeInTheDocument();
      });
    }
  });

  it('does not show tooltip when no breakdown or outfit is provided', () => {
    render(<ScoreCircle score={85} />);
    
    const scoreCircle = screen.getByText('85%').closest('div');
    expect(scoreCircle).toBeInTheDocument();
    
    if (scoreCircle) {
      fireEvent.mouseEnter(scoreCircle);
      // Should not show breakdown
      expect(screen.queryByText('Total Score')).not.toBeInTheDocument();
    }
  });

  it('applies correct color classes based on score', () => {
    const { rerender } = render(<ScoreCircle score={90} />);
    expect(screen.getByText('90%')).toHaveClass('text-green-600');

    rerender(<ScoreCircle score={70} />);
    expect(screen.getByText('70%')).toHaveClass('text-yellow-600');

    rerender(<ScoreCircle score={30} />);
    expect(screen.getByText('30%')).toHaveClass('text-red-500');
  });

  it('applies custom className', () => {
    render(<ScoreCircle score={85} className="custom-class" />);
    const container = screen.getByText('85%').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });
});