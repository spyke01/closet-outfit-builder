import { Sparkles } from 'lucide-react';

export function AnalyticsComingSoon() {
  return (
    <section className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> Coming Soon
      </h2>
      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
        <li>Style heatmap by day/occasion</li>
        <li>Seasonal wardrobe coverage report</li>
        <li>Cost-per-wear calculator</li>
        <li>Color palette analysis</li>
      </ul>
    </section>
  );
}
