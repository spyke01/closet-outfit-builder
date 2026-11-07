"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/clothing-image";
import { MessageCircle, Paperclip, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/ui/app-dialog";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { LoadingStatus } from "@/components/loading-status";
import { SebastianAvatar } from "@/components/sebastian-avatar";
import { SEBASTIAN_OPEN_EVENT } from "@/lib/utils/sebastian-events";
import { SEBASTIAN_GREETING } from "@/lib/services/assistant/persona";
import { resizeImageFileForUpload } from "@/lib/utils/image-resize";
import type { AssistantChatRequest } from "@/lib/services/assistant/types";
import { cn } from "@/lib/utils";
import { clothingPieceDescription, type ClothingPieceIdentity } from "@/lib/utils/clothing-piece-label";

type ChatMessage = { id: string; role: "assistant" | "user"; text: string };
type ChatPayload = {
  threadId?: string;
  assistantMessage?: string;
  pending?: boolean;
  error?: string;
};
interface Props {
  className?: string;
  variant?: "inline" | "floating" | "sidebar" | "headless";
  floatingOffsetClassName?: string;
  requiresUpgrade?: boolean;
  userId?: string;
  membershipPending?: boolean;
  membershipError?: boolean;
  retryMembership?: () => void;
}

export function SebastianChatLauncher({
  className,
  variant = "inline",
  floatingOffsetClassName,
  requiresUpgrade = false,
  userId,
  membershipPending = false,
  membershipError = false,
  retryMembership,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [threadId, setThreadId] = useState<string>();
  const [hints, setHints] = useState<AssistantChatRequest["contextHints"]>();
  const [focusItem, setFocusItem] = useState<ClothingPieceIdentity>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: SEBASTIAN_GREETING },
  ]);
  const [retry, setRetry] = useState<AssistantChatRequest | null>(null);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTarget = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const storageKey = userId ? `sebastian-thread:${userId}` : null;

  const complete = () => {
    lock.current = false;
    setBusy(false);
  };
  const poll = (id: string, placeholderId: string, attempt = 0) => {
    if (attempt >= 70) {
      setError(
        "Your request is taking longer than expected. Reopen this conversation later to check the result.",
      );
      complete();
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/assistant/chat/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: id }),
        });
        const payload = (await response.json()) as ChatPayload;
        if (!mounted.current) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            setError(payload.error || "This conversation is unavailable.");
            complete();
            return;
          }
          poll(id, placeholderId, attempt + 1);
          return;
        }
        if (payload.pending) {
          poll(id, placeholderId, attempt + 1);
          return;
        }
        setMessages((prev) =>
          prev.map((message) =>
            message.id === placeholderId
              ? {
                  ...message,
                  text: payload.assistantMessage || "Your request is complete.",
                }
              : message,
          ),
        );
        complete();
      } catch {
        if (mounted.current) poll(id, placeholderId, attempt + 1);
      }
    }, 2200);
  };
  useEffect(() => {
    mounted.current = true;
    const listener = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          prompt?: string;
          contextHints?: AssistantChatRequest["contextHints"];
          focusItem?: ClothingPieceIdentity;
        }>
      ).detail;
      if (detail?.prompt) setInput(detail.prompt);
      // A general reopen keeps the conversation's focus. Explicit new context
      // replaces it so a different piece, trip, or date cannot inherit the old one.
      if (detail?.prompt || Object.keys(detail?.contextHints || {}).length) {
        setHints(detail?.contextHints);
        setFocusItem(detail?.focusItem?.id === detail?.contextHints?.focusItemId ? detail.focusItem : undefined);
      }
      setOpen(true);
    };
    window.addEventListener(SEBASTIAN_OPEN_EVENT, listener);
    return () => {
      mounted.current = false;
      window.removeEventListener(SEBASTIAN_OPEN_EVENT, listener);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!storageKey) return;
    const saved = sessionStorage.getItem(storageKey);
    if (!saved || !/^[a-f0-9-]{36}$/i.test(saved)) return;
    let canceled = false;
    void fetch(`/api/assistant/threads/${saved}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          sessionStorage.removeItem(storageKey);
          return;
        }
        const payload = (await response.json()) as {
          messages?: Array<{
            id: string;
            role: "user" | "assistant";
            content: string;
            pending?: boolean;
          }>;
        };
        if (canceled) return;
        setThreadId(saved);
        if (payload.messages?.length) {
          setMessages(
            payload.messages.map((message) => ({
              id: message.id,
              role: message.role,
              text: message.content,
            })),
          );
          const pending = payload.messages.findLast(
            (message) => message.pending,
          );
          if (pending) {
            lock.current = true;
            setBusy(true);
            poll(saved, pending.id);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      canceled = true;
    };
    // Thread hydration runs once for the signed-in account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  useEffect(() => {
    if (open) scrollTarget.current?.scrollIntoView({ block: "nearest" });
  }, [messages, open, busy]);

  const send = async (
    request: AssistantChatRequest,
    addUserMessage: boolean,
  ) => {
    if (lock.current || requiresUpgrade) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setRetry(null);
    if (addUserMessage)
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${request.requestId}`,
          role: "user",
          text: request.message,
        },
      ]);
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await response.json()) as ChatPayload;
      if (!response.ok)
        throw new Error(
          payload.error || "Unable to reach Sebastian. Please try again.",
        );
      if (!mounted.current) return;
      if (payload.threadId) {
        setThreadId(payload.threadId);
        if (storageKey) sessionStorage.setItem(storageKey, payload.threadId);
      }
      const id = `assistant-${request.requestId}`;
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== id),
        {
          id,
          role: "assistant",
          text: payload.assistantMessage || "I’m working on your request.",
        },
      ]);
      if (payload.pending && payload.threadId) {
        poll(payload.threadId, id);
        return;
      }
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof Error ? cause.message : "Unable to reach Sebastian.",
        );
        setRetry(request);
      }
    }
    if (mounted.current) complete();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if ((!input.trim() && !image) || uploading || lock.current) return;
    const request: AssistantChatRequest = {
      requestId: crypto.randomUUID(),
      threadId,
      message:
        input.trim() ||
        "Please review this outfit image and share practical improvements.",
      imageUrl: image?.url,
      contextHints: hints,
    };
    setInput("");
    setImage(null);
    void send(request, true);
  };
  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPEG, PNG, or WebP photo.");
      const prepared = await resizeImageFileForUpload(file, {
        maxDimension: 1600,
      });
      const form = new FormData();
      form.append("image", prepared);
      form.append("removeBackground", "false");
      form.append("requestId", crypto.randomUUID());
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok || !payload.imageUrl)
        throw new Error(payload.error || "Unable to upload this photo.");
      setImage({ url: payload.imageUrl, name: file.name });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to upload this photo.",
      );
    } finally {
      setUploading(false);
    }
  };
  return (
    <>
      {variant === "headless" ? null : variant === "sidebar" ? (
        <button
          className={cn(
            "flex min-h-12 w-full items-center gap-3 text-left",
            className,
          )}
          onClick={() => setOpen(true)}
          aria-label="Ask Sebastian"
          data-walkthrough-id="sebastian-button"
        >
          <SebastianAvatar className="h-9 w-9" />
          <span className="flex-1 text-sm font-medium">
            Sebastian
            <small className="mt-1 block text-[10px] text-muted-foreground">
              Your style assistant
            </small>
          </span>
          <Sparkles size={16} className="text-primary" />
        </button>
      ) : variant === "floating" ? (
        <button
          className={cn(
            "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg",
            floatingOffsetClassName,
            className,
          )}
          aria-label="Ask Sebastian"
          onClick={() => setOpen(true)}
        >
          <MessageCircle />
        </button>
      ) : (
        <Button
          className={className}
          variant="outline"
          onClick={() => setOpen(true)}
          aria-label="Ask Sebastian"
        >
          <SebastianAvatar className="h-6 w-6" />
          Ask Sebastian
        </Button>
      )}
      <AppDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Ask Sebastian"
        className="app-chat-dialog"
      >
        {membershipPending ? <LoadingStatus label="your membership" /> : membershipError ? <div className="space-y-4"><p role="alert">Your membership could not be checked. Try again to see the features included in your plan.</p><Button onClick={retryMembership}>Check membership again</Button></div> : requiresUpgrade ? (
          <UpgradePrompt feature={hints?.tripId ? "assistant-trip" : hints?.focusItemId ? "assistant-item" : hints?.eventDate ? "assistant-planner" : "assistant"} onClose={() => setOpen(false)} />
        ) : (
          <>
            {focusItem && hints?.focusItemId === focusItem.id && (
              <section aria-label="Selected clothing piece" className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-[var(--bg-surface)] p-3">
                {focusItem.imageUrl && <Image width={48} height={48} src={focusItem.imageUrl} alt="" unoptimized className="h-12 w-12 shrink-0 object-contain" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Building around</p>
                  <p className="mt-1 text-sm font-medium">{clothingPieceDescription(focusItem)}</p>
                </div>
                <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted" aria-label="Stop building around this piece" disabled={busy} onClick={() => {
                  setFocusItem(undefined);
                  setHints((previous) => previous ? { ...previous, focusItemId: undefined } : undefined);
                }}><X size={16} aria-hidden="true" /></button>
              </section>
            )}
            <div
              className="app-chat-messages"
              role="log"
              aria-label="Conversation"
              aria-live="polite"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`app-chat-message ${message.role === "user" ? "app-chat-user" : ""}`}
                >
                  <span className="sr-only">
                    {message.role === "user" ? "You: " : "Sebastian: "}
                  </span>
                  {message.text}
                </div>
              ))}
              {busy && (
                <p className="text-xs text-muted-foreground">
                  Sebastian is working on your request…
                </p>
              )}
              <div ref={scrollTarget} />
            </div>
            {error && (
              <div role="alert" className="my-3 text-sm text-destructive">
                {error}
                {retry && (
                  <button
                    type="button"
                    className="ml-2 underline"
                    disabled={busy}
                    onClick={() => void send(retry, false)}
                  >
                    Retry request
                  </button>
                )}
              </div>
            )}
            {image && (
              <div className="my-3 flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                <span className="truncate">{image.name}</span>
                <button
                  aria-label="Remove attached photo"
                  onClick={() => setImage(null)}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <form onSubmit={submit} className="mt-4 flex items-center gap-2">
              <Input
                aria-label="Message Sebastian"
                placeholder="Ask about your wardrobe or plans…"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={2000}
                disabled={busy}
              />
              <Button
                size="icon"
                aria-label="Send message"
                disabled={busy || uploading || (!input.trim() && !image)}
              >
                <Send size={17} />
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="flex min-h-9 items-center gap-2 text-xs text-muted-foreground"
                disabled={uploading || busy}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip size={15} />
                {uploading ? "Uploading photo…" : "Attach a photo"}
              </button>
              <Link href="/sebastian" className="text-xs text-primary">
                Meet Sebastian ↗
              </Link>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Suggestions stay in this conversation. You choose what to save or
              apply.
            </p>
          </>
        )}
      </AppDialog>
    </>
  );
}
