"use client";

import Image from "next/image";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WardrobeItem } from "@/lib/types/database";
import { useUpdateWardrobeItem } from "@/lib/hooks/use-wardrobe-items";
import { AskSebastian } from "@/components/ask-sebastian";
import { Button } from "@/components/ui/button";

export function WardrobePieceTools({ item }: { item: WardrobeItem }) {
  const update = useUpdateWardrobeItem();
  const [prepared, setPrepared] = useState(item.prepared_image_url || ""),
    [photoStatus, setPhotoStatus] = useState(""),
    [error, setError] = useState("");
  const [price, setPrice] = useState(item.purchase_price?.toString() || ""),
    [currency, setCurrency] = useState(item.purchase_currency || "USD");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setPrice(item.purchase_price?.toString() || "");
    setCurrency(item.purchase_currency || "USD");
  }, [item.purchase_price, item.purchase_currency]);
  useEffect(() => {
    setPrepared(item.prepared_image_url || "");
    if (
      !item.image_processing_job_id ||
      item.prepared_image_url ||
      !["processing", "pending"].includes(item.bg_removal_status)
    )
      return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/ai/jobs/${item.image_processing_job_id}`,
          { cache: "no-store" },
        );
        if (!response.ok || canceled) return;
        const job = await response.json();
        if (canceled) return;
        if (job.status === "succeeded" && job.result?.preparedImageUrl) {
          setPrepared(job.result.preparedImageUrl);
          setPhotoStatus("Your cleaned photo is ready to review.");
          // This also handles a piece saved just after its worker finished.
          await update.mutateAsync({
            id: item.id,
            prepared_image_url: job.result.preparedImageUrl,
            bg_removal_status: "completed",
          });
          return;
        }
        if (job.status === "succeeded" && job.result?.image_url) {
          await update.mutateAsync({
            id: item.id,
            image_url: job.result.image_url,
            bg_removal_status: "completed",
          });
          return;
        }
        if (job.status === "failed") {
          setPhotoStatus(
            "Cleanup could not finish. Your original photo is ready to use.",
          );
          return;
        }
        setPhotoStatus(
          "Your photo is still being prepared. You can keep using your original.",
        );
      } catch {
        /* Keep the original visible during a transient status failure. */
      }
      if (!canceled) timer = setTimeout(load, 4000);
    };
    void load();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
    // The owned item/job association determines the preparation to resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    item.id,
    item.image_processing_job_id,
    item.prepared_image_url,
    item.bg_removal_status,
  ]);
  const applyPhoto = async (url: string) => {
    setError("");
    try {
      await update.mutateAsync({
        id: item.id,
        image_url: url,
        image_processing_job_id: null,
      });
      setPhotoStatus("Photo updated. Your original is still available.");
    } catch {
      setError("Could not change this photo. Please try again.");
    }
  };
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-[var(--accent-muted)] p-5">
        <h2 className="font-display text-2xl">Build around this piece</h2>
        <p className="my-3 text-sm text-muted-foreground">
          Start with this piece and find a complete look from your wardrobe.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link
              href={`/anchor/${encodeURIComponent(item.category?.name || "Shirt")}/${item.id}`}
            >
              Find an outfit
            </Link>
          </Button>
          <AskSebastian
            contextHints={{ focusItemId: item.id }}
            prompt={`Help me build an outfit around my ${item.name}.`}
          />
        </div>
      </section>
      {item.original_image_url && (
        <section className="rounded-xl border border-border p-5">
          <h2 className="font-display text-xl">Your clothing photo</h2>
          {photoStatus && (
            <p role="status" className="my-3 text-xs text-muted-foreground">
              {photoStatus}
            </p>
          )}
          {prepared ? (
            <>
              <p className="my-3 text-xs text-muted-foreground">
                Check the real color, pattern, and shape before choosing the
                cleaned photo.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { url: item.original_image_url, label: "Original" },
                  { url: prepared, label: "Cleaned photo" },
                ].map((choice) => (
                  <button
                    type="button"
                    key={choice.label}
                    className={`rounded-lg border p-2 ${item.image_url === choice.url ? "border-primary" : "border-border"}`}
                    onClick={() => void applyPhoto(choice.url)}
                    disabled={update.isPending}
                    aria-pressed={item.image_url === choice.url}
                  >
                    <Image
                      width={384}
                      height={256}
                      unoptimized
                      src={choice.url}
                      alt={choice.label}
                      className="h-32 w-full object-contain"
                    />
                    <span className="mt-2 block text-xs">
                      {item.image_url === choice.url ? "✓ " : "Use "}
                      {choice.label.toLowerCase()}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : item.image_url !== item.original_image_url ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={update.isPending}
              onClick={() => void applyPhoto(item.original_image_url!)}
            >
              Use original photo
            </Button>
          ) : item.bg_removal_status === "failed" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              The original is saved. You can upload a different photo from Edit.
            </p>
          ) : null}
        </section>
      )}
      <details className="rounded-xl border border-border p-5">
        <summary className="cursor-pointer text-sm font-medium">
          Purchase price · optional
        </summary>
        <p className="my-3 text-xs text-muted-foreground">
          Used for lifetime cost per wear in analytics. Leave it empty if you
          don’t know.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setSaved(false);
            try {
              await update.mutateAsync({
                id: item.id,
                purchase_price: price === "" ? null : Number(price),
                purchase_currency: currency,
              });
              setSaved(true);
            } catch {
              setError("Could not save the price. Please try again.");
            }
          }}
        >
          <div className="flex flex-wrap gap-3">
            <label className="flex-1 text-xs">
              Price
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
            <label className="text-xs">
              Currency
              <select
                className="mt-1 block rounded-lg border border-border bg-background p-2 text-sm"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {[
                  ...new Set([
                    "USD",
                    "CAD",
                    "GBP",
                    "EUR",
                    "AUD",
                    "NZD",
                    "JPY",
                    "CHF",
                    currency,
                  ]),
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <Button
            type="submit"
            size="sm"
            className="mt-3"
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save price"}
          </Button>
          {saved && (
            <span role="status" className="ml-3 text-xs text-primary">
              Price saved
            </span>
          )}
        </form>
      </details>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
