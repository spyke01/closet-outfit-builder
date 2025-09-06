import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ScoreBreakdown as ScoreBreakdownType } from '../types';

describe('ScoreBreakdown', () => {
  const mockBreakdown: ScoreBreakdownType = {
    formalityScore: 74,
    formalityWeight: 0.93,
    consistencyBonus: 7,
    consistencyWeight: 0.07,
    layerAdjustments: [
      {
        itemId: 'j1',
        itemName: 'Formal Jacket',
        category: 'Jacket/Overshirt',
        originalScore: 8,
        adjustedScore: 8,
        weight: 1.0,
        reason: 'visible'
      },
      {
        itemId: 's1',
        itemName: 'Formal Shirt',
        category: 'Shirt',
        originalScore: 7,
        adjustedScore: 4.9,
        weight: 0.7,
        reason: 'covered'
      },
      {
        itemId: 'u1',
        itemName: 'Basic Undershirt',
        category: 'Undershirt',
        originalScore: 1,
        adjustedScore: 0.3,
        weight: 0.3,
        reason: 'covered'
      },
      {
        itemId: 'b1',
        itemName: 'Formal Belt',
        category: 'Belt',
        originalScore: 7,
        adjustedScore: 5.6,
        weight: 0.8,
        reason: 'accessory'
      }
    ],
    total: 81,
    percentage: 81
  };

  describe('Simple Display Mode', () => {
    it('should show only percentage and total points when showDetails is false', () => {
      render(<ScoreBreakdown breakdown={mockBreakdown} showDetails={false} />);
      
      expect(screen.getByText('81%')).toBeInTheDocument();
      expect(screen.getByText('81 points')).toBeInTheDocument();
      
      // Should not show detailed breakdown
      expect(screen.queryByText('Formality')).not.toBeInTheDocument();
      expect(screen.queryByText('Consistency')).not.toBeInTheDocument();
    });

    it('should show simple display by default', () => {
      render(<ScoreBreakdown breakdown={mockBreakdown} />);
      
      expect(screen.getByText('81%')).toBeInTheDocument();
      expect(screen.getByText('81 points')).toBeInTheDocument();
    });
  });

  describe('Detailed Display Mode', () => {
    it('should show complete breakdown when showDetails is true', () => {
      render(<ScoreBreakdown breakdown={mockBreakdown} showDetails={true} />);
      
      // Should show total score
      expect(screen.getByText('Total Score')).toBeInTheDocument();
      const totalPercentages = screen.getAllByText('81%');
      expect(totalPercentages).toHaveLength(2); // One in header, one in total section
      
      // Should show formality with weight
      expect(screen.getByText('Formality (93% weight)')).toBeInTheDocument();
      expect(screen.getByText('74%')).toBeInTheDocument();
      
      // Should show consistency with weight
      expect(screen.getByText('Consistency (7% weight)')).toBeInTheDocument();
      expect(screen.getByText('+7%')).toBeInTheDocument();
      
      // Should show total
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should display layer adjustments with weight indicators', () => {
      render(<ScoreBreakdown breakdown={mockBreakdown} showDetails={true} />);
      
      // Should show item names
      expect(screen.getByText('Formal Jacket')).toBeInTheDocument();
      expect(screen.getByText('Formal Shirt')).toBeInTheDocument();
      expect(screen.getByText('Basic Undershirt')).toBeInTheDocument();
      expect(screen.getByText('Formal Belt')).toBeInTheDocument();
      
      // Should show calculations
      expect(screen.getByText('8 × 1 = 8.0')).toBeInTheDocument();
      expect(screen.getByText('7 × 0.7 = 4.9')).toBeInTheDocument();
      expect(screen.getByText('1 × 0.3 = 0.3')).toBeInTheDocument();
      expect(screen.getByText('7 × 0.8 = 5.6')).toBeInTheDocument();
    });

    it('should handle empty layer adjustments', () => {
      const emptyBreakdown: ScoreBreakdownType = {
        ...mockBreakdown,
        layerAdjustments: []
      };
      
      render(<ScoreBreakdown breakdown={emptyBreakdown} showDetails={true} />);
      
      // Should still show formality and consistency
      expect(screen.getByText('Formality (93% weight)')).toBeInTheDocument();
      expect(screen.getByText('Consistency (7% weight)')).toBeInTheDocument();
      
      // Should not show any item adjustments
      expect(screen.queryByText('Formal Jacket')).not.toBeInTheDocument();
    });

    it('should truncate long item names with title attribute', () => {
      const longNameBreakdown: ScoreBreakdownType = {
        ...mockBreakdown,
        layerAdjustments: [{
          itemId: 'long1',
          itemName: 'Very Long Item Name That Should Be Truncated',
          category: 'Shirt',
          originalScore: 5,
          adjustedScore: 5,
          weight: 1.0,
          reason: 'visible'
        }]
      };
      
      render(<ScoreBreakdown breakdown={longNameBreakdown} showDetails={true} />);
      
      const truncatedElement = screen.getByText('Very Long Item Name That Should Be Truncated');
      expect(truncatedElement).toHaveAttribute('title', 'Very Long Item Name That Should Be Truncated');
      expect(truncatedElement).toHaveClass('truncate', 'max-w-[120px]');
    });
  });

  describe('Weight Indicators', () => {
    it('should show correct weight indicators for different reasons', () => {
      render(<ScoreBreakdown breakdown={mockBreakdown} showDetails={true} />);
      
      // Check that weight indicators are present (we can't easily test the specific symbols without more complex setup)
      const indicators = screen.getAllByRole('generic').filter(el => 
        el.className.includes('inline-block') && el.className.includes('rounded')
      );
      
      // Should have 4 weight indicators (one for each adjustment)
      expect(indicators).toHaveLength(4);
    });
  });
});