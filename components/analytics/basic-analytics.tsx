import Link from "next/link";
import Image from "@/components/clothing-image";
import { CalendarDays, Shirt } from "lucide-react";
import { UpgradePrompt, type UpgradeFeature } from "@/components/upgrade-prompt";
import type { BasicAnalyticsPreview } from "@/lib/types/analytics";

export function BasicAnalytics({ tab, totalItems, totalOutfits, preview }: {
  tab: "overview" | "clothing" | "history" | "cost";
  totalItems: number; totalOutfits: number; preview?: BasicAnalyticsPreview;
}) {
  const feature: UpgradeFeature = `analytics-${tab === "cost" ? "cost" : tab}`;
  return (
    <div className="basic-analytics">
      <UpgradePrompt feature={feature} compact />
      <section className="analytics-panel mt-5" aria-label="Included with Free">
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Included with Free</p>
        {tab === "overview" && <>
          <h2 className="font-display text-2xl">Your wardrobe at a glance</h2>
          <dl className="basic-analytics-totals">
            <div><dt>Pieces you own</dt><dd>{totalItems}</dd></div>
            <div><dt>Saved outfits</dt><dd>{totalOutfits}</dd></div>
            <div><dt>Wears in 30 days</dt><dd>{preview?.wearCount ?? "—"}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">Record what you wear in your planner to build your history.</p>
          <Link className="mt-3 inline-block text-sm text-primary" href="/calendar">Record a worn outfit ↗</Link>
        </>}
        {tab === "clothing" && <>
          <h2 className="font-display text-2xl">A closer look at your clothing</h2>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">{totalItems} active pieces. Here are your latest additions.</p>
          {preview?.items.length ? <ul>{preview.items.map(item => <li key={item.id}><Link className="basic-clothing-row" href={`/wardrobe/items/${item.id}`}>
            {item.imageUrl ? <Image src={item.imageUrl} alt="" width={48} height={48} className="h-12 w-12 object-contain" /> : <Shirt size={24} aria-hidden="true" />}
            <span><strong className="block text-sm font-medium">{item.name}</strong><small className="text-muted-foreground">{item.category}</small></span><span className="ml-auto text-primary" aria-hidden="true">↗</span>
          </Link></li>)}</ul> : <p className="my-4 text-sm text-muted-foreground">Add a piece to start exploring your wardrobe.</p>}
          {!!preview?.categories.length && <div className="mt-4 border-t border-border pt-3"><h3 className="mb-2 text-sm font-medium">What you own</h3><dl className="space-y-2 text-sm">{preview.categories.slice(0,5).map(category=><div className="flex justify-between gap-4" key={category.name}><dt>{category.name}</dt><dd className="tabular-nums text-muted-foreground">{category.count}</dd></div>)}</dl></div>}
        </>}
        {tab === "history" && <>
          <h2 className="font-display text-2xl">Your recent wears</h2>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">Your latest three confirmed outfits from the last 30 days. Plans are excluded.</p>
          {preview?.recentWears.length ? <ul>{preview.recentWears.map(wear => <li key={wear.id}><Link className="basic-clothing-row" href={`/calendar?date=${wear.date}`}><CalendarDays size={20} className="shrink-0 text-primary" aria-hidden="true" /><span><strong className="block text-sm font-medium">{wear.name}</strong><time dateTime={wear.date} className="text-xs text-muted-foreground">{new Date(`${wear.date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time></span><span className="ml-auto text-primary" aria-hidden="true">↗</span></Link></li>)}</ul> : <div className="py-3"><p className="mb-3 text-sm text-muted-foreground">Your history starts with an outfit you’ve worn.</p><Link href="/calendar" className="text-sm text-primary">Record your first wear ↗</Link></div>}
        </>}
        {tab === "cost" && <>
          <h2 className="font-display text-2xl">Start with a purchase price</h2>
          <p className="my-3 text-sm text-muted-foreground">{preview ? `${preview.pricedCount} of ${totalItems} pieces have a recorded price.` : "Add optional purchase prices to your clothing."} Add prices in your wardrobe to prepare for cost-per-wear insights.</p>
          <div className="cost-calculation-example"><p className="mb-3 text-xs text-muted-foreground">Example calculation · illustrative numbers</p><p className="font-display text-2xl">$60 ÷ 12 wears = $5 per wear</p><p className="mt-3 text-sm text-muted-foreground">Your own results use each piece’s price and all confirmed lifetime wears. Unknown prices and unworn pieces have no result.</p></div>
          <Link href="/wardrobe" className="mt-4 inline-block text-sm text-primary">Add prices to your clothing ↗</Link>
        </>}
      </section>
    </div>
  );
}
