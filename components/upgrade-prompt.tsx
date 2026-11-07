"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";

export type UpgradeFeature = "everyday-look" | "evening-look" | "today-ai" | "wardrobe-image" | "assistant" | "assistant-item" | "assistant-planner" | "assistant-trip" | "analytics-overview" | "analytics-clothing" | "analytics-history" | "analytics-cost";

const content: Record<UpgradeFeature, { title: string; description: string; benefits: string[] }> = {
  "today-ai": {
    title: "Get an outfit tailored to your plans",
    description: "Your free AI outfit trial has been used. Plus and Pro include more AI outfit suggestions based on your wardrobe, occasion, and style preferences.",
    benefits: ["Describe your occasion and preferred style", "Save the suggestions you like", "Refine your choices in a conversation with Sebastian"],
  },
  "wardrobe-image": {
    title: "Give this piece a clear wardrobe image",
    description: "Create a representative clothing image from the category, color, and details you provide. Upload your own photo when an exact match matters.",
    benefits: ["Create a clean image when you don’t have a photo", "See the piece alongside the rest of your wardrobe", "Get more outfit ideas and Sebastian’s style advice too"],
  },
  "everyday-look": {
    title: "Make everyday dressing easier",
    description: "Get a relaxed outfit for your day, built from the clothes you own and adapted to the weather.",
    benefits: ["Switch between everyday, work, and going-out looks", "Swap pieces to make each outfit yours", "Talk through outfit choices with Sebastian"],
  },
  "evening-look": {
    title: "Dress for your next night out",
    description: "Find a polished evening look from your own wardrobe, with the weather and occasion in mind.",
    benefits: ["Get a look tailored to your evening plans", "Explore more everyday and work combinations too", "Ask Sebastian how to refine the outfit"],
  },
  assistant: {
    title: "Talk through what to wear",
    description: "Ask Sebastian a question about your own wardrobe and keep the conversation going as your plans change.",
    benefits: ["Get advice based on the clothes you own", "Refine outfits for the weather and occasion", "Work through upcoming plans and packing choices"],
  },
  "assistant-item": {
    title: "Find more ways to wear this piece",
    description: "Ask Sebastian to build around the piece you’re viewing and talk through the combinations that suit your plans.",
    benefits: ["Pair it with clothes already in your wardrobe", "Adjust the look for your occasion", "Continue the conversation from any page"],
  },
  "assistant-planner": {
    title: "Make a plan for what to wear",
    description: "Talk through your day with Sebastian and get help choosing an outfit from your wardrobe.",
    benefits: ["Discuss the occasion and forecast", "Refine your outfit before you plan it", "Get wardrobe advice whenever you need it"],
  },
  "assistant-trip": {
    title: "Pack with a clearer plan",
    description: "Ask Sebastian to help you choose versatile pieces and outfits for your trip.",
    benefits: ["Discuss your destination and activities", "Find combinations using the clothes you own", "Get help refining your packing choices"],
  },
  "analytics-overview": {
    title: "See what earns its place in your wardrobe",
    description: "Go beyond wardrobe totals to see which pieces you wear, what goes unused, and how your habits change.",
    benefits: ["Compare wear patterns over longer periods", "Find frequently worn and overlooked pieces", "Explore clothing history and cost per wear"],
  },
  "analytics-clothing": {
    title: "Find the pieces you reach for most",
    description: "Turn your clothing list into a view of what you actually wear and what could use another turn.",
    benefits: ["Rank pieces by recorded wears", "Filter by category and find unworn clothing", "Open each piece’s wear history"],
  },
  "analytics-history": {
    title: "See the pattern in what you wear",
    description: "Look back through your recorded outfits and compare your choices over longer periods.",
    benefits: ["Explore your full recorded wear history", "Compare 30 days, 90 days, or a year", "Open any recorded day in your planner"],
  },
  "analytics-cost": {
    title: "Learn what each wear costs",
    description: "See which pieces give you lasting value using purchase prices and confirmed wears.",
    benefits: ["Calculate cost per wear for priced pieces", "Keep different currencies separate", "See where another wear could add more value"],
  },
};

export function UpgradePrompt({ feature, onClose, compact = false }: { feature: UpgradeFeature; onClose?: () => void; compact?: boolean }) {
  const copy = content[feature];
  const [open, setOpen] = useState(false);
  const Heading = compact ? "h2" : "h3";
  if (compact) return (
    <section className="upgrade-banner" aria-label={copy.title}>
      <div><p className="upgrade-eyebrow"><LockKeyhole size={12} aria-hidden="true" /> Plus & Pro</p><p className="mt-1 text-sm">{copy.title}</p></div>
      <Button variant="outline" onClick={() => setOpen(true)}>See benefits</Button>
      <AppDialog open={open} onClose={() => setOpen(false)} title="More insights from your wardrobe">
        {open && <UpgradePrompt feature={feature} onClose={() => setOpen(false)} />}
      </AppDialog>
    </section>
  );
  return (
    <section className={`upgrade-prompt ${compact ? "upgrade-prompt--compact" : ""}`} aria-label={copy.title}>
      <p className="upgrade-eyebrow"><LockKeyhole size={14} aria-hidden="true" /> Available with Plus & Pro</p>
      <Heading className="font-display text-2xl">{copy.title}</Heading>
      <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
      {!compact && <ul className="space-y-3 text-sm">{copy.benefits.map(benefit => <li key={benefit} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><span>{benefit}</span></li>)}</ul>}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild><Link href="/settings/billing" onClick={onClose}>Compare Plus & Pro</Link></Button>
        {onClose && <Button variant="ghost" onClick={onClose}>Maybe later</Button>}
      </div>
      <p className="text-xs text-muted-foreground">See what’s included and choose the plan that suits you.</p>
    </section>
  );
}
