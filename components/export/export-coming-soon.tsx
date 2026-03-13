import { Sparkles } from 'lucide-react';

export function ExportComingSoon() {
  return (
    <section className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> Coming Soon
      </h2>
      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
        <li>Share to Instagram Stories</li>
        <li>Export full lookbook as PDF</li>
        <li>Generate a packing list PDF from a trip</li>
        <li>Collaborate with a stylist</li>
      </ul>
    </section>
  );
}
