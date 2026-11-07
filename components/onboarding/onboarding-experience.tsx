"use client";

import Image from "@/components/clothing-image";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { OnboardingWizard } from "./onboarding-wizard";
import {
  ONBOARDING_CATEGORIES,
  type CategoryKey,
} from "@/lib/data/onboarding-categories";
import { COLOR_OPTIONS } from "@/lib/data/color-options";
import { generateWardrobeItems } from "@/lib/services/onboarding-generator";
import { ensureCategoriesExist } from "@/lib/services/onboarding-category-manager";
import { persistWardrobeItems } from "@/lib/services/onboarding-persister";
import { useAuth } from "@/lib/hooks/use-auth";
import { queryKeys } from "@/lib/query-client";
import { Button } from "@/components/ui/button";

type Choice = {
  category: CategoryKey;
  type: string;
  color: string;
  selected: boolean;
};
const initial: Choice[] = [
  { category: "Tops", type: "OCBD", color: "blue", selected: false },
  { category: "Bottoms", type: "Chinos", color: "navy", selected: false },
  { category: "Shoes", type: "Sneakers", color: "white", selected: false },
];
export function OnboardingExperience({
  forceMode = false,
  forceFreshStart = false,
}: {
  forceMode?: boolean;
  forceFreshStart?: boolean;
}) {
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [full, setFull] = useState(forceMode),
    [choices, setChoices] = useState<Choice[]>(initial),
    [dress, setDress] = useState(false);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const lock = useRef(false);
  const storageKey = userId ? `quick-wardrobe:${userId}` : null;
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (
        saved?.choices?.length === 3 &&
        saved.choices.every(
          (item: Choice) =>
            ONBOARDING_CATEGORIES.some(
              (category) =>
                category.key === item.category &&
                category.subcategories.some((type) => type.name === item.type),
            ) && COLOR_OPTIONS.some((color) => color.value === item.color),
        )
      ) {
        setChoices(saved.choices);
        setDress(!!saved.dress);
      }
    } catch {
      /* Ignore an obsolete local draft. */
    }
    setHydrated(true);
  }, [storageKey]);
  useEffect(() => {
    if (storageKey && hydrated)
      sessionStorage.setItem(storageKey, JSON.stringify({ choices, dress }));
  }, [storageKey, hydrated, choices, dress]);
  if (full)
    return (
      <div>
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => setFull(false)}
          >
            ← Use the quick start
          </button>
        </div>
        <OnboardingWizard
          forceMode={forceMode}
          forceFreshStart={forceFreshStart}
        />
      </div>
    );
  const visible = choices.filter((_, index) => !dress || index !== 1);
  const ready = visible.every((choice) => choice.selected);
  const update = (index: number, value: Partial<Choice>) =>
    setChoices((previous) =>
      previous.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...value } : choice,
      ),
    );
  const save = async () => {
    if (!userId || lock.current || !ready) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const categories = visible.map((choice) => choice.category);
      const items = generateWardrobeItems(
        categories,
        Object.fromEntries(
          visible.map((choice) => [choice.category, [choice.type]]),
        ),
        Object.fromEntries(
          visible.map((choice) => [
            `${choice.category}-${choice.type}`,
            { subcategory: choice.type, colors: [choice.color] },
          ]),
        ),
        { primaryUse: "Mixed", climate: "Mixed" },
        true,
        3,
      );
      const mapping = await ensureCategoriesExist(userId, categories);
      const result = await persistWardrobeItems(userId, items, mapping);
      if (result.failed || result.success !== items.length)
        throw new Error(result.errors[0] || "Could not save these pieces.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
      if (storageKey) sessionStorage.removeItem(storageKey);
      router.push("/today");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save these pieces. Your choices are still here.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <div className="page-shell-content">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-xs uppercase tracking-widest text-primary">
          Start with the essentials
        </p>
        <h1 className="font-display text-4xl">
          Your first outfit starts with a few pieces
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Choose pieces you already own. Match their type and color, then use a
          ready-made image to get started. You can replace it with your own
          photo and add the rest of your wardrobe later.
        </p>
        <fieldset className="mt-6 flex flex-wrap gap-2">
          <legend className="sr-only">Outfit foundation</legend>
          <Button
            type="button"
            variant={!dress ? "default" : "outline"}
            aria-pressed={!dress}
            onClick={() => {
              setDress(false);
              update(0, initial[0]);
            }}
          >
            Top, bottoms & shoes
          </Button>
          <Button
            type="button"
            variant={dress ? "default" : "outline"}
            aria-pressed={dress}
            onClick={() => {
              setDress(true);
              update(0, {
                category: "Dresses",
                type: "Casual Dress",
                color: "navy",
                selected: false,
              });
            }}
          >
            Dress & shoes
          </Button>
        </fieldset>
        <div
          className={`my-6 grid gap-4 ${dress ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
        >
          {choices.map((choice, index) => {
            if (dress && index === 1) return null;
            const definition = ONBOARDING_CATEGORIES.find(
              (category) => category.key === choice.category,
            )!;
            const image = `/images/wardrobe/generated/onboarding/${choice.category.toLowerCase()}-${choice.type.toLowerCase().replace(/\s+/g, "-")}-${choice.color}.png`;
            return (
              <section
                key={index}
                className={`rounded-xl border p-4 ${choice.selected ? "border-primary bg-[var(--accent-muted)]" : "border-border bg-[var(--bg-surface)]"}`}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={choice.selected}
                    onChange={(event) =>
                      update(index, { selected: event.target.checked })
                    }
                    disabled={saving}
                  />
                  I own this{" "}
                  {choice.category === "Tops"
                    ? "top"
                    : choice.category === "Bottoms"
                      ? "bottom"
                      : choice.category === "Shoes"
                        ? "pair of shoes"
                        : "dress"}
                </label>
                <Image
                  width={384}
                  height={256}
                  unoptimized
                  className="my-4 h-40 w-full object-contain"
                  src={image}
                  alt={`${choice.color} ${choice.type}, representative image`}
                />
                <label className="block text-xs">
                  Type
                  <select
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
                    value={choice.type}
                    onChange={(event) =>
                      update(index, { type: event.target.value })
                    }
                    disabled={saving}
                  >
                    {definition.subcategories.map((type) => (
                      <option key={type.name}>{type.name}</option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-xs">
                  Color
                  <select
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
                    value={choice.color}
                    onChange={(event) =>
                      update(index, { color: event.target.value })
                    }
                    disabled={saving}
                  >
                    {COLOR_OPTIONS.filter((color) => !!color.value).map(
                      (color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </section>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={!ready || saving || !userId}
            onClick={() => void save()}
          >
            {saving
              ? "Saving your pieces…"
              : "Add these pieces & see my outfit"}
          </Button>
          <button
            type="button"
            className="min-h-11 text-sm text-primary"
            disabled={saving}
            onClick={() => setFull(true)}
          >
            Set up more of my wardrobe ↗
          </button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Prefer your own photos?{" "}
          <Link href="/wardrobe/items" className="text-primary underline">
            Add your first piece individually.
          </Link>
        </p>
      </div>
    </div>
  );
}
