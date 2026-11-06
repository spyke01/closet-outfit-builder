"use client";

import Image from "next/image";
import { Shirt, ArrowLeftRight } from "lucide-react";
import type { WardrobeItem } from "@/lib/types/database";

const priority = ["Dress", "Shirt", "Pants", "Shoes", "Jacket", "Overshirt"];
function orderedOutfitItems(items: WardrobeItem[]) {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  return unique.sort((a, b) => {
    const rank = (item: WardrobeItem) => {
      const index = priority.indexOf(item.category?.name || "");
      return index < 0 ? priority.length : index;
    };
    return rank(a) - rank(b);
  });
}
export function OutfitThumbnails({
  items,
  className = "",
}: {
  items: WardrobeItem[];
  className?: string;
}) {
  const ordered = orderedOutfitItems(items);
  return (
    <div
      className={`outfit-thumbnails ${className}`}
      aria-label={`${ordered.length} pieces`}
    >
      {ordered.slice(0, 3).map((item) => (
        <span className="relative min-w-0" key={item.id}>
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="80px"
              className="object-contain"
              unoptimized={item.image_url.startsWith("/api/clothing-images/")}
            />
          ) : (
            <Shirt size={22} className="m-auto text-muted-foreground" />
          )}
        </span>
      ))}
      {ordered.length > 3 && (
        <span className="outfit-overflow">
          +{ordered.length - 3}
          <span className="sr-only"> more pieces</span>
        </span>
      )}
    </div>
  );
}
export function OutfitComposition({
  items,
  onSwap,
}: {
  items: WardrobeItem[];
  onSwap?: (item: WardrobeItem) => void;
}) {
  const ordered = orderedOutfitItems(items);
  return (
    <div className="outfit-composition">
      {ordered.map((item) => (
        <div className="outfit-composition-piece" key={item.id}>
          <div className="outfit-composition-image">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="(max-width: 600px) 40vw, 240px"
                className="object-contain p-3"
                unoptimized={item.image_url.startsWith("/api/clothing-images/")}
              />
            ) : (
              <Shirt size={48} className="text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 p-2">
            <span className="min-w-0 text-xs">
              <span className="block truncate font-medium">{item.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {item.category?.name}
              </span>
            </span>
            {onSwap && (
              <button
                type="button"
                aria-label={`Swap ${item.name}`}
                className="outfit-swap"
                onClick={() => onSwap(item)}
              >
                <ArrowLeftRight size={13} />
                Swap
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
