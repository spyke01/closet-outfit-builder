"use client";

import Image from "next/image";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Check, X } from "lucide-react";
import { useCategories } from "@/lib/hooks/use-categories";
import { useCreateWardrobeItem } from "@/lib/hooks/use-wardrobe-items";
import { useImageGenerationQuota } from "@/lib/hooks/use-wardrobe-item-image-generation";
import {
  ImageUpload,
  type ClothingPhotoMetadata,
} from "@/components/image-upload";
import {
  DefaultClothingImagePicker,
  type DefaultClothingChoice,
} from "@/components/default-clothing-image-picker";
import { Button } from "@/components/ui/button";
import { ClothingPhotoSuggestions } from "@/components/clothing-photo-suggestions";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  ensureCategoriesExist,
  getCategoryName,
} from "@/lib/services/onboarding-category-manager";
import { COLOR_OPTIONS, normalizeColor } from "@/lib/data/color-options";
import type { CreateWardrobeItemForm } from "@/lib/schemas";

const initial: CreateWardrobeItemForm = {
  category_id: "",
  name: "",
  brand: "",
  color: "",
  material: "",
  formality_score: 5,
  capsule_tags: [],
  season: ["All"],
  image_url: "",
  active: true,
  bg_removal_status: "completed",
  purchase_currency: "USD",
};
export function AddItemPageClient() {
  const router = useRouter();
  const { userId } = useAuth();
  const choiceLock = useRef(false);
  const automaticName = useRef("");
  const [form, setForm] = useState(initial),
    [defaultsOpen, setDefaultsOpen] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false),
    [uploadBusy, setUploadBusy] = useState(false),
    [savingAnother, setSavingAnother] = useState(false);
  const [photoMetadata, setPhotoMetadata] =
      useState<ClothingPhotoMetadata | null>(null),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState("");
  const [uploadKey, setUploadKey] = useState(0);
  const lock = useRef(false);
  const {
    data: categories = [],
    isLoading,
    refetch: refetchCategories,
  } = useCategories();
  const create = useCreateWardrobeItem();
  const quota = useImageGenerationQuota();
  const update = <K extends keyof CreateWardrobeItemForm>(
    key: K,
    value: CreateWardrobeItemForm[K],
  ) => setForm((previous) => ({ ...previous, [key]: value }));
  const useDefault = async (choice: DefaultClothingChoice) => {
    if (choiceLock.current || !userId) return;
    choiceLock.current = true;
    setError("");
    try {
      const specificAccessory =
        choice.category === "Accessories" &&
        ["Belt", "Watch"].includes(choice.name);
      let categoryId =
        (specificAccessory
          ? categories.find((item) => item.name === choice.name)?.id
          : undefined) ||
        categories.find(
          (item) => item.name === getCategoryName(choice.category),
        )?.id;
      if (!categoryId) {
        const mapping = await ensureCategoriesExist(userId, [choice.category]);
        categoryId =
          mapping.byName?.get(choice.name) || mapping.get(choice.category);
        await refetchCategories();
      }
      if (!categoryId)
        throw new Error(
          "Could not create this category. Try choosing an existing category.",
        );
      const previousAutomaticName = automaticName.current;
      const nextName = `${COLOR_OPTIONS.find((color) => color.value === choice.color)?.label || choice.color} ${choice.name}`;
      setForm((previous) => ({
        ...previous,
        category_id: categoryId,
        name:
          !previous.name || previous.name === previousAutomaticName
            ? nextName
            : previous.name,
        color: choice.color,
        formality_score: choice.formality,
        image_url: choice.imageUrl,
      }));
      automaticName.current = nextName;
      setPhotoMetadata(null);
      setAutoGenerate(false);
      setDefaultsOpen(false);
      setUploadKey((value) => value + 1);
      setFeedback("Default image selected. Confirm the details below.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not choose this default image.",
      );
    } finally {
      choiceLock.current = false;
    }
  };
  const save = async (addAnother = false) => {
    if (lock.current || uploadBusy || !form.name.trim() || !form.category_id)
      return;
    lock.current = true;
    setError("");
    setFeedback("");
    setSavingAnother(addAnother);
    try {
      const generating =
        autoGenerate &&
        !form.image_url &&
        quota.canGenerate &&
        !quota.isFreeTier;
      const item = await create.mutateAsync({
        ...form,
        ...photoMetadata,
        formality_score: form.formality_score ?? undefined,
        season: form.season ?? undefined,
        capsule_tags: form.capsule_tags ?? undefined,
        name: form.name.trim(),
        color: normalizeColor(form.color) || undefined,
        brand: form.brand?.trim() || undefined,
        material: form.material?.trim() || undefined,
        image_url: form.image_url || undefined,
        bg_removal_status:
          photoMetadata?.bg_removal_status ||
          (generating ? "pending" : "completed"),
      });
      if (generating) {
        sessionStorage.setItem(
          `wardrobe-generate:${item.id}`,
          crypto.randomUUID(),
        );
        router.push(`/wardrobe?autogen=${item.id}`);
        return;
      }
      if (addAnother) {
        setForm({ ...initial, category_id: form.category_id });
        setPhotoMetadata(null);
        setAutoGenerate(false);
        setUploadKey((value) => value + 1);
        setFeedback("Added to your wardrobe. Ready for the next piece.");
      } else {
        router.push(`/wardrobe/items/${item.id}`);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not add this piece. Your details are still here.",
      );
    } finally {
      lock.current = false;
      setSavingAnother(false);
    }
  };
  const fieldClass =
    "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";
  return (
    <div className="page-shell-content">
      <Link href="/wardrobe" className="text-sm text-muted-foreground">
        ← Back to wardrobe
      </Link>
      <header className="mb-7 mt-5">
        <h1 className="font-display text-4xl">Add clothing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A photo and a few details. You can add the rest later.
        </p>
      </header>
      {feedback && (
        <p role="status" className="mb-4 text-sm text-primary">
          <Check className="mr-1 inline h-4 w-4" />
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="grid items-start gap-7 xl:grid-cols-2">
          <section className="rounded-xl border border-border bg-[var(--bg-surface)] p-5">
            <h2 className="mb-2 font-display text-2xl">
              How would you like to add a photo?
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Take one now, choose one you already have, or use a default AI
              image.
            </p>
            {form.image_url && (
              <div className="relative mb-5">
                <Image
                  width={384}
                  height={256}
                  unoptimized
                  src={form.image_url}
                  alt={form.name || "Clothing photo preview"}
                  className="h-64 w-full object-contain"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 rounded-full border border-border bg-background p-2"
                  aria-label="Remove clothing image"
                  onClick={() => {
                    update("image_url", "");
                    setPhotoMetadata(null);
                    setUploadKey((value) => value + 1);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <ImageUpload
              key={uploadKey}
              onUpload={(url) => {
                update("image_url", url);
                setAutoGenerate(false);
                if (!url) setPhotoMetadata(null);
              }}
              onMetadata={setPhotoMetadata}
              onBusyChange={setUploadBusy}
              disabled={create.isPending}
            />
            {photoMetadata?.original_image_url && (
              <ClothingPhotoSuggestions
                key={photoMetadata.original_image_url}
                imageUrl={photoMetadata.original_image_url}
                categories={categories}
                onApply={(details) => {
                  setForm((previous) => ({
                    ...previous,
                    name: details.name,
                    category_id: details.category_id || previous.category_id,
                    color: details.color || previous.color,
                  }));
                  setFeedback(
                    "Suggested details applied. You can change them before saving.",
                  );
                }}
              />
            )}
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={uploadBusy}
              onClick={() => setDefaultsOpen((value) => !value)}
              aria-expanded={defaultsOpen}
            >
              <Sparkles size={17} />
              Use a default AI image
            </Button>
            {defaultsOpen && (
              <div className="mt-3">
                <DefaultClothingImagePicker onChoose={useDefault} />
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              You can also save without a photo. A default image is
              representative; your own photo keeps the details of your actual
              piece.
            </p>
          </section>
          <section className="space-y-5">
            <div>
              <h2 className="font-display text-2xl">Confirm the details</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Start with what you know. Other details can wait.
              </p>
            </div>
            <label className="block text-sm">
              Item name
              <input
                className={fieldClass}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="For example, blue Oxford shirt"
                required
                maxLength={100}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm">
                Category
                <select
                  className={fieldClass}
                  value={form.category_id}
                  onChange={(event) =>
                    update("category_id", event.target.value)
                  }
                  required
                  disabled={isLoading}
                >
                  <option value="">
                    {isLoading ? "Loading…" : "Choose a category"}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              {!defaultsOpen && (
                <label className="text-sm">
                  Color
                  <select
                    className={fieldClass}
                    value={form.color || ""}
                    onChange={(event) => update("color", event.target.value)}
                  >
                    {COLOR_OPTIONS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <details className="rounded-lg border border-border p-4">
              <summary className="cursor-pointer text-sm">
                More details · optional
              </summary>
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  Brand
                  <input
                    className={fieldClass}
                    value={form.brand || ""}
                    maxLength={50}
                    onChange={(event) => update("brand", event.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Material
                  <input
                    className={fieldClass}
                    value={form.material || ""}
                    maxLength={50}
                    onChange={(event) => update("material", event.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Formality · {form.formality_score}/10
                  <input
                    type="range"
                    className="mt-3 block w-full accent-primary"
                    min={1}
                    max={10}
                    value={form.formality_score || 5}
                    onChange={(event) =>
                      update("formality_score", Number(event.target.value))
                    }
                  />
                  <span className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Very casual</span>
                    <span>Formal</span>
                  </span>
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm">Seasons</legend>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ["All", "Spring", "Summer", "Fall", "Winter"] as const
                    ).map((season) => (
                      <Button
                        type="button"
                        key={season}
                        size="sm"
                        variant={
                          form.season?.includes(season) ? "default" : "outline"
                        }
                        aria-pressed={!!form.season?.includes(season)}
                        onClick={() => {
                          const next =
                            season === "All"
                              ? ["All"]
                              : form.season?.includes(season)
                                ? form.season.filter(
                                    (value) => value !== season,
                                  )
                                : [
                                    ...(form.season || []).filter(
                                      (value) => value !== "All",
                                    ),
                                    season,
                                  ];
                          update(
                            "season",
                            (next.length
                              ? next
                              : ["All"]) as CreateWardrobeItemForm["season"],
                          );
                        }}
                      >
                        {season}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm">Style tags</legend>
                  <div className="flex flex-wrap gap-2">
                    {["Refined", "Adventurer", "Crossover", "Shorts"].map(
                      (tag) => (
                        <Button
                          type="button"
                          key={tag}
                          size="sm"
                          variant={
                            form.capsule_tags?.includes(tag)
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            update(
                              "capsule_tags",
                              form.capsule_tags?.includes(tag)
                                ? form.capsule_tags.filter(
                                    (value) => value !== tag,
                                  )
                                : [...(form.capsule_tags || []), tag],
                            )
                          }
                        >
                          {tag}
                        </Button>
                      ),
                    )}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">
                    Purchase price
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={fieldClass}
                      value={form.purchase_price ?? ""}
                      onChange={(event) =>
                        update(
                          "purchase_price",
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Currency
                    <select
                      className={fieldClass}
                      value={form.purchase_currency}
                      onChange={(event) =>
                        update("purchase_currency", event.target.value)
                      }
                    >
                      {[
                        "USD",
                        "CAD",
                        "GBP",
                        "EUR",
                        "AUD",
                        "NZD",
                        "JPY",
                        "CHF",
                      ].map((currency) => (
                        <option key={currency}>{currency}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  An optional price lets analytics calculate cost per wear.
                </p>
              </div>
            </details>
            {!form.image_url && (
              <details className="rounded-lg border border-border p-4">
                <summary className="cursor-pointer text-sm">
                  Create a custom AI image · Plus / Pro
                </summary>
                <p className="my-3 text-xs text-muted-foreground">
                  Generate a representative image using this item’s category,
                  color, and details. This uses one image generation from your
                  allowance.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={autoGenerate}
                    onChange={(event) => setAutoGenerate(event.target.checked)}
                    disabled={
                      quota.isFreeTier ||
                      !quota.canGenerate ||
                      !form.color ||
                      !form.category_id
                    }
                  />
                  Generate after saving
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  {quota.isFreeTier
                    ? "Available on Plus and Pro."
                    : `${quota.limits.monthly_remaining} generations remaining this month.`}
                </p>
              </details>
            )}
          </section>
        </div>
        <div className="app-form-actions">
          <Link
            href="/wardrobe"
            className="mr-auto text-sm text-muted-foreground"
          >
            Cancel
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={
              create.isPending ||
              uploadBusy ||
              !form.name.trim() ||
              !form.category_id
            }
            onClick={() => void save(true)}
          >
            {savingAnother ? "Saving…" : "Save & add another"}
          </Button>
          <Button
            type="submit"
            disabled={
              create.isPending ||
              uploadBusy ||
              !form.name.trim() ||
              !form.category_id
            }
          >
            {create.isPending && !savingAnother ? "Adding…" : "Add to wardrobe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
