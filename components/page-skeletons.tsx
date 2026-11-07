import type { ReactNode } from "react";
import { LoadingStatus } from "@/components/loading-status";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`loading-bone ${className}`} />;
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="page-shell-content page-shell-content--wide" data-page-skeleton={label}>
      <div className="mb-7 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <LoadingStatus label={label} />
      </div>
      {children}
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-[var(--bg-surface)] p-4 sm:p-6 ${className}`}>{children}</div>;
}

export function CalendarGridSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-7 gap-1 sm:gap-2">
      {Array.from({ length: 35 }, (_, index) => <Skeleton key={index} className="h-16 sm:h-24" />)}
    </div>
  );
}

export function PlanListSkeleton() {
  return <div className="space-y-4" aria-hidden="true">{Array.from({ length: 3 }, (_, i) => (
    <Panel key={i}>
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="flex gap-3">{[0, 1, 2].map(j => <Skeleton key={j} className="h-24 w-20" />)}</div>
    </Panel>
  ))}</div>;
}

export function CalendarPageSkeleton() {
  return <Frame label="Planner">
    <Skeleton className="mb-6 h-10 w-72 max-w-full" />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Panel><Skeleton className="mb-6 h-7 w-40" /><CalendarGridSkeleton /></Panel>
      <Panel><Skeleton className="mb-5 h-7 w-36" /><Skeleton className="h-60 w-full" /></Panel>
    </div>
  </Frame>;
}

export function TodayPageSkeleton() {
  return <Frame label="Today’s outfit">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel><Skeleton className="h-80 w-full sm:h-96" /><Skeleton className="mt-5 h-10 w-full" /></Panel>
      <Panel><Skeleton className="mb-5 h-7 w-48" /><Skeleton className="h-28 w-full" /><Skeleton className="mt-6 h-32 w-full" /></Panel>
    </div>
  </Frame>;
}

export function CollectionPageSkeleton({ kind = "Wardrobe" }: { kind?: "Wardrobe" | "Outfits" }) {
  return <Frame label={kind}>
    <Skeleton className="mb-6 h-11 w-full" />
    <div className={`grid grid-cols-2 gap-4 ${kind === "Wardrobe" ? "md:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-3"}`}>
      {Array.from({ length: 6 }, (_, i) => <Panel key={i} className="!p-3"><Skeleton className="aspect-[4/5] w-full" /><Skeleton className="mt-4 h-4 w-3/4" /><Skeleton className="mt-3 h-3 w-1/2" /></Panel>)}
    </div>
  </Frame>;
}

export function AnalyticsPageSkeleton() {
  return <Frame label="Analytics">
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Panel key={i}><Skeleton className="h-3 w-20" /><Skeleton className="mt-5 h-9 w-16" /></Panel>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">{[0, 1].map(i => <Panel key={i}><Skeleton className="mb-6 h-6 w-48 max-w-full" /><Skeleton className="h-64 w-full" /></Panel>)}</div>
  </Frame>;
}

export function TripsPageSkeleton() {
  return <Frame label="Trips & packing"><Skeleton className="mb-6 h-10 w-72 max-w-full" /><PlanListSkeleton /></Frame>;
}

export function UpcomingPageSkeleton() {
  return <Frame label="Upcoming plans"><Skeleton className="mb-6 h-10 w-72 max-w-full" /><PlanListSkeleton /></Frame>;
}

export function AppPageSkeleton() {
  return <Frame label="your page"><Panel><Skeleton className="h-64 w-full" /></Panel></Frame>;
}
