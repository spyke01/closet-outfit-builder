'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Lock, TrendingUp, Heart, Clock, Zap } from 'lucide-react';
import type { AnalyticsDashboardResponse, MostWornItem, RecentlyAddedItem, OutfitHistoryEntry } from '@/lib/types/analytics';
import { AnalyticsComingSoon } from './analytics-coming-soon';

interface Props {
  data: AnalyticsDashboardResponse;
}

function UpgradeGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-surface relative overflow-hidden rounded-[var(--radius-lg)]">
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] backdrop-blur-[var(--blur-glass)]">
        <Lock className="w-5 h-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center px-4">
          Upgrade to Plus or Pro to unlock detailed analytics
        </p>
        <Link
          href="/settings/billing"
          className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-surface flex flex-col gap-1 p-4">
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

function RecentlyAddedSection({ items }: { items: RecentlyAddedItem[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Clock className="w-4 h-4" /> Recently Added
      </h2>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div key={item.id} className="glass-surface flex flex-col items-center gap-1 p-2">
            {item.imageUrl ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="80px" />
              </div>
            ) : (
              <div className="aspect-square w-full rounded-[var(--radius-md)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]" />
            )}
            <span className="text-xs text-muted-foreground truncate w-full text-center">{item.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MostWornSection({ items }: { items: MostWornItem[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <TrendingUp className="w-4 h-4" /> Most Worn
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div key={item.id} className="glass-surface flex items-center gap-3 px-4 py-3">
            <span className="w-6 text-sm font-bold text-muted-foreground text-center">{idx + 1}</span>
            {item.imageUrl ? (
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="40px" />
              </div>
            ) : (
              <div className="h-10 w-10 flex-shrink-0 rounded-[var(--radius-sm)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]" />
            )}
            <span className="flex-1 text-sm font-medium text-foreground truncate">{item.name}</span>
            <span className="text-xs text-muted-foreground">{item.appearanceCount} outfit{item.appearanceCount !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OutfitEngagementSection({ outfitHistory }: { outfitHistory: OutfitHistoryEntry[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Heart className="w-4 h-4" /> Recent Outfits
      </h2>
      <div className="flex flex-col gap-2">
        {outfitHistory.map((outfit) => (
          <div key={outfit.id} className="glass-surface flex items-center gap-3 px-4 py-3">
            <span className="flex-1 text-sm text-foreground truncate">{outfit.name}</span>
            {outfit.loved && <Heart className="w-3.5 h-3.5 text-destructive fill-destructive flex-shrink-0" />}
            {outfit.score != null && (
              <span className="text-xs text-muted-foreground">{outfit.score}%</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TodayStatsSection({ totalRecommendations, accepted, acceptanceRate }: {
  totalRecommendations: number;
  accepted: number;
  acceptanceRate: number;
}) {
  const pct = Math.round(acceptanceRate * 100);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Zap className="w-4 h-4" /> AI Recommendations
      </h2>
      <div className="glass-surface flex flex-col gap-2 p-4">
        <p className="text-sm text-foreground">
          {accepted} of {totalRecommendations} recommendation{totalRecommendations !== 1 ? 's' : ''} saved —{' '}
          <strong>{pct}%</strong> acceptance rate
        </p>
        {totalRecommendations > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export function AnalyticsDashboard({ data }: Props) {
  const isFree = 'tier' in data && data.tier === 'free';

  return (
    <div className="page-shell-content mx-auto flex max-w-[1240px] flex-col gap-8 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your wardrobe and outfit engagement at a glance
        </p>
      </div>

      {/* Wardrobe basics — visible to all */}
      <section className="grid grid-cols-2 gap-4">
        <StatCard label="Wardrobe Items" value={data.wardrobe.totalItems} />
        <StatCard label="Saved Outfits" value={data.wardrobe.totalOutfits} />
      </section>

      {/* Recently Added */}
      {isFree || !data.wardrobe.recentlyAdded ? (
        <UpgradeGate>
          <div className="h-28 rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]" />
        </UpgradeGate>
      ) : (
        <RecentlyAddedSection items={data.wardrobe.recentlyAdded} />
      )}

      {/* Most Worn */}
      {isFree || !data.wardrobe.mostWorn ? (
        <UpgradeGate>
          <div className="h-40 rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]" />
        </UpgradeGate>
      ) : (
        <MostWornSection items={data.wardrobe.mostWorn} />
      )}

      {/* Outfit engagement */}
      {isFree || !('engagement' in data) || !data.engagement ? (
        <UpgradeGate>
          <div className="h-40 rounded-[var(--radius-lg)] border border-[var(--item-img-border)] bg-[var(--item-img-bg)]" />
        </UpgradeGate>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4">
            <StatCard label="Loved Outfits" value={data.engagement.lovedOutfits} />
            <StatCard label="Outfits Saved" value={data.engagement.savedOutfits} />
          </section>
          <OutfitEngagementSection outfitHistory={data.engagement.outfitHistory} />
          <TodayStatsSection
            totalRecommendations={data.engagement.todayStats.totalRecommendations}
            accepted={data.engagement.todayStats.accepted}
            acceptanceRate={data.engagement.todayStats.acceptanceRate}
          />
        </>
      )}

      <AnalyticsComingSoon />
    </div>
  );
}
