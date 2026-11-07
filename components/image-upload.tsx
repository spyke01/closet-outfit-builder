"use client";

import Image from "@/components/clothing-image";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  resizeImageFileForUpload,
  transformImageFileForAvatar,
} from "@/lib/utils/image-resize";
import type { ImageProcessingResponse } from "@/lib/schemas";

export type ClothingPhotoMetadata = {
  original_image_url: string;
  prepared_image_url: string | null;
  image_processing_job_id: string | null;
  bg_removal_status: "processing" | "completed" | "failed";
};
export interface ImageUploadProps {
  onUpload: (imageUrl: string) => void;
  onError?: (error: string) => void;
  onMetadata?: (metadata: ClothingPhotoMetadata) => void;
  onBusyChange?: (busy: boolean) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  removeBackground?: boolean;
  quality?: number;
  mode?: "default" | "avatar";
  recommendedAspect?: "square";
  className?: string;
  disabled?: boolean;
}
export function ImageUpload({
  onUpload,
  onError,
  onMetadata,
  onBusyChange,
  maxSize = 5 * 1024 * 1024,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  removeBackground = true,
  quality = 0.9,
  mode = "default",
  className = "",
  disabled = false,
}: ImageUploadProps) {
  const camera = useRef<HTMLInputElement>(null),
    library = useRef<HTMLInputElement>(null);
  const lock = useRef(false),
    canceled = useRef(false),
    generation = useRef(0);
  const callback = useRef({ onUpload, onMetadata, onBusyChange, onError });
  callback.current = { onUpload, onMetadata, onBusyChange, onError };
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [photo, setPhoto] = useState<ClothingPhotoMetadata | null>(null);
  const [selected, setSelected] = useState<"original" | "prepared">("original");
  useEffect(() => {
    canceled.current = false;
    return () => {
      canceled.current = true;
    };
  }, []);
  const upload = async (file: File) => {
    if (lock.current || disabled) return;
    canceled.current = false;
    const currentGeneration = ++generation.current;
    const isCanceled = () =>
      canceled.current || generation.current !== currentGeneration;
    lock.current = true;
    setBusy(true);
    setError("");
    setStage("Preparing your photo…");
    callback.current.onBusyChange?.(true);
    try {
      if (!acceptedTypes.includes(file.type))
        throw new Error(
          "Choose a JPEG, PNG, or WebP photo. Convert HEIC photos to JPEG first.",
        );
      if (file.size > 25 * 1024 * 1024)
        throw new Error("Choose a photo smaller than 25 MB.");
      const prepared =
        mode === "avatar"
          ? await transformImageFileForAvatar(file, { size: 400, quality })
          : await resizeImageFileForUpload(file, {
              maxDimension: 1600,
              quality,
            });
      if (prepared.size > maxSize)
        throw new Error(
          "This photo is still larger than 5 MB. Try a smaller image.",
        );
      setStage("Uploading your photo…");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        await prepared.arrayBuffer(),
      );
      const fingerprint = Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      const intentKey = `clothing-upload:${mode}:${removeBackground}:${fingerprint}`;
      const requestId =
        sessionStorage.getItem(intentKey) || crypto.randomUUID();
      sessionStorage.setItem(intentKey, requestId);
      const form = new FormData();
      form.append("image", prepared);
      form.append(
        "removeBackground",
        String(mode !== "avatar" && removeBackground),
      );
      form.append("uploadType", mode === "avatar" ? "avatar" : "wardrobe");
      form.append("quality", String(quality));
      form.append("requestId", requestId);
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as ImageProcessingResponse;
      if (!response.ok || !(result.imageUrl || result.fallbackUrl))
        throw new Error(
          result.error || "Your photo could not be uploaded. Please try again.",
        );
      if (isCanceled()) return;
      const original =
        result.originalImageUrl || result.imageUrl || result.fallbackUrl!;
      let metadata: ClothingPhotoMetadata = {
        original_image_url: original,
        prepared_image_url: result.preparedImageUrl || null,
        image_processing_job_id: result.jobId || null,
        bg_removal_status:
          result.bgRemovalStatus === "processing"
            ? "processing"
            : result.bgRemovalStatus === "failed"
              ? "failed"
              : "completed",
      };
      setPhoto(metadata);
      setSelected("original");
      callback.current.onUpload(original);
      callback.current.onMetadata?.(metadata);
      setBusy(false);
      lock.current = false;
      callback.current.onBusyChange?.(false);
      if (metadata.bg_removal_status !== "processing" || !result.jobId) {
        setStage(
          metadata.bg_removal_status === "failed"
            ? "Photo uploaded. Background cleanup is unavailable; you can use your original."
            : "Photo uploaded.",
        );
        return;
      }
      setStage(
        "Photo uploaded. Removing the background… You can save with the original now.",
      );
      for (let attempt = 0; attempt < 180 && !isCanceled(); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const statusResponse = await fetch(`/api/ai/jobs/${result.jobId}`, {
          cache: "no-store",
        });
        if (!statusResponse.ok) continue;
        const status = await statusResponse.json();
        if (isCanceled()) return;
        if (status.status === "succeeded" || status.status === "failed") {
          metadata = {
            ...metadata,
            prepared_image_url: status.result?.preparedImageUrl || null,
            bg_removal_status:
              status.status === "failed" ? "failed" : "completed",
          };
          setPhoto(metadata);
          callback.current.onMetadata?.(metadata);
          setStage(
            metadata.prepared_image_url
              ? "Cleanup is ready. Compare both photos and choose which to use."
              : "Cleanup could not finish. Your original photo is ready to use.",
          );
          return;
        }
      }
      if (!isCanceled())
        setStage(
          "Your original is ready. You can review the cleaned photo from the item when preparation finishes.",
        );
    } catch (cause) {
      if (!isCanceled()) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Could not upload your photo.";
        setError(message);
        callback.current.onError?.(message);
        setStage("");
      }
    } finally {
      if (!isCanceled()) {
        lock.current = false;
        setBusy(false);
        callback.current.onBusyChange?.(false);
      }
    }
  };
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void upload(file);
    event.target.value = "";
  };
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy || disabled}
          onClick={() => camera.current?.click()}
        >
          <Camera size={18} />
          Take a photo
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || disabled}
          onClick={() => library.current?.click()}
        >
          <ImagePlus size={18} />
          Choose a photo
        </Button>
      </div>
      <input
        ref={camera}
        type="file"
        accept={acceptedTypes.join(",")}
        capture="environment"
        onChange={pick}
        className="sr-only"
        tabIndex={-1}
        aria-label="Take a photo of your clothing"
      />
      <input
        ref={library}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={pick}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a clothing photo"
      />
      {!photo && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Lay the piece flat or hang it up. Keep the whole piece in frame. A
          plain background helps, but you don’t need a studio photo. Use one
          piece per photo; crop out other clothing or people before uploading.
        </p>
      )}
      {stage && (
        <p
          role="status"
          className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
        >
          {busy || photo?.bg_removal_status === "processing" ? (
            <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin" />
          ) : (
            <Check size={15} className="mt-0.5 shrink-0 text-primary" />
          )}
          {stage}
        </p>
      )}
      {photo?.prepared_image_url && mode !== "avatar" && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Choose the photo to use
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(["original", "prepared"] as const).map((choice) => (
              <label
                key={choice}
                className={`cursor-pointer rounded-lg border p-2 ${selected === choice ? "border-primary bg-[var(--accent-muted)]" : "border-border"}`}
              >
                <Image
                  width={384}
                  height={256}
                  unoptimized
                  src={
                    choice === "original"
                      ? photo.original_image_url
                      : photo.prepared_image_url!
                  }
                  alt={
                    choice === "original"
                      ? "Your original clothing photo"
                      : "Clothing after background cleanup"
                  }
                  className="h-32 w-full object-contain"
                />
                <span className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="photo-version"
                    aria-label={
                      choice === "original"
                        ? "Use original"
                        : "Use cleaned photo"
                    }
                    checked={selected === choice}
                    onChange={() => {
                      setSelected(choice);
                      callback.current.onUpload(
                        choice === "original"
                          ? photo.original_image_url
                          : photo.prepared_image_url!,
                      );
                    }}
                  />
                  {choice === "original" ? "Use original" : "Use cleaned photo"}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Check that the color, pattern, and shape still match your piece.
            Your original stays available.
          </p>
        </fieldset>
      )}
      {photo && (
        <button
          type="button"
          disabled={busy}
          className="flex items-center gap-1 text-xs text-muted-foreground underline"
          onClick={() => {
            generation.current++;
            setPhoto(null);
            setStage("");
            callback.current.onUpload("");
          }}
        >
          <X size={13} />
          Remove photo
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
