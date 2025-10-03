import React, { useState } from 'react';
import { useOptimizedOutfitGeneration } from '../hooks/useOptimizedOutfitGeneration';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { OptimizedOutfitList } from '../components/OptimizedOutfitList';
import { OptimizedItemsGrid } from '../components/OptimizedItemsGrid';
import { WardrobeItem } from '../types';

/**
 * Demo component showcasing React 19 concurrent features and performance optimization
 * 
 * Features demonstrated:
 * - useOptimizedOutfitGeneration with startTransition and useDeferredValue
 * - Performance monitoring with Core Web Vitals tracking
 * - Optimized components with concurrent rendering
 * - Sub-100ms interaction response times
 */
export const ConcurrentFeaturesDemo: React.FC = () => {
  const {
    outfits,
    searchTerm,
    setSearchTerm,
    filterCriteria,
    setFilterCriteria,
    generateOutfits,
    generateRandomOutfits,
    clearOutfits,
    isGenerating,
    isFiltering
  } = useOptimizedOutfitGeneration();

  const {
    metrics,
    measureInteraction,
    recordCustomMetric,
    getPerformanceReport,
    resetMetrics
  } = usePerformanceMonitoring();

  const [selectedCategory, setSelectedCategory] = useState<'outfits' | 'items'>('outfits');
  const [performanceReport, setPerformanceReport] = useState<string>('');

  // Mock data for demonstration
  const mockAnchorItem: WardrobeItem = {
    id: 'demo-jacket',
    name: 'Demo Blue Jacket',
    category: 'Jacket/Overshirt',
    formality: 'casual',
    capsuleTags: ['Refined']
  };

  const mockItems: WardrobeItem[] = [
    {
      id: 'item-1',
      name: 'Blue Oxford Shirt',
      category: 'Shirt',
      formality: 'casual',
      capsuleTags: ['Refined']
    },
    {
      id: 'item-2',
      name: 'White T-Shirt',
      category: 'Shirt',
      formality: 'casual',
      capsuleTags: ['Adventurer']
    },
    {
      id: 'item-3',
      name: 'Navy Polo',
      category: 'Shirt',
      formality: 'casual',
      capsuleTags: ['Crossover']
    }
  ];

  const handleGenerateOutfits = () => {
    measureInteraction('generate-outfits', () => {
      const startTime = performance.now();
      generateOutfits(mockAnchorItem);
      const endTime = performance.now();
      recordCustomMetric('outfitGenerationTime', endTime - startTime);
    });
  };

  const handleGenerateRandom = () => {
    measureInteraction('generate-random', () => {
      generateRandomOutfits(5);
    });
  };

  const handleSearch = (value: string) => {
    measureInteraction('search', () => {
      const startTime = performance.now();
      setSearchTerm(value);
      const endTime = performance.now();
      recordCustomMetric('searchResponseTime', endTime - startTime);
    });
  };

  const handleFilter = (criteria: any) => {
    measureInteraction('filter', () => {
      const startTime = performance.now();
      setFilterCriteria(criteria);
      const endTime = performance.now();
      recordCustomMetric('filterResponseTime', endTime - startTime);
    });
  };

  const handleGetReport = () => {
    const report = getPerformanceReport();
    setPerformanceReport(report);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
          React 19 Concurrent Features Demo
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This demo showcases React 19's concurrent features including startTransition, 
          useDeferredValue, and performance monitoring with Core Web Vitals tracking.
        </p>

        {/* Performance Status */}
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Performance Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600 dark:text-blue-400">Avg Response:</span>
              <span className="ml-2 font-mono">
                {metrics.interactionResponse.average.toFixed(1)}ms
              </span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">P95 Response:</span>
              <span className="ml-2 font-mono">
                {metrics.interactionResponse.p95.toFixed(1)}ms
              </span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">Samples:</span>
              <span className="ml-2 font-mono">
                {metrics.interactionResponse.samples.length}
              </span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">Status:</span>
              <span className={`ml-2 font-semibold ${
                metrics.interactionResponse.average <= 100 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {metrics.interactionResponse.average <= 100 ? '✅ GOOD' : '❌ SLOW'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Demo Controls
          </h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleGenerateOutfits}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Outfits'}
            </button>
            <button
              onClick={handleGenerateRandom}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Random (5)
            </button>
            <button
              onClick={clearOutfits}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Outfits
            </button>
            <button
              onClick={handleGetReport}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Performance Report
            </button>
            <button
              onClick={resetMetrics}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset Metrics
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search Term
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search outfits..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Min Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={filterCriteria.minScore || ''}
                onChange={(e) => handleFilter({ 
                  ...filterCriteria, 
                  minScore: e.target.value ? Number(e.target.value) : undefined 
                })}
                placeholder="Min score"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Source Filter
              </label>
              <select
                value={filterCriteria.source || ''}
                onChange={(e) => handleFilter({ 
                  ...filterCriteria, 
                  source: e.target.value || undefined 
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Sources</option>
                <option value="curated">Curated</option>
                <option value="generated">Generated</option>
              </select>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">Filtering:</span>
              <span className={`font-semibold ${
                isFiltering ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {isFiltering ? 'In Progress' : 'Complete'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">Outfits:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {outfits.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
          <button
            onClick={() => setSelectedCategory('outfits')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              selectedCategory === 'outfits'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Optimized Outfit List
          </button>
          <button
            onClick={() => setSelectedCategory('items')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              selectedCategory === 'items'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Optimized Items Grid
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedCategory === 'outfits' ? (
        <OptimizedOutfitList
          outfits={outfits}
          onOutfitSelect={(outfit) => console.log('Selected outfit:', outfit)}
          searchTerm={searchTerm}
          filterBy={filterCriteria}
          isLoading={isGenerating}
        />
      ) : (
        <OptimizedItemsGrid
          category="Shirt"
          items={mockItems}
          onItemSelect={(item) => console.log('Selected item:', item)}
        />
      )}

      {/* Performance Report Modal */}
      {performanceReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Performance Report
              </h3>
              <button
                onClick={() => setPerformanceReport('')}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <pre className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto">
              {performanceReport}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};