"use client";
import { useRef, useState } from "react";
import { Download, Share2, Lock } from "lucide-react";
import Link from "next/link";
import type { WardrobeItem } from "@/lib/types/database";
import { OutfitComposition } from "@/components/outfit-composition";
import { Button } from "@/components/ui/button";

interface ExportOutfit {
  id: string;
  name: string;
  score: number | null;
  items?: WardrobeItem[];
}
export function ExportShareClient({
  tier,
  outfits,
}: {
  tier: "free" | "plus" | "pro";
  outfits: ExportOutfit[];
}) {
  const [selectedId, setSelectedId] = useState(outfits[0]?.id || ""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const card = useRef<HTMLDivElement>(null);
  const selected = outfits.find((outfit) => outfit.id === selectedId);
  const download = (file: File) => {
    const url = URL.createObjectURL(file),
      link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportImage = async (share = false) => {
    if (tier !== "pro" || !card.current || !selected || busy) return;
    setBusy(true);
    setStatus("");
    try {
      const { toBlob } = await import("html-to-image");
      // Resolve the theme before SVG/canvas rendering; root CSS variables are
      // outside the exported subtree and can otherwise leave white text transparent.
      const computed = getComputedStyle(card.current);
      const backgroundColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-base")
          .trim() || "#0b1020";
      const blob = await toBlob(card.current, {
        pixelRatio: 2,
        backgroundColor,
        style: { backgroundColor, color: computed.color },
      });
      if (!blob) throw new Error("Empty export");
      const filename =
        selected.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 80) || "outfit";
      const file = new File([blob], filename + ".png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: selected.name, files: [file] });
        setStatus("Outfit image shared.");
      } else {
        download(file);
        setStatus(
          share
            ? "Image downloaded. Share the PNG file from your device."
            : "Outfit image downloaded.",
        );
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setStatus("Could not create the outfit image. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-shell-content">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-xs uppercase tracking-widest text-primary">
          Your saved outfits
        </p>
        <h1 className="font-display text-4xl">Take a look with you</h1>
        <p className="mb-7 mt-3 text-sm text-muted-foreground">
          Download an outfit image with all its pieces, or share the image from
          your device.
        </p>
        {tier !== "pro" ? (
          <section className="rounded-xl border border-border p-6">
            <Lock size={22} className="mb-3 text-primary" />
            <h2 className="text-lg font-medium">Export outfits with Pro</h2>
            <p className="my-3 text-sm text-muted-foreground">
              Keep a visual copy or send an outfit image to someone else.
            </p>
            <Button asChild>
              <Link href="/settings/billing">Explore Pro</Link>
            </Button>
          </section>
        ) : !selected ? (
          <p className="text-sm text-muted-foreground">
            Save an outfit first.{" "}
            <Link href="/outfits" className="text-primary underline">
              Open outfits
            </Link>
          </p>
        ) : (
          <div className="space-y-5">
            <label className="block text-sm">
              Choose an outfit
              <select
                className="mt-2 block w-full rounded-lg border border-border bg-background p-3"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                disabled={busy}
              >
                {outfits.map((outfit) => (
                  <option key={outfit.id} value={outfit.id}>
                    {outfit.name}
                  </option>
                ))}
              </select>
            </label>
            <div
              ref={card}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h2 className="mb-4 font-display text-2xl">{selected.name}</h2>
              {selected.items?.length ? (
                <OutfitComposition items={selected.items} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No clothing pieces are attached to this outfit.
                </p>
              )}
              <p className="mt-5 text-xs text-muted-foreground">
                {selected.items?.length || 0} pieces · My AI Outfit ·
                myaioutfit.com
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={busy || !selected.items?.length}
                onClick={() => void exportImage()}
              >
                <Download size={16} />
                {busy ? "Preparing image…" : "Export as image"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !selected.items?.length}
                onClick={() => void exportImage(true)}
              >
                <Share2 size={16} />
                Share image
              </Button>
            </div>
            {status && (
              <p role="status" className="text-sm text-muted-foreground">
                {status}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
