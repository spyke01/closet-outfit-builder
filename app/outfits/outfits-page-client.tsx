'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-outfits-outfits-page-client' });
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutfits, useDeleteOutfit } from '@/lib/hooks/use-outfits';
import { OutfitSimpleLayout } from '@/components/outfit-simple-layout';
import { OutfitGridLayout } from '@/components/outfit-grid-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Filter, 
  Search,
  Heart,
  AlertCircle,
  Shirt,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Outfit } from '@/lib/types/database';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const FILTER_OPTIONS = ['all', 'loved', 'curated', 'generated'] as const;
const SORT_OPTIONS = ['newest', 'oldest', 'score', 'name'] as const;

type FilterBy = (typeof FILTER_OPTIONS)[number];
type SortBy = (typeof SORT_OPTIONS)[number];

export function OutfitsPageClient() {
  const getFilterTagStyle = (selected: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 14px',
    borderRadius: 'var(--radius-pill)',
    border: selected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
    background: selected ? 'var(--accent-muted)' : 'var(--bg-surface)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    fontSize: '0.76rem',
    fontWeight: 500,
    color: selected ? 'var(--accent)' : 'var(--text-2)',
    cursor: 'pointer',
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
  });
  const outfitCardStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: 'var(--shadow-card)',
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
  };
  const outfitCardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--card-header-bg, rgba(255, 255, 255, 0.03))',
    borderBottom: '1px solid var(--border-subtle)',
  };
  const outfitCardBodyStyle: React.CSSProperties = {
    padding: '14px 16px',
    flex: '1 1 auto',
  };
  const outfitCardFooterStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderTop: '1px solid var(--border-subtle)',
  };
  const outfitDeleteButtonStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
  };
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

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
    const nextLayout = params.get('layout');
    const normalizedFilter: FilterBy = FILTER_OPTIONS.includes(nextFilter as FilterBy) ? nextFilter as FilterBy : 'all';
    const normalizedSort: SortBy = SORT_OPTIONS.includes(nextSort as SortBy) ? nextSort as SortBy : 'newest';
    const normalizedLayout: 'grid' | 'visual' = nextLayout === 'visual' ? 'visual' : 'grid';

    setSearchTerm(prev => (prev === nextSearch ? prev : nextSearch));
    setFilterBy(prev => (prev === normalizedFilter ? prev : normalizedFilter));
    setSortBy(prev => (prev === normalizedSort ? prev : normalizedSort));
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
      logger.error('Failed to delete outfit:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell-content mx-auto w-full max-w-[1240px] px-6 py-8">
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
      <div className="page-shell-content mx-auto w-full max-w-[1240px] px-6 py-8">
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
    <div className="page-shell-content mx-auto w-full max-w-[1240px] px-6 py-8">
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
              className="glass-pill h-10 px-4 flex items-center gap-2"
              aria-label={showFilters ? 'Hide advanced filters' : 'Show advanced filters'}
              aria-expanded={showFilters}
            >
              <Filter size={16} />
              More Filters
            </Button>
            
            <div className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] p-1">
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
            
            <Link href="/outfits/create">
              <Button className="flex items-center gap-2">
                <Plus size={16} />
                Create Outfit
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 max-[980px]:grid-cols-1">
            <div className="relative flex-1">
              <label htmlFor="outfit-search" className="sr-only">
                Search outfits
              </label>
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-3)]"
              />
              <input
                id="outfit-search"
                type="search"
                name="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search outfits by name, item, or brand..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] py-[11px] pl-10 pr-4 text-foreground backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))] focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Search outfits by name, item, or brand"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                    type="button"
                    onClick={() => handleFilterChange(option)}
                    aria-pressed={selected}
                    className={`filter-tag focus-visible:outline-none ${selected ? 'active' : ''}`}
                    style={getFilterTagStyle(selected)}
                  >
                    {labelMap[option]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <section className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
            <label htmlFor="outfit-sort" className="text-sm font-medium text-muted-foreground">
              Sort by
            </label>
            <select
              id="outfit-sort"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortBy)}
              className="h-10 min-w-[220px] rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] pl-3 pr-10 text-foreground backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))] focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="glass-pill h-10 px-4 text-foreground"
            >
              Clear Filters
            </Button>
          </section>
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedOutfits.map(outfit => (
              <div
                key={outfit.id}
                className="outfit-card"
                style={outfitCardStyle}
                onClick={() => handleOutfitSelect(outfit)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOutfitSelect(outfit);
                  }
                }}
                role="button"
                tabIndex={0}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform = 'translateY(-3px)';
                  event.currentTarget.style.borderColor = 'var(--border-default)';
                  event.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = 'translateY(0)';
                  event.currentTarget.style.borderColor = 'var(--border-subtle)';
                  event.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                {/* Card Header */}
                <div style={outfitCardHeaderStyle}>
                  <div className="flex w-full min-w-0 items-center justify-between gap-2">
                    <h3
                      className="mr-2 flex-1 truncate whitespace-nowrap text-[0.82rem] font-semibold text-[var(--text-1)]"
                      style={{ maxWidth: 'calc(100% - 36px)' }}
                    >
                      {outfit.name || 'Untitled Outfit'}
                    </h3>
                  
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOutfit(outfit);
                        }}
                        className="outfit-card-delete"
                        style={{ ...outfitDeleteButtonStyle, color: 'var(--danger, #f55b5b)' }}
                        aria-label="Delete outfit"
                        onMouseEnter={(event) => {
                          event.currentTarget.style.background = 'var(--danger-muted, rgba(245, 91, 91, 0.12))';
                          event.currentTarget.style.borderColor = 'var(--danger-muted, rgba(245, 91, 91, 0.12))';
                          event.currentTarget.style.color = 'var(--danger, #f55b5b)';
                          const icon = event.currentTarget.querySelector('svg');
                          if (icon instanceof SVGElement) {
                            icon.style.opacity = '1';
                          }
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.background = 'transparent';
                          event.currentTarget.style.borderColor = 'transparent';
                          event.currentTarget.style.color = 'var(--danger, #f55b5b)';
                          const icon = event.currentTarget.querySelector('svg');
                          if (icon instanceof SVGElement) {
                            icon.style.opacity = '0.55';
                          }
                        }}
                      >
                        <Trash2 size={18} style={{ color: 'currentColor', opacity: 0.55, transition: 'opacity 0.18s' }} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div style={outfitCardBodyStyle}>
                  <div className="relative h-80">
                  {layoutType === 'grid' && (
                    <OutfitGridLayout
                      items={outfit.items || []}
                      size="medium"
                      className="w-full h-full"
                      previewVariant="bare"
                      showLabels
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
                </div>
                
                {/* Card Footer */}
                <div style={outfitCardFooterStyle}>
                  <div className="flex w-full items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-[5px] rounded-[var(--radius-pill)] text-[0.65rem] font-medium ${
                          outfit.loved
                            ? ''
                            : outfit.source === 'curated'
                              ? ''
                              : ''
                        }`}
                        style={{
                          padding: '3px 10px',
                          background: outfit.loved
                            ? 'var(--accent-2-muted)'
                            : outfit.source === 'curated'
                              ? 'var(--accent-muted)'
                              : 'var(--accent-3-muted)',
                          color: outfit.loved
                            ? 'var(--accent-2)'
                            : outfit.source === 'curated'
                              ? 'var(--accent)'
                              : 'var(--accent-3)',
                          border: `1px solid ${
                            outfit.loved
                              ? 'color-mix(in srgb, var(--accent-2) 10%, transparent)'
                              : outfit.source === 'curated'
                                ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                                : 'color-mix(in srgb, var(--accent-3) 10%, transparent)'
                          }`,
                        }}
                      >
                        {outfit.loved ? 'Loved' : outfit.source === 'curated' ? 'Curated' : 'Generated'}
                        {outfit.loved && <Heart className="h-[11px] w-[11px] fill-current" />}
                      </span>
                    </div>
                    
                    {outfit.items && outfit.items.length > 0 && (
                      <span className="tabular-nums text-[0.74rem] text-[var(--text-3)]">
                        {outfit.items.length} item{outfit.items.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && outfitToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,10,16,0.72)] p-4 backdrop-blur-[8px]">
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
