"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBillingEntitlements } from "@/lib/hooks/use-billing-entitlements";
import {
  parseClothingDetails,
  type ClothingDetails,
} from "@/lib/services/ai/clothing-details";
import { COLOR_OPTIONS } from "@/lib/data/color-options";

export function ClothingPhotoSuggestions({
  imageUrl,
  categories,
  onApply,
}: {
  imageUrl: string;
  categories: Array<{ id: string; name: string }>;
  onApply: (details: ClothingDetails) => void;
}) {
  const { entitlements, loading } = useBillingEntitlements(true);
  const [busy, setBusy] = useState(false),
    [suggestion, setSuggestion] = useState<ClothingDetails | null>(null),
    [error, setError] = useState("");
  const alive = useRef(true),
    lock = useRef(false),
    image = useRef(imageUrl);
  image.current = imageUrl;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const suggest = async () => {
    if (lock.current || !entitlements?.isPaid) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const original = imageUrl;
    const current = () => alive.current && image.current === original;
    try {
      const key = `photo-details:${imageUrl}`;
      const requestId = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, requestId);
      const response = await fetch("/api/wardrobe/suggest-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, requestId }),
      });
      let payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Details could not be suggested.");
      if (payload.pending && payload.jobId) {
        for (let attempt = 0; attempt < 80 && current(); attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const status = await fetch(`/api/ai/jobs/${payload.jobId}`, {
            cache: "no-store",
          });
          if (!status.ok) continue;
          const job = await status.json();
          if (job.status === "failed" || job.status === "canceled")
            throw new Error(
              "Details could not be suggested. Enter them yourself or try again later.",
            );
          if (job.status === "succeeded") {
            payload = {
              suggestion: parseClothingDetails(
                job.result?.text || "",
                categories.map((category) => category.id),
              ),
            };
            break;
          }
        }
      }
      if (!current()) return;
      const details = parseClothingDetails(
        JSON.stringify(payload.suggestion),
        categories.map((category) => category.id),
      );
      if (!details)
        throw new Error(
          "The suggestion is not ready. You can keep entering details and check again later.",
        );
      setSuggestion(details);
    } catch (cause) {
      if (current())
        setError(
          cause instanceof Error
            ? cause.message
            : "Details could not be suggested.",
        );
    } finally {
      if (current()) {
        setBusy(false);
        lock.current = false;
      }
    }
  };
  if (loading) return null;
  return (
    <section className="mt-4 rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium">
        Let Sebastian help with the details
      </h3>
      <p className="my-2 text-xs leading-relaxed text-muted-foreground">
        Suggest a name, category, and color from this photo. Review the
        suggestion before applying it. Uses one vision message from your
        membership allowance.
      </p>
      {entitlements?.isPaid ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void suggest()}
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          {busy ? "Looking at your photo…" : "Suggest details from this photo"}
        </Button>
      ) : (
        <Link href="/settings/billing" className="text-xs text-primary">
          Explore Plus and Pro ↗
        </Link>
      )}
      {error && (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          {error}
        </p>
      )}
      {suggestion && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium">Review Sebastian’s suggestion</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt>Name</dt>
            <dd>{suggestion.name}</dd>
            <dt>Category</dt>
            <dd>
              {categories.find(
                (category) => category.id === suggestion.category_id,
              )?.name || "Choose this yourself"}
            </dd>
            <dt>Color</dt>
            <dd>
              {COLOR_OPTIONS.find((color) => color.value === suggestion.color)
                ?.label || "Choose this yourself"}
            </dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            Applying replaces these fields. Check them against your actual
            piece.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onApply(suggestion);
              setSuggestion(null);
            }}
          >
            Apply suggested details
          </Button>
        </div>
      )}
    </section>
  );
}
