"use client";

import { WardrobeNavigation } from "@/components/wardrobe-navigation";

import { CollectionPageSkeleton } from "@/components/page-skeletons";

import React, {
  useState,
  useMemo,
  useCallback,
  startTransition,
  useEffect,
  useRef,
} from "react";
import Image from "@/components/clothing-image";
import Link from "next/link";
import { AskSebastian } from "@/components/ask-sebastian";
import { useCategories } from "@/lib/hooks/use-categories";
import { useWardrobeItems } from "@/lib/hooks/use-wardrobe-items";
import { useGenerateWardrobeItemImage } from "@/lib/hooks/use-wardrobe-item-image-generation";
import { useWardrobeRealtime } from "@/lib/hooks/use-realtime-wardrobe";
import { WardrobeSearchFiltersWithErrorBoundary as WardrobeSearchFilters } from "@/components/dynamic/wardrobe-search-filters-dynamic";
import { Button } from "@/components/ui/button";
import { CircleDashed, Loader2, Shirt } from "lucide-react";

import { WardrobeItem } from "@/lib/types/database";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWalkthrough } from "@/lib/hooks/use-walkthrough";
import { WalkthroughCoach } from "@/components/walkthrough/walkthrough-coach";
import { WALKTHROUGH_STEPS } from "@/components/walkthrough/walkthrough-steps";

interface WardrobePageClientProps {
  initialWalkthroughCompleted?: boolean;
}

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

