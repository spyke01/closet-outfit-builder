"use client";

import Image from "next/image";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Lock, CalendarDays, Shirt } from "lucide-react";
import type { AnalyticsDashboardResponse } from "@/lib/types/analytics";
import {
  summarizeWearInsights,
  type InsightPeriod,
  type InsightItem,
} from "@/lib/services/analytics/wear-insights";
import { AskSebastian } from "@/components/ask-sebastian";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";

type Tab = "overview" | "clothing" | "history" | "cost";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "clothing", label: "Clothing" },
  { id: "history", label: "Wear history" },
  { id: "cost", label: "Cost per wear" },
];
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="analytics-stat">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="my-2 block font-display text-4xl font-normal">
        {value}
      </strong>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
function ItemImage({ item }: { item: InsightItem }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
      {item.imageUrl ? (
        <Image
          width={384}
          height={256}
          unoptimized
          src={item.imageUrl}
          alt=""
          className="h-full w-full object-contain p-1"
          loading="lazy"
        />
      ) : (
        <Shirt size={20} className="text-muted-foreground" />
      )}
    </div>
  );
}

export function AnalyticsDashboard({
  data,
}: {
  data: AnalyticsDashboardResponse;
}) {
  const [tab, setTab] = useState<Tab>("overview"),
    [period, setPeriod] = useState<InsightPeriod>("30");
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState("most"),
    [categoryFilter, setCategoryFilter] = useState(""),
    [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const insights = "insights" in data ? data.insights : undefined;
  const summary = useMemo(
    () => (insights ? summarizeWearInsights(insights, period) : null),
    [insights, period],
  );
  const selected = summary?.items.find((item) => item.id === selectedId);
  const visibleItems = useMemo(() => {
    if (!summary) return [];
    return summary.active
      .filter((item) => !categoryFilter || item.category === categoryFilter)
      .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
      .filter((item) => sort !== "unworn" || item.periodWears === 0)
      .sort((a, b) =>
        sort === "least" || sort === "unworn"
          ? a.periodWears - b.periodWears || a.name.localeCompare(b.name)
          : b.periodWears - a.periodWears || a.name.localeCompare(b.name),
      );
  }, [summary, search, sort, categoryFilter]);
  const isFree = "tier" in data && data.tier === "free";
  const topItems =
    summary?.active
      .filter((item) => item.periodWears > 0)
      .sort((a, b) => b.periodWears - a.periodWears)
      .slice(0, 5) || [];
  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(0);
  };
  const itemRows = (items: NonNullable<typeof summary>["items"]) =>
    items.map((item) => (
      <button
        className="analytics-item-row"
        key={item.id}
        onClick={() => setSelectedId(item.id)}
      >
        <ItemImage item={item} />
        <span className="min-w-0 flex-1 text-left">
          <strong className="block truncate text-sm font-medium">
            {item.name}
          </strong>
          <small className="text-xs text-muted-foreground">
            {item.category}
          </small>
        </span>
        <span className="text-right">
          <strong className="block text-sm font-medium">
            {item.periodWears} {item.periodWears === 1 ? "wear" : "wears"}
          </strong>
          <span className="text-[10px] text-muted-foreground">
            View history ↗
          </span>
        </span>
      </button>
    ));
  return (
    <div className="page-shell-content">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Your wardrobe, understood
          </p>
          <h1 className="font-display text-4xl">Make more of what you own</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            See what you wear, what waits, and where your wardrobe earns its
            place.
          </p>
        </div>
        <label className="text-xs text-muted-foreground">
          Time period
          <select
            className="ml-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as InsightPeriod);
              setPage(0);
            }}
            disabled={isFree}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </select>
        </label>
      </header>
      <div
        className="analytics-tabs"
        role="tablist"
        aria-label="Analytics views"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`analytics-tab-${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`analytics-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={(event) => {
              const index = tabs.findIndex((item) => item.id === tab);
              if (
                ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                changeTab(tabs[next].id);
                document
                  .getElementById(`analytics-tab-${tabs[next].id}`)
                  ?.focus();
              }
            }}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id={`analytics-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`analytics-tab-${tab}`}
        className="pt-6"
      >
        {isFree || !summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat
                label="Pieces in your wardrobe"
                value={data.wardrobe.totalItems}
                hint="Active clothing and accessories"
              />
              <Stat
                label="Saved outfits"
                value={data.wardrobe.totalOutfits}
                hint="Combinations you can return to"
              />
            </div>
            <section className="mt-6 rounded-xl border border-border p-7">
              <Lock size={23} className="mb-4 text-primary" />
              <h2 className="font-display text-2xl">
                Get to know your wardrobe better
              </h2>
              <p className="my-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Plus and Pro include wear trends, clothing history, and cost per
                wear. Mark outfits as worn in your planner to start building
                your history.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/settings/billing">Explore Plus & Pro</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/calendar">Open planner</Link>
                </Button>
              </div>
            </section>
          </>
        ) : (
          <>
            <p className="mb-5 text-xs text-muted-foreground">
              {summary.start === "0000-01-01"
                ? "All recorded history"
                : `${summary.start} to ${summary.end}`}{" "}
              · Confirmed wears only. Plans and saved outfits are excluded.
            </p>
            {tab === "overview" && (
              <>
                <div className="analytics-stat-grid">
                  <Stat
                    label="Outfits worn"
                    value={summary.wearCount}
                    hint={`${summary.daysWorn} ${summary.daysWorn === 1 ? "day" : "days"} with a confirmed outfit`}
                  />
                  <Stat
                    label="Pieces worn"
                    value={`${summary.used.length} / ${summary.active.length}`}
                    hint={`${Math.round(summary.coverage * 100)}% of your active wardrobe`}
                  />
                  <Stat
                    label="Waiting for a wear"
                    value={summary.active.length - summary.used.length}
                    hint="No recorded wear in this period"
                  />
                  <Stat
                    label="Recorded purchase prices"
                    value={`${summary.pricedCount} / ${summary.active.length}`}
                    hint="Optional · needed for cost per wear"
                  />
                </div>
                {!summary.wearCount && (
                  <div className="my-6 rounded-xl border border-dashed border-border p-6">
                    <CalendarDays size={24} className="mb-3 text-primary" />
                    <h2 className="font-display text-2xl">
                      Your first wear tells us more
                    </h2>
                    <p className="my-2 text-sm text-muted-foreground">
                      Confirm an outfit you wore. Your trends will build from
                      your real history.
                    </p>
                    <Link className="text-sm text-primary" href="/calendar">
                      Record a worn outfit ↗
                    </Link>
                  </div>
                )}
                <div className="analytics-overview-grid mt-6">
                  <section className="analytics-panel">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="font-display text-2xl">
                        The pieces you reach for
                      </h2>
                      <button
                        className="text-xs text-primary"
                        onClick={() => changeTab("clothing")}
                      >
                        See all ↗
                      </button>
                    </div>
                    {topItems.length ? (
                      itemRows(topItems)
                    ) : (
                      <p className="py-6 text-sm text-muted-foreground">
                        Your most-worn pieces will appear here.
                      </p>
                    )}
                  </section>
                  <section className="analytics-panel">
                    <h2 className="mb-2 font-display text-2xl">
                      How much of each category you wear
                    </h2>
                    <p className="mb-5 text-xs text-muted-foreground">
                      Unique pieces worn out of the pieces you own.
                    </p>
                    {summary.categories.map((category) => (
                      <button
                        key={category.name}
                        className="mb-4 block w-full text-left"
                        aria-label={`${category.name}: ${category.worn} of ${category.owned} pieces worn. View clothing.`}
                        onClick={() => {
                          changeTab("clothing");
                          setSearch("");
                          setCategoryFilter(category.name);
                        }}
                      >
                        <div className="mb-2 flex justify-between text-xs">
                          <span>{category.name}</span>
                          <span className="text-muted-foreground">
                            {category.worn} / {category.owned}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${category.owned ? (category.worn / category.owned) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </button>
                    ))}
                  </section>
                </div>
                <section className="analytics-insight mt-6">
                  <div>
                    <h2 className="font-display text-2xl">
                      Give an overlooked piece a turn
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {summary.active.length - summary.used.length
                        ? `${summary.active.length - summary.used.length} pieces have no recorded wear in this period. Build a look around one you still like.`
                        : "Your wardrobe is getting regular use. Explore a different combination for your next plan."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSort("unworn");
                        changeTab("clothing");
                      }}
                    >
                      Explore unworn pieces
                    </Button>
                    <AskSebastian prompt="Help me make more use of overlooked pieces in my wardrobe." />
                  </div>
                </section>
              </>
            )}
            {tab === "clothing" && (
              <section className="analytics-panel">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl">
                      Every piece has a story
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Choose a piece to see its wear history and build a new
                      look.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-3 text-muted-foreground"
                      />
                      <input
                        aria-label="Search clothing analytics"
                        placeholder="Find a piece…"
                        className="rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setPage(0);
                        }}
                      />
                    </label>
                    <select
                      aria-label="Filter clothing category"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={categoryFilter}
                      onChange={(event) => {
                        setCategoryFilter(event.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="">All categories</option>
                      {summary.categories.map((category) => (
                        <option key={category.name}>{category.name}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Sort clothing analytics"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={sort}
                      onChange={(event) => {
                        setSort(event.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="most">Most worn</option>
                      <option value="least">Least worn</option>
                      <option value="unworn">Unworn this period</option>
                    </select>
                  </div>
                </div>
                {itemRows(visibleItems.slice(page * 20, page * 20 + 20))}
                {!visibleItems.length && (
                  <p className="py-8 text-sm text-muted-foreground">
                    No pieces match this view.
                  </p>
                )}
                {visibleItems.length > 20 && (
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      disabled={!page}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs">
                      Page {page + 1} of {Math.ceil(visibleItems.length / 20)}
                    </span>
                    <Button
                      variant="outline"
                      disabled={(page + 1) * 20 >= visibleItems.length}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </section>
            )}
            {tab === "history" && (
              <section className="analytics-panel">
                <h2 className="font-display text-2xl">
                  What you actually wore
                </h2>
                <p className="mb-5 mt-2 text-sm text-muted-foreground">
                  Open a date to review or correct the record in your planner.
                </p>
                {summary.wears.length ? (
                  [...summary.wears]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, (page + 1) * 30)
                    .map((wear) => (
                      <Link
                        key={wear.id}
                        href={`/calendar?date=${wear.date}`}
                        className="analytics-item-row"
                      >
                        <CalendarDays size={20} className="text-primary" />
                        <span className="flex-1 text-sm">
                          <strong className="block font-medium">
                            {wear.name}
                          </strong>
                          <span className="text-xs text-muted-foreground">
                            {wear.date} · {wear.itemIds.length} pieces · Worn
                          </span>
                        </span>
                        <div className="hidden h-12 gap-1 sm:flex">
                          {wear.itemIds.slice(0, 3).map((id) => {
                            const item = summary.items.find(
                              (item) => item.id === id,
                            );
                            return item ? (
                              <ItemImage key={id} item={item} />
                            ) : null;
                          })}
                        </div>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))
                ) : (
                  <p className="py-6 text-sm text-muted-foreground">
                    No confirmed wears in this period.
                  </p>
                )}
                {summary.wears.length > (page + 1) * 30 && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Show more history
                  </Button>
                )}
              </section>
            )}
            {tab === "cost" && (
              <section className="analytics-panel">
                <h2 className="font-display text-2xl">What each wear costs</h2>
                <p className="mb-5 mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Purchase price divided by all confirmed lifetime wears. These
                  values always use lifetime history, even when another time
                  period is selected. Unknown prices and unworn pieces have no
                  cost per wear.
                </p>
                <div className="mb-6 flex flex-wrap gap-3">
                  {summary.currencies.map((value) => (
                    <div
                      key={value.currency}
                      className="rounded-lg border border-border px-4 py-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        Known purchase value · {value.currency}
                      </p>
                      <p className="mt-1 text-xl">
                        {money(value.total, value.currency)}
                      </p>
                    </div>
                  ))}
                  <p className="self-center text-xs text-muted-foreground">
                    Prices recorded for {summary.pricedCount} of{" "}
                    {summary.active.length} active pieces. Currencies stay
                    separate.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs text-muted-foreground">
                      <tr>
                        <th className="py-3 font-medium">Piece</th>
                        <th className="px-3 font-medium">Purchase price</th>
                        <th className="px-3 font-medium">Lifetime wears</th>
                        <th className="py-3 text-right font-medium">
                          Cost per wear
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.active.map((item) => (
                        <tr className="border-b border-border" key={item.id}>
                          <td className="py-4">
                            <button
                              className="text-left font-medium hover:text-primary"
                              onClick={() => setSelectedId(item.id)}
                            >
                              {item.name}
                            </button>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {item.currency}
                            </span>
                          </td>
                          <td className="px-3">
                            {item.price === null ? (
                              <Link
                                href={`/wardrobe/items/${item.id}`}
                                className="text-xs text-primary"
                              >
                                Add price ↗
                              </Link>
                            ) : (
                              money(item.price, item.currency)
                            )}
                          </td>
                          <td className="px-3">{item.lifetimeWears}</td>
                          <td className="text-right">
                            {item.costPerWear === null
                              ? "—"
                              : money(item.costPerWear, item.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <AppDialog
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name || "Clothing wear history"}
      >
        {selected && (
          <>
            <div className="mb-5 flex items-center gap-4">
              <ItemImage item={selected} />
              <div>
                <p className="text-sm">
                  {selected.periodWears} wears in this period ·{" "}
                  {selected.lifetimeWears} lifetime
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last recorded wear: {selected.lastWorn || "No recorded wears"}
                  {!selected.active && " · Archived"}
                </p>
              </div>
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/wardrobe/items/${selected.id}`}>Open piece</Link>
              </Button>
              <AskSebastian
                contextHints={{ focusItemId: selected.id }}
                prompt={`Help me build a fresh look around my ${selected.name}.`}
              />
            </div>
            <h3 className="mb-2 font-medium">Confirmed wear history</h3>
            <div className="max-h-72 overflow-y-auto">
              {insights?.wears
                .filter(
                  (wear) =>
                    wear.itemIds.includes(selected.id) &&
                    wear.date <= insights.asOf,
                )
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((wear) => (
                  <Link
                    href={`/calendar?date=${wear.date}`}
                    key={wear.id}
                    className="flex items-center justify-between border-b border-border py-3 text-sm"
                  >
                    <span>
                      {wear.date} · {wear.name}
                    </span>
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
              {!selected.lifetimeWears && (
                <p className="py-4 text-sm text-muted-foreground">
                  No wears recorded yet. Try planning a look around this piece.
                </p>
              )}
            </div>
          </>
        )}
      </AppDialog>
    </div>
  );
}
