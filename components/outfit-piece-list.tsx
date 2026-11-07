import Image from "@/components/clothing-image";
import Link from "next/link";
import type { WardrobeItem } from "@/lib/types/database";

function groupOutfitPieces(items: WardrobeItem[]) {
  const groups = new Map<string, WardrobeItem[]>();
  for (const item of new Map(items.map((item) => [item.id, item])).values()) {
    const category = (item.category?.name || "").toLowerCase();
    const group = /undershirt|underwear|sock/.test(category)
      ? "Base layers"
      : /jacket|coat|overshirt|layer/.test(category)
        ? "Layers & outerwear"
        : /shirt|pants|dress|skirt|shoe/.test(category)
          ? "Main pieces"
          : "Accessories & finishing pieces";
    groups.set(group, [...(groups.get(group) || []), item]);
  }
  return [
    "Main pieces",
    "Layers & outerwear",
    "Base layers",
    "Accessories & finishing pieces",
  ]
    .filter((group) => groups.has(group))
    .map((name) => ({ name, items: groups.get(name)! }));
}
export function OutfitPieceList({ items }: { items: WardrobeItem[] }) {
  const groups = groupOutfitPieces(items);
  return (
    <details className="mt-3 border-t border-border pt-2">
      <summary className="cursor-pointer py-2 text-xs text-primary">
        See all {new Set(items.map((item) => item.id)).size} pieces
      </summary>
      <div className="space-y-3 pb-2 pt-1">
        {groups.map((group) => (
          <div key={group.name}>
            <h4 className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              {group.name}
            </h4>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/wardrobe/items/${item.id}`}
                    className="flex items-center gap-3 text-xs hover:text-primary"
                  >
                    {item.image_url && (
                      <Image
                        width={384}
                        height={256}
                        unoptimized
                        src={item.image_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded object-contain"
                        loading="lazy"
                      />
                    )}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