export function WardrobePageClient({
  initialWalkthroughCompleted = true,
}: WardrobePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const walkthrough = useWalkthrough({
    initialCompleted: initialWalkthroughCompleted,
    totalSteps: WALKTHROUGH_STEPS.length,
  });

  const [groupByCategory, setGroupByCategory] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"default" | "name-asc" | "name-desc">(
    "default",
  );
  const activeAutogenId = useRef<string | null>(null);

  // Fetch data using hooks
  const {
    data: categories = [],
    isPending: categoriesLoading,
    error: categoriesError,
  } = useCategories();
  const {
    data: items = [],
    isPending: itemsLoading,
    error: itemsError,
  } = useWardrobeItems();
  const { generateAsync } = useGenerateWardrobeItemImage();

  // Enable real-time updates for background removal status and image_url changes
  useWardrobeRealtime();

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsKey);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParamsKey],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const q = params.get("q") ?? "";
    const tagsParam = params.get("tags") ?? "";
    const categoriesParam = params.get("categories") ?? "";
    const sortParam = params.get("sort");

    const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
    const categoryIds = categoriesParam
      ? categoriesParam.split(",").filter(Boolean)
      : [];
    const nextTagSet = new Set(tags);
    const nextCategorySet = new Set(categoryIds);

    setSearchTerm((prev) => (prev === q ? prev : q));
    setSelectedTags((prev) =>
      setsEqual(prev, nextTagSet) ? prev : nextTagSet,
    );
    setSelectedCategories((prev) =>
      setsEqual(prev, nextCategorySet) ? prev : nextCategorySet,
    );
    setSortBy(
      sortParam === "name-asc" || sortParam === "name-desc"
        ? sortParam
        : "default",
    );
  }, [searchParamsKey]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const autogenId = params.get("autogen");
    if (!autogenId) return;
    if (activeAutogenId.current === autogenId) return;
    const requestId = sessionStorage.getItem(`wardrobe-generate:${autogenId}`);
    if (!requestId) {
      updateQueryParams({ autogen: null });
      return;
    }

    activeAutogenId.current = autogenId;
    void generateAsync({ wardrobe_item_id: autogenId, request_id: requestId })
      .catch(() => {
        // Keep UX stable; item card state will reflect failures via realtime/query refresh.
      })
      .finally(() => {
        updateQueryParams({ autogen: null });
        activeAutogenId.current = null;
        sessionStorage.removeItem(`wardrobe-generate:${autogenId}`);
      });
  }, [searchParamsKey, generateAsync, updateQueryParams]);

  // Debounce URL sync for search to keep typing responsive.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsKey);
      const currentQuery = params.get("q") ?? "";
      if (currentQuery !== searchTerm) {
        updateQueryParams({ q: searchTerm || null });
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, searchParamsKey, updateQueryParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsKey);
      const currentTags = params.get("tags") ?? "";
      const nextTags = Array.from(selectedTags).sort().join(",");
      if (currentTags !== nextTags) {
        updateQueryParams({ tags: nextTags || null });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedTags, searchParamsKey, updateQueryParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsKey);
      const currentCategories = params.get("categories") ?? "";
      const nextCategories = Array.from(selectedCategories).sort().join(",");
      if (currentCategories !== nextCategories) {
        updateQueryParams({ categories: nextCategories || null });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedCategories, searchParamsKey, updateQueryParams]);

  // Filter items by search term, tags, and categories
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.brand &&
            item.brand.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    // Filter by tags
    if (selectedTags.size > 0) {
      filtered = filtered.filter((item) =>
        item.capsule_tags?.some((tag: string) => selectedTags.has(tag)),
      );
    }

    // Filter by categories (if any are selected)
    if (selectedCategories.size > 0) {
      filtered = filtered.filter((item) =>
        selectedCategories.has(item.category_id),
      );
    }

    if (sortBy === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    }

    return filtered;
  }, [items, searchTerm, selectedTags, selectedCategories, sortBy]);

  // Group items by category for display
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, WardrobeItem[]>();

    categories.forEach((category) => {
      const categoryItems = filteredItems.filter(
        (item) => item.category_id === category.id,
      );
      grouped.set(category.id, categoryItems);
    });

    return grouped;
  }, [filteredItems, categories]);

  const firstItemId = useMemo(
    () => filteredItems[0]?.id ?? null,
    [filteredItems],
  );

  // Auto-start walkthrough once items are loaded and walkthrough is pending
  React.useEffect(() => {
    if (
      !walkthrough.isActive &&
      walkthrough.currentStep === 0 &&
      filteredItems.length > 0
    ) {
      walkthrough.start();
    }
  }, [filteredItems.length, walkthrough]);

  // Search and filter handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    startTransition(() => {
      setSelectedTags((prev) => {
        const newTags = new Set(prev);
        if (newTags.has(tag)) {
          newTags.delete(tag);
        } else {
          newTags.add(tag);
        }
        return newTags;
      });
    });
  }, []);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    startTransition(() => {
      setSelectedCategories((prev) => {
        const newCategories = new Set(prev);
        if (newCategories.has(categoryId)) {
          newCategories.delete(categoryId);
        } else {
          newCategories.add(categoryId);
        }
        return newCategories;
      });
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedTags(new Set());
    setSelectedCategories(new Set());
    setSortBy("default");
    updateQueryParams({ q: null, tags: null, categories: null, sort: null });
  }, [updateQueryParams]);

  const handleSortChange = useCallback(
    (value: "default" | "name-asc" | "name-desc") => {
      setSortBy(value);
      updateQueryParams({ sort: value === "default" ? null : value });
    },
    [updateQueryParams],
  );

  const renderImageSection = useCallback(
    (item: WardrobeItem, alt: string, sizes: string) => {
      if (item.image_url) {
        return (
          <div className="relative h-48 w-full bg-[var(--item-img-bg)]">
            <Image
              src={item.image_url}
              alt={alt}
              fill
              className="object-contain p-4"
              loading="lazy"
              sizes={sizes}
              quality={85}
            />
          </div>
        );
      }

      const status = item.bg_removal_status;
      const isPending = !status || status === "pending";
      const isProcessing = status === "processing";

      return (
        <div className="relative flex h-48 w-full items-center justify-center border-b border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs font-medium">Generating image...</span>
            </div>
          ) : isPending ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CircleDashed className="h-5 w-5" />
              <span className="text-xs font-medium">
                Pending image generation
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Shirt className="h-5 w-5" />
              <span className="text-xs font-medium">No image</span>
            </div>
          )}
        </div>
      );
    },
    [],
  );

  if (categoriesError || itemsError) {
    return (
      <div className="page-shell-content">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-600 mb-2">
              Error Loading Wardrobe
            </h3>
            <p className="text-muted-foreground mb-4">
              {categoriesError?.message ||
                itemsError?.message ||
                "Unknown error occurred"}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (categoriesLoading || itemsLoading) {
    return <CollectionPageSkeleton kind="Wardrobe" />;
  }

  return (
    <div className="page-shell-content">
      <div className="flex flex-col gap-8">
        {/* Unified Search and Filters */}
        <WardrobeSearchFilters
          searchTerm={searchTerm}
          selectedTags={selectedTags}
          selectedCategories={selectedCategories}
          categories={categories}
          onSearchChange={handleSearchChange}
          onTagToggle={handleTagToggle}
          onCategoryToggle={handleCategoryToggle}
          onClearAll={clearAllFilters}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          itemCount={filteredItems.length}
          totalCount={items.length}
        />

        <WardrobeNavigation>
            <AskSebastian prompt="Help me make better use of the pieces in my wardrobe." />
        </WardrobeNavigation>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Open a piece to edit it or build an outfit around it.</p>
          <label className="flex shrink-0 items-center gap-2">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(event) => setGroupByCategory(event.target.checked)}
            />
            Group by category
          </label>
        </div>
        {(groupByCategory
          ? categories
              .map((category) => ({
                id: category.id,
                name: category.name,
                items: itemsByCategory.get(category.id) || [],
              }))
              .filter((group) => group.items.length)
          : [{ id: "all", name: "", items: filteredItems }]
        ).map((group) => (
          <section key={group.id} className="space-y-4">
            {group.name && (
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-display text-2xl">{group.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} pieces
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/wardrobe/items/${item.id}`}
                  className="wardrobe-piece-card overflow-hidden rounded-xl border border-border bg-[var(--bg-surface)] transition-colors hover:border-primary"
                  aria-label={`Open ${item.name}`}
                  {...(item.id === firstItemId
                    ? { "data-walkthrough-id": "wardrobe-item-first" }
                    : {})}
                >
                  {renderImageSection(
                    item,
                    item.name,
                    "(max-width: 640px) 45vw, 220px",
                  )}
                  <div className="border-t border-border px-3 py-3">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.category?.name ||
                        categories.find(
                          (category) => category.id === item.category_id,
                        )?.name}
                    </p>
                    <h3 className="line-clamp-2 text-sm font-medium">
                      {item.name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {[item.brand, item.color].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Empty states */}
        {categories.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No categories found
            </h3>
            <p className="text-muted-foreground mb-4">
              Categories will be automatically created when you add your first
              items.
            </p>
          </div>
        )}

        {filteredItems.length === 0 && categories.length > 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No items found
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ||
              selectedTags.size > 0 ||
              selectedCategories.size > 0
                ? "Try adjusting your search criteria or filters."
                : "Start building your wardrobe by adding your first items."}
            </p>
          </div>
        )}
      </div>

      {walkthrough.isActive && (
        <WalkthroughCoach
          steps={WALKTHROUGH_STEPS}
          currentStep={walkthrough.currentStep}
          onNext={walkthrough.advance}
          onDismiss={walkthrough.dismiss}
          prefersReducedMotion={walkthrough.prefersReducedMotion}
        />
      )}
    </div>
  );
}
