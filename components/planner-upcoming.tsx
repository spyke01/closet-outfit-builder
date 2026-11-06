"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlannerTabs } from "@/components/planner-tabs";
import { useCalendarEntriesByMonth } from "@/lib/hooks/use-calendar-entries";
import { OutfitThumbnails } from "@/components/outfit-composition";
import { OutfitPieceList } from "@/components/outfit-piece-list";
import { AskSebastian } from "@/components/ask-sebastian";
import { Button } from "@/components/ui/button";
import { localDateKey } from "@/lib/utils/local-date";

export function PlannerUpcoming() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const now = useMemo(() => new Date(), []);
  const { data, isLoading, error } = useCalendarEntriesByMonth({
    month: now,
    lookbackDays: 14,
  });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() + index);
    return date;
  });
  return (
    <div className="page-shell-content">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">
            A little planning, easier mornings
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Make room for each part of your day, then confirm what you wore.
          </p>
        </div>
        <Button asChild>
          <Link href="/calendar">Plan the next few days</Link>
        </Button>
      </header>
      <PlannerTabs active="upcoming" />
      {error && (
        <p role="alert" className="my-4 text-sm text-destructive">
          Could not load your plans. Open the calendar to try again.
        </p>
      )}
      {!hydrated || isLoading ? (
        <p role="status" className="py-8 text-muted-foreground">
          Loading your plans…
        </p>
      ) : (
        <div className="space-y-4">
          {days.map((date) => {
            const key = localDateKey(date);
            const entries =
              data?.entries.filter((entry) => entry.entry_date === key) || [];
            return (
              <section
                key={key}
                className="rounded-xl border border-border bg-[var(--bg-surface)] p-5"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl">
                    {date.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </h2>
                  <Link
                    className="text-xs text-primary"
                    href={`/calendar?date=${key}`}
                  >
                    {entries.length ? "Edit this day ↗" : "Plan an outfit ↗"}
                  </Link>
                </div>
                {entries.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {entries.map((entry) => (
                      <article
                        key={entry.id}
                        className="min-w-0 rounded-lg border border-border p-4"
                      >
                        <OutfitThumbnails
                          items={entry.items || []}
                          className="!h-28"
                        />
                        <h3 className="mb-1 mt-4 text-sm font-medium">
                          {entry.outfit?.name || "Your outfit"}
                        </h3>
                        <p className="text-xs text-primary">
                          {entry.status === "worn" ? "✓ Worn" : "Planned"} ·{" "}
                          {entry.items?.length || 0} pieces
                        </p>
                        <OutfitPieceList items={entry.items || []} />
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      No outfit planned yet.
                    </p>
                    <AskSebastian
                      contextHints={{ eventDate: key }}
                      prompt={`Help me choose an outfit for ${key}.`}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
