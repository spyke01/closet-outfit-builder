'use client';

import React, { useState, useMemo } from 'react';
import { useOutfits, useDeleteOutfit } from '@/lib/hooks/use-outfits';
import { OutfitCard } from '@/components/outfit-card';
import { OutfitList } from '@/components/outfit-list';
import { OutfitSimpleLayout } from '@/components/outfit-simple-layout';
import { OutfitGridLayout } from '@/components/outfit-grid-layout';
import { ScoreCircle } from '@/components/score-circle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Filter, 
  Grid, 
  List, 
  Search,
  Heart,
  Star,
  AlertCircle,
  Shirt,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { Outfit } from '@/lib/types/database';
import { convertOutfitToSelection, canGenerateScoreBreakdown } from '@/lib/utils/outfit-conversion';

export function OutfitsPageClient() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [layoutType, setLayoutType] = useState<'grid' | 'visual'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'loved' | 'curated' | 'generated'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score' | 'name'>('newest');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [outfitToDelete, setOutfitToDelete] = useState<Outfit | null>(null);

  // Fetch data
  const { data: outfits = [], isLoading, error } = useOutfits();
  const deleteOutfitMutation = useDeleteOutfit();

  // Filter and sort outfits
  const filteredAndSortedOutfits = useMemo(() => {
    let filtered = outfits.filter(outfit => {
      // Search filter
      const matchesSearch = !searchTerm || 
        outfit.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outfit.items?.some(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Category filter
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'loved' && outfit.loved) ||
        (filterBy === 'curated' && outfit.source === 'curated') ||
        (filterBy === 'generated' && outfit.source === 'generated');

      return matchesSearch && matchesFilter;
    });

    // Sort outfits
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [outfits, searchTerm, filterBy, sortBy]);

  const handleOutfitSelect = (outfit: Outfit) => {
    window.location.href = `/outfits/${outfit.id}`;
  };

  const handleDeleteOutfit = async (outfit: Outfit) => {
    setOutfitToDelete(outfit);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!outfitToDelete) return;

    try {
      await deleteOutfitMutation.mutateAsync(outfitToDelete.id);
      setShowDeleteConfirm(false);
      setOutfitToDelete(null);
    } catch (error) {
      console.error('Failed to delete outfit:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading outfits...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load outfits: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My Outfits</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {outfits.length} outfit{outfits.length !== 1 ? 's' : ''} in your collection
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
            </Button>
            
            <div className="flex border border-stone-300 dark:border-slate-600 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List size={16} />
              </Button>
            </div>
            
            {/* Layout Type Toggle (only show in grid mode) */}
            {viewMode === 'grid' && (
              <div className="flex border border-stone-300 dark:border-slate-600 rounded-lg">
                <Button
                  variant={layoutType === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayoutType('grid')}
                  className="rounded-r-none text-xs px-2"
                  title="Organized Grid"
                >
                  Grid
                </Button>
                <Button
                  variant={layoutType === 'visual' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayoutType('visual')}
                  className="rounded-l-none text-xs px-2"
                  title="Original Visual"
                >
                  Visual
                </Button>
              </div>
            )}
            
            <Link href="/outfits/create">
              <Button className="flex items-center gap-2">
                <Plus size={16} />
                Create Outfit
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search outfits..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Filter
                  </label>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="all">All Outfits</option>
                    <option value="loved">Loved</option>
                    <option value="curated">Curated</option>
                    <option value="generated">Generated</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="score">Highest Score</option>
                    <option value="name">Name</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterBy('all');
                      setSortBy('newest');
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {filteredAndSortedOutfits.length} outfit{filteredAndSortedOutfits.length !== 1 ? 's' : ''} found
            {(searchTerm || filterBy !== 'all') && (
              <span className="ml-2">
                ({outfits.length} total)
              </span>
            )}
          </p>
        </div>

        {/* Content */}
        {filteredAndSortedOutfits.length === 0 ? (
          <div className="text-center py-12">
            {outfits.length === 0 ? (
              <>
                <Shirt className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No outfits yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Start creating outfits from your wardrobe items.
                </p>
                <Link href="/outfits/create">
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Create Your First Outfit
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No outfits match your criteria
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Try adjusting your search or filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterBy('all');
                  }}
                >
                  Clear Filters
                </Button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedOutfits.map(outfit => (
              <Card
                key={outfit.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden"
                onClick={() => handleOutfitSelect(outfit)}
              >
                {/* Card Header */}
                <CardContent className="p-0">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate flex-1 mr-2">
                        {outfit.name || 'Untitled Outfit'}
                      </h3>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {typeof outfit.score === 'number' && (
                          <ScoreCircle
                            score={outfit.score}
                            size="sm"
                            showLabel={false}
                            outfit={canGenerateScoreBreakdown(outfit) ? convertOutfitToSelection(outfit) || undefined : undefined}
                            className="scale-75 -m-2"
                          />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOutfit(outfit);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual Layout */}
                  <div className="relative h-80">
                    {layoutType === 'grid' && (
                      <OutfitGridLayout
                        items={outfit.items || []}
                        size="medium"
                        className="w-full h-full"
                      />
                    )}
                    {layoutType === 'visual' && (
                      <OutfitSimpleLayout
                        items={outfit.items || []}
                        size="medium"
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  
                  {/* Bottom info */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>{outfit.source === 'curated' ? 'Curated' : 'Generated'}</span>
                        {outfit.tuck_style && (
                          <>
                            <span>•</span>
                            <span>{outfit.tuck_style}</span>
                          </>
                        )}
                        {outfit.loved && (
                          <>
                            <span>•</span>
                            <Heart className="h-3 w-3 fill-current text-red-500" />
                          </>
                        )}
                      </div>
                      
                      {outfit.items && outfit.items.length > 0 && (
                        <span>
                          {outfit.items.length} item{outfit.items.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <OutfitList
            outfits={filteredAndSortedOutfits}
            onOutfitSelect={handleOutfitSelect}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && outfitToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Delete Outfit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Are you sure you want to delete &quot;{outfitToDelete.name || 'this outfit'}&quot;? This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setOutfitToDelete(null);
                    }}
                    disabled={deleteOutfitMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={deleteOutfitMutation.isPending}
                  >
                    {deleteOutfitMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}