'use client';

import React from 'react';
import { ScoreCircle, type ScoreBreakdownData } from '@/components/score-circle';
import { type OutfitSelection } from '@/lib/schemas';

const mockOutfit: OutfitSelection = {
  shirt: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Blue Oxford Shirt',
    category_id: '550e8400-e29b-41d4-a716-446655440002',
    formality_score: 7,
    brand: 'Brooks Brothers',
    season: ['All'],
    active: true
  },
  pants: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Navy Chinos',
    category_id: '550e8400-e29b-41d4-a716-446655440004',
    formality_score: 6,
    brand: 'J.Crew',
    season: ['All'],
    active: true
  },
  shoes: {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Brown Loafers',
    category_id: '550e8400-e29b-41d4-a716-446655440006',
    formality_score: 8,
    brand: 'Cole Haan',
    season: ['All'],
    active: true
  },
  belt: {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Brown Leather Belt',
    category_id: '550e8400-e29b-41d4-a716-446655440008',
    formality_score: 7,
    brand: 'Coach',
    season: ['All'],
    active: true
  },
  tuck_style: 'Tucked'
};

const mockBreakdown: ScoreBreakdownData = {
  formalityScore: 70,
  formalityWeight: 0.7,
  consistencyBonus: 15,
  consistencyWeight: 0.3,
  layerAdjustments: [
    {
      itemId: '550e8400-e29b-41d4-a716-446655440001',
      itemName: 'Blue Oxford Shirt',
      category: 'shirt',
      originalScore: 7,
      adjustedScore: 7,
      weight: 1.0,
      reason: 'visible'
    },
    {
      itemId: '550e8400-e29b-41d4-a716-446655440003',
      itemName: 'Navy Chinos',
      category: 'pants',
      originalScore: 6,
      adjustedScore: 6,
      weight: 1.0,
      reason: 'visible'
    },
    {
      itemId: '550e8400-e29b-41d4-a716-446655440005',
      itemName: 'Brown Loafers',
      category: 'shoes',
      originalScore: 8,
      adjustedScore: 8,
      weight: 1.0,
      reason: 'visible'
    },
    {
      itemId: '550e8400-e29b-41d4-a716-446655440007',
      itemName: 'Brown Leather Belt',
      category: 'belt',
      originalScore: 7,
      adjustedScore: 5.6,
      weight: 0.8,
      reason: 'accessory'
    }
  ],
  total: 85,
  percentage: 85
};

export default function TestScorePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
          Enhanced Score Display Demo
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Small Score Circle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Small Score Circle
            </h2>
            <div className="flex justify-center">
              <ScoreCircle
                score={85}
                size="sm"
                showLabel={true}
                outfit={mockOutfit}
                breakdown={mockBreakdown}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              Hover or click to see detailed breakdown
            </p>
          </div>

          {/* Medium Score Circle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Medium Score Circle
            </h2>
            <div className="flex justify-center">
              <ScoreCircle
                score={72}
                size="md"
                showLabel={true}
                outfit={mockOutfit}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              Auto-calculated breakdown from outfit data
            </p>
          </div>

          {/* Large Score Circle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Large Score Circle
            </h2>
            <div className="flex justify-center">
              <ScoreCircle
                score={92}
                size="lg"
                showLabel={true}
                breakdown={mockBreakdown}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              High score with detailed breakdown
            </p>
          </div>

          {/* Score without breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Simple Score (No Breakdown)
            </h2>
            <div className="flex justify-center">
              <ScoreCircle
                score={58}
                size="md"
                showLabel={true}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              No hover effect - no breakdown data
            </p>
          </div>

          {/* Invalid Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Invalid Score Handling
            </h2>
            <div className="flex justify-center">
              <ScoreCircle
                score={NaN}
                size="md"
                showLabel={true}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              Graceful handling of invalid scores
            </p>
          </div>

          {/* Different Score Ranges */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Score Color Ranges
            </h2>
            <div className="flex justify-center space-x-4">
              <ScoreCircle score={95} size="sm" showLabel={false} />
              <ScoreCircle score={75} size="sm" showLabel={false} />
              <ScoreCircle score={45} size="sm" showLabel={false} />
              <ScoreCircle score={25} size="sm" showLabel={false} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              Green, Yellow, Orange, Red color coding
            </p>
          </div>
        </div>

        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Features Implemented
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>✅ Interactive popover with detailed score breakdown</li>
            <li>✅ Visual indicators for formality, style consistency, and compatibility factors</li>
            <li>✅ Explanatory tooltips for each scoring component</li>
            <li>✅ Weight indicators showing item visibility and importance</li>
            <li>✅ Responsive design that works across all outfit display contexts</li>
            <li>✅ Keyboard navigation support (Tab + Enter/Space)</li>
            <li>✅ Automatic breakdown calculation from outfit data</li>
            <li>✅ Graceful error handling for invalid data</li>
            <li>✅ Multiple size variants (sm, md, lg)</li>
            <li>✅ Color-coded score ranges</li>
            <li>✅ Smart popover positioning (top, bottom, left, right)</li>
            <li>✅ Viewport boundary detection and overflow prevention</li>
            <li>✅ Automatic repositioning on window resize/scroll</li>
          </ul>
        </div>

        {/* Edge positioning test */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Edge Positioning Test
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            These score circles are positioned near the edges to test popover positioning:
          </p>
          
          <div className="relative h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            {/* Top left corner */}
            <div className="absolute top-2 left-2">
              <ScoreCircle
                score={88}
                size="sm"
                showLabel={false}
                breakdown={mockBreakdown}
              />
            </div>
            
            {/* Top right corner */}
            <div className="absolute top-2 right-2">
              <ScoreCircle
                score={76}
                size="sm"
                showLabel={false}
                breakdown={mockBreakdown}
              />
            </div>
            
            {/* Bottom left corner */}
            <div className="absolute bottom-2 left-2">
              <ScoreCircle
                score={92}
                size="sm"
                showLabel={false}
                breakdown={mockBreakdown}
              />
            </div>
            
            {/* Bottom right corner */}
            <div className="absolute bottom-2 right-2">
              <ScoreCircle
                score={64}
                size="sm"
                showLabel={false}
                breakdown={mockBreakdown}
              />
            </div>
            
            {/* Center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <ScoreCircle
                score={85}
                size="md"
                showLabel={true}
                breakdown={mockBreakdown}
              />
            </div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Try hovering over the score circles in different positions to see how the popover adapts its placement.
          </p>
        </div>
      </div>
    </div>
  );
}