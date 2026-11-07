"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/clothing-image";
import { ArrowLeftRight, Shirt } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOutfit } from "@/lib/actions/outfits";
import { queryKeys } from "@/lib/query-client";
import { clothingPieceLabel } from "@/lib/utils/clothing-piece-label";
import type { AssistantBoardItem, AssistantOutfitBoard } from "@/lib/types/assistant-outfit";

function PiecePhoto({ item, small = false }: { item: AssistantBoardItem; small?: boolean }) {
  return (
    <div className={small ? "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--item-img-bg)]" : "flex h-40 items-center justify-center bg-[var(--item-img-bg)] sm:h-52"}>
      {item.imageUrl ? <Image src={item.imageUrl} alt={clothingPieceLabel(item)} width={320} height={240} unoptimized loading="lazy" className="h-full w-full object-contain p-2" /> : <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><Shirt size={small ? 22 : 36} aria-hidden="true" />{!small && "No photo yet"}</span>}
    </div>
  );
}

function SwapPicker({ item, usedIds, onPick, onClose }: { item: AssistantBoardItem; usedIds: string[]; onPick: (item: AssistantBoardItem) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ items: AssistantBoardItem[]; hasMore: boolean }>({ items: [], hasMore: false });
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ categoryId: item.categoryId, search, page: String(page) });
        const response = await fetch(`/api/assistant/wardrobe-options?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Could not load your clothing. Please try again.");
        const data = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch {
        if (!controller.signal.aborted) setError("Could not load your clothing. Please try again.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, search ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [item.categoryId, page, search, retry]);
  const options = result.items.filter((option) => !usedIds.includes(option.id));
  return (
    <AppDialog open onClose={onClose} title={`Swap ${clothingPieceLabel(item)}`} className="sebastian-board-dialog">
      <p className="mb-4 text-sm text-muted-foreground">Choose another {item.category?.toLowerCase() || "piece"} from your wardrobe.</p>
      <Input aria-label="Search swap options" placeholder="Find a piece by name or color…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} maxLength={60} />
      {loading ? <p role="status" className="py-8 text-sm text-muted-foreground">Loading your pieces…</p> : error ? <div role="alert" className="space-y-3 py-6"><p>{error}</p><Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div> : <>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {options.map((option) => <button type="button" key={option.id} onClick={() => onPick(option)} className="overflow-hidden rounded-xl border border-border text-left hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Use ${clothingPieceLabel(option)}`}>
            <PiecePhoto item={option} /><span className="block break-words p-3 text-sm">{clothingPieceLabel(option)}<small className="mt-1 block text-xs text-muted-foreground">{[option.brand, option.material].filter(Boolean).join(" · ")}</small></span>
          </button>)}
        </div>
        {!options.length && <p className="py-8 text-sm text-muted-foreground">{search ? "No other pieces match this search." : "No other pieces in this category on this page."} You can keep the current piece.</p>}
        {(page > 0 || result.hasMore) && <div className="mt-5 flex items-center justify-between gap-3"><Button variant="outline" disabled={!page} onClick={() => setPage((value) => value - 1)}>Previous pieces</Button><span className="text-xs">Page {page + 1}</span><Button variant="outline" disabled={!result.hasMore} onClick={() => setPage((value) => value + 1)}>More pieces</Button></div>}
      </>}
    </AppDialog>
  );
}

function OutfitBoard({ board, onDiscuss }: { board: AssistantOutfitBoard; onDiscuss: (board: AssistantOutfitBoard) => void }) {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false), [items, setItems] = useState(board.items);
  const [title, setTitle] = useState(board.title), [focusItemId, setFocusItemId] = useState(board.focusItemId);
  const [swap, setSwap] = useState<AssistantBoardItem>();
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [savedId, setSavedId] = useState<string>();
  const saveLock = useRef(false);
  const save = async () => {
    if (saveLock.current || savedId) return;
    saveLock.current = true; setSaving(true); setError("");
    try {
      const result = await createOutfit({ name: title.trim() || board.title, items: items.map((item) => item.id), source: "generated" });
      if (!result.success || !result.data) throw new Error("Save failed");
      setSavedId(result.data.id);
      await cache.invalidateQueries({ queryKey: queryKeys.outfits.all });
    } catch { setError("Could not save this outfit. Your swaps are still here. Please try again."); }
    finally { setSaving(false); saveLock.current = false; }
  };
  return (
    <section aria-label={board.title} className="mt-3 rounded-xl border border-border bg-background p-3">
      <h3 className="break-words text-sm font-medium">{title}</h3>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">{items.length} pieces from your wardrobe</p>
      <div className="mb-3 flex flex-wrap gap-2" aria-hidden="true">{items.slice(0, 4).map((item) => <PiecePhoto key={item.id} item={item} small />)}{items.length > 4 && <span className="flex h-14 items-center px-2 text-xs text-muted-foreground">+{items.length - 4}</span>}</div>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`View ${title}`}>View outfit & swap pieces</Button>
      <AppDialog open={open} onClose={() => { if (!saving) setOpen(false); }} title={title || board.title} className="sebastian-board-dialog">
        <p className="mb-5 text-sm text-muted-foreground">Your wardrobe photos · {items.length} pieces. Swap any piece, then save the combination you like.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-border">
            <PiecePhoto item={item} />
            <div className="p-3"><h3 className="break-words text-sm font-medium">{clothingPieceLabel(item)}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{[item.category, item.brand, item.material].filter(Boolean).join(" · ")}</p>
              {item.id === focusItemId && <p className="mt-2 text-xs text-primary">Starting piece</p>}
              <Button type="button" variant="outline" size="sm" className="mt-3" disabled={saving} onClick={() => setSwap(item)} aria-label={`Swap ${clothingPieceLabel(item)}`}><ArrowLeftRight size={14} aria-hidden="true" />Swap</Button>
            </div>
          </article>)}
        </div>
        <label className="mt-6 block text-sm" htmlFor={`board-name-${board.id}`}>Outfit name</label>
        <Input id={`board-name-${board.id}`} className="mt-2" value={title} maxLength={80} disabled={saving} onChange={(event) => { setTitle(event.target.value); setSavedId(undefined); }} />
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        {savedId && <p role="status" className="mt-4 text-sm">Outfit saved. <Link href={`/outfits/${savedId}`} className="text-primary underline">Open saved outfit</Link></p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" disabled={saving || !!savedId} onClick={() => void save()}>{saving ? "Saving outfit…" : savedId ? "Outfit saved" : "Save outfit"}</Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => { setOpen(false); onDiscuss({ ...board, title: title.trim() || board.title, items, focusItemId }); }}>Discuss this look</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Viewing and swapping use your existing photos. Save the outfit to keep your changes.</p>
      </AppDialog>
      {swap && <SwapPicker item={swap} usedIds={items.map((item) => item.id)} onClose={() => setSwap(undefined)} onPick={(replacement) => {
        setItems((previous) => previous.map((item) => item.id === swap.id ? replacement : item));
        if (focusItemId === swap.id) setFocusItemId(replacement.id);
        setSwap(undefined); setSavedId(undefined); setError("");
      }} />}
    </section>
  );
}

export function SebastianOutfitBoards({ boards, onDiscuss }: { boards: AssistantOutfitBoard[]; onDiscuss: (board: AssistantOutfitBoard) => void }) {
  return <div className="min-w-0">{boards.map((board) => <OutfitBoard key={board.id} board={board} onDiscuss={onDiscuss} />)}</div>;
}
