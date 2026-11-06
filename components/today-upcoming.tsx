"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCalendarEntriesByMonth } from "@/lib/hooks/use-calendar-entries";
import { OutfitThumbnails } from "@/components/outfit-composition";

import { localDateKey } from "@/lib/utils/local-date";
export function TodayUpcoming() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const now = useMemo(() => new Date(), []);
  const { data, isLoading, error } = useCalendarEntriesByMonth({ month: now });
  const dates = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() + index);
    return date;
  });
  return (
    <section className="mt-9">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">The next few days</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Plan ahead, then confirm what you wore.
          </p>
        </div>
        <Link href="/calendar" className="text-sm text-primary">
          Open planner ↗
        </Link>
      </div>
      {!hydrated ? (
        <p className="text-sm text-muted-foreground">Loading your plans…</p>
      ) : error ? (
        <p role="status" className="text-sm text-muted-foreground">
          Your plans could not be loaded. Open the planner to try again.
        </p>
      ) : (
        <div className="today-upcoming-grid">
          {dates.map((date) => {
            const key = localDateKey(date);
            const entries =
              data?.entries.filter((entry) => entry.entry_date === key) || [];
            const first = entries[0];
            return (
              <Link
                key={key}
                href={`/calendar?date=${key}`}
                className="today-upcoming-day"
              >
                <div className="mb-3 flex justify-between text-[10px] uppercase text-muted-foreground">
                  <span>
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span>{date.getDate()}</span>
                </div>
                {first ? (
                  <>
                    <OutfitThumbnails items={first.items || []} />
                    <p className="mt-2 text-xs">
                      {first.status === "worn" ? "✓ Worn" : "Planned"} ·{" "}
                      {first.outfit?.name || "Your outfit"}
                    </p>
                    {entries.length > 1 && (
                      <p className="mt-1 text-[10px] text-primary">
                        +{entries.length - 1} more{" "}
                        {entries.length === 2 ? "outfit" : "outfits"}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex h-20 items-center justify-center text-muted-foreground">
                      <Plus size={20} />
                    </div>
                    <p className="text-xs">
                      {isLoading ? "Loading…" : "Plan an outfit"}
                    </p>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
