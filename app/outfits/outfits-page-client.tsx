'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutfits, useDeleteOutfit } from '@/lib/hooks/use-outfits';
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
  AlertCircle,
  Shirt,
  Trash2,
  X
} from 'lucide-react';
import Link from 'next/link';
import { Outfit } from '@/lib/types/database';
import { type OutfitSelection as ScoreOutfitSelection } from '@/lib/schemas';
import { convertOutfitToSelection, canGenerateScoreBreakdown } from '@/lib/utils/outfit-conversion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const FILTER_OPTIONS = ['all', 'loved', 'curated', 'generated'] as const;
const SORT_OPTIONS = ['newest', 'oldest', 'score', 'name'] as const;

type FilterBy = (typeof FILTER_OPTIONS)[number];
type SortBy = (typeof SORT_OPTIONS)[number];

export function OutfitsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [layoutType, setLayoutType] = useState<'grid' | 'visual'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [outfitToDelete, setOutfitToDelete] = useState<Outfit | null>(null);

  // Fetch data
  const { data: outfits = [], isLoading, error } = useOutfits();
  const deleteOutfitMutation = useDeleteOutfit();

  const hasActiveFilters = Boolean(searchTerm || filterBy !== 'all' || sortBy !== 'newest');

  const updateQueryParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParamsKey);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParamsKey]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const nextSearch = params.get('q') ?? '';
    const nextFilter = params.get('filter');
    const nextSort = params.get('sort');
    const nextView = params.get('view');
    const nextLayout = params.get('layout');
    const normalizedFilter: FilterBy = FILTER_OPTIONS.includes(nextFilter as FilterBy) ? nextFilter as FilterBy : 'all';
    const normalizedSort: SortBy = SORT_OPTIONS.includes(nextSort as SortBy) ? nextSort as SortBy : 'newest';
    const normalizedView: 'grid' | 'list' = nextView === 'list' ? 'list' : 'grid';
    const normalizedLayout: 'grid' | 'visual' = nextLayout === 'visual' ? 'visual' : 'grid';

    setSearchTerm(prev => (prev === nextSearch ? prev : nextSearch));
    setFilterBy(prev => (prev === normalizedFilter ? prev : normalizedFilter));
    setSortBy(prev => (prev === normalizedSort ? prev : normalizedSort));
    setViewMode(prev => (prev === normalizedView ? prev : normalizedView));
    setLayoutType(prev => (prev === normalizedLayout ? prev : normalizedLayout));
  }, [searchParamsKey]);

  // Debounce URL sync for search to keep typing responsive.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsKey);
      const currentQuery = params.get('q') ?? '';
      if (currentQuery !== searchTerm) {
        updateQueryParams({ q: searchTerm || null });
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, searchParamsKey, updateQueryParams]);

  // Filter and sort outfits
  const filteredAndSortedOutfits = useMemo(() => {
    const filtered = outfits.filter(outfit => {
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (value: FilterBy) => {
    setFilterBy(value);
    updateQueryParams({ filter: value === 'all' ? null : value });
  };

  const handleSortChange = (value: SortBy) => {
    setSortBy(value);
    updateQueryParams({ sort: value === 'newest' ? null : value });
  };

  const handleViewModeChange = (value: 'grid' | 'list') => {
    setViewMode(value);
    updateQueryParams({ view: value === 'grid' ? null : value });
  };

  const handleLayoutTypeChange = (value: 'grid' | 'visual') => {
    setLayoutType(value);
    updateQueryParams({ layout: value === 'grid' ? null : value });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterBy('all');
    setSortBy('newest');
    updateQueryParams({ q: null, filter: null, sort: null });
  };

  const filterPillBase =
    'h-10 px-4 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading outfits...</p>
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
            <h1 className="text-3xl font-bold text-foreground">My Outfits</h1>
            <p className="text-muted-foreground mt-1">
              {outfits.length} outfit{outfits.length !== 1 ? 's' : ''} in your collection
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 px-4 flex items-center gap-2 bg-card border-border text-foreground hover:bg-muted"
              aria-label={showFilters ? 'Hide advanced filters' : 'Show advanced filters'}
              aria-expanded={showFilters}
            >
              <Filter size={16} />
              More Filters
            </Button>
            
            <div className="flex border border-border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="default"
                  onClick={() => handleViewModeChange('grid')}
                  className="h-10 rounded-r-none"
                >
                  <Grid size={16} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="default"
                  onClick={() => handleViewModeChange('list')}
                  className="h-10 rounded-l-none"
                >
                  <List size={16} />
                </Button>
            </div>
            
            {/* Layout Type Toggle (only show in grid mode) */}
            {viewMode === 'grid' && (
              <div className="flex border border-border rounded-lg">
                <Button
                  variant={layoutType === 'grid' ? 'default' : 'ghost'}
                  size="default"
                  onClick={() => handleLayoutTypeChange('grid')}
                  className="h-10 rounded-r-none text-xs px-3"
                  title="Organized Grid"
                >
                  Grid
                </Button>
                <Button
                  variant={layoutType === 'visual' ? 'default' : 'ghost'}
                  size="default"
                  onClick={() => handleLayoutTypeChange('visual')}
                  className="h-10 rounded-l-none text-xs px-3"
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

        <Card className="rounded-lg bg-card border-border">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="relative lg:col-span-2">
                <label htmlFor="outfit-search" className="sr-only">
                  Search outfits
                </label>
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  id="outfit-search"
                  type="search"
                  name="search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Search outfits by name, item, or brand..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                  aria-label="Search outfits by name, item, or brand"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map(option => {
                  const labelMap: Record<FilterBy, string> = {
                    all: 'All',
                    loved: 'Loved',
                    curated: 'Curated',
                    generated: 'Generated',
                  };
                  const selected = filterBy === option;
                  return (
                    <button
                      key={option}
                      onClick={() => handleFilterChange(option)}
                      aria-pressed={selected}
                      className={`${filterPillBase} ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {labelMap[option]}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Active:</span>
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-foreground hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
                    aria-label="Clear search filter"
                  >
                    Search: {searchTerm}
                    <X size={14} />
                  </button>
                )}
                {filterBy !== 'all' && (
                  <button
                    onClick={() => handleFilterChange('all')}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-foreground hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
                    aria-label="Clear type filter"
                  >
                    Type: {filterBy}
                    <X size={14} />
                  </button>
                )}
                {sortBy !== 'newest' && (
                  <button
                    onClick={() => handleSortChange('newest')}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-foreground hover:bg-secondary/70 hover:border-foreground/25 transition-colors"
                    aria-label="Reset sort order"
                  >
                    Sort: {sortBy}
                    <X size={14} />
                  </button>
                )}
                <Button variant="ghost" size="default" className="h-10 px-4" onClick={clearFilters}>
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="rounded-lg bg-card border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="outfit-sort" className="text-sm font-medium text-muted-foreground">
                  Sort by
                </label>
                <select
                  id="outfit-sort"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortBy)}
                  className="h-10 min-w-[220px] px-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                  aria-label="Sort outfits by criteria"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="score">Highest Score</option>
                  <option value="name">Name</option>
                </select>
                <Button
                  variant="outline"
                  size="default"
                  onClick={clearFilters}
                  className="h-10 px-4 bg-card border-border text-foreground hover:bg-muted"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
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
                <Shirt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No outfits yet
                </h3>
                <p className="text-muted-foreground mb-4">
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
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No outfits match your criteria
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters.
                </p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedOutfits.map(outfit => (
              <div
                key={outfit.id}
                className="border border-border rounded-lg bg-card shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => handleOutfitSelect(outfit)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOutfitSelect(outfit);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {/* Card Header */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm truncate flex-1 mr-2">
                      {outfit.name || 'Untitled Outfit'}
                    </h3>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {typeof outfit.score === 'number' && (
                        <ScoreCircle
                          score={outfit.score}
                          size="sm"
                          showLabel={false}
                          outfit={canGenerateScoreBreakdown(outfit) ? (() => {
                            const selection = convertOutfitToSelection(outfit);
                            return selection ? ({
                              ...selection,
                              tuck_style: selection.tuck_style || 'Untucked'
                            } as unknown as ScoreOutfitSelection) : undefined;
                          })() : undefined}
                          className="scale-75 -m-2"
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOutfit(outfit);
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        aria-label="Delete outfit"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Visual Layout - no extra background, let the layout component handle it */}
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
                
                {/* Card Footer */}
                <div className="p-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
              </div>
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
                <p className="text-muted-foreground mb-4">
                  Are you sure you want to delete &quot;{outfitToDelete.name || 'Untitled Outfit'}&quot;? This action cannot be undone.
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
