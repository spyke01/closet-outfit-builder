"use client";

import Image from "next/image";

import { useEffect, useState } from "react";
import {
  ONBOARDING_CATEGORIES,
  type CategoryKey,
} from "@/lib/data/onboarding-categories";
import { COLOR_OPTIONS } from "@/lib/data/color-options";
import { Button } from "@/components/ui/button";

export type DefaultClothingChoice = {
  category: CategoryKey;
  name: string;
  color: string;
  formality: number;
  imageUrl: string;
};
export function DefaultClothingImagePicker({
  onChoose,
}: {
  onChoose: (choice: DefaultClothingChoice) => void;
}) {
  const [files, setFiles] = useState<Set<string>>(new Set());
  const [type, setType] = useState("Tops:T-Shirt"),
    [color, setColor] = useState("navy"),
    [error, setError] = useState("");
  useEffect(() => {
    let canceled = false;
    void fetch("/clothing-image-options.json")
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: string[]) => {
        if (!canceled) setFiles(new Set(data));
      })
      .catch(() => {
        if (!canceled)
          setError(
            "Default images could not be loaded. Try again or add a photo later.",
          );
      });
    return () => {
      canceled = true;
    };
  }, []);
  const [categoryKey, name] = type.split(":");
  const category = ONBOARDING_CATEGORIES.find(
    (item) => item.key === categoryKey,
  )!;
  const subcategory = category.subcategories.find(
    (item) => item.name === name,
  )!;
  const filename = (value: string) =>
    `${categoryKey.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, "-")}-${value}.png`;
  const colors = COLOR_OPTIONS.filter((option) =>
    files.has(filename(option.value)),
  );
  const selectedColor = colors.some((option) => option.value === color)
    ? color
    : colors[0]?.value;
  const imageUrl = selectedColor
    ? `/images/wardrobe/generated/onboarding/${filename(selectedColor)}`
    : "";
  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div>
        <h3 className="font-medium">Use a default AI image</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Choose a ready-made illustration that resembles your piece. It won’t
          capture your exact fit or details. This uses no AI generation
          allowance.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">
          Type
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {ONBOARDING_CATEGORIES.map((group) => (
              <optgroup label={group.name} key={group.key}>
                {group.subcategories.map((item) => (
                  <option key={item.name} value={`${group.key}:${item.name}`}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Color
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
            value={selectedColor || ""}
            onChange={(event) => setColor(event.target.value)}
          >
            {colors.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {imageUrl ? (
        <Image
          width={384}
          height={256}
          unoptimized
          className="mx-auto h-40 w-40 object-contain"
          src={imageUrl}
          alt={`${selectedColor} ${name}, representative default image`}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {files.size
            ? "No default image is available for this type."
            : "Loading default images…"}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={!imageUrl}
        onClick={() =>
          onChoose({
            category: category.key,
            name,
            color: selectedColor!,
            formality: subcategory.formalityScore,
            imageUrl,
          })
        }
      >
        Use this default image
      </Button>
    </div>
  );
}
