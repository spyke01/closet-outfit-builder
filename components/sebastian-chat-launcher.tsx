'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, MessageCircle, Paperclip, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SebastianAvatar } from '@/components/sebastian-avatar';
import { cn } from '@/lib/utils';
import {
  SEBASTIAN_GREETING,
} from '@/lib/services/assistant/persona';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

interface ChatApiPayload {
  threadId: string | null;
  assistantMessage: string;
  pending?: boolean;
}

interface SebastianChatLauncherProps {
  className?: string;
  variant?: 'inline' | 'floating';
  floatingOffsetClassName?: string;
  requiresUpgrade?: boolean;
}

interface WeatherHintPayload {
  source?: string;
  condition?: string;
  temperatureF?: number;
  highTempF?: number;
  lowTempF?: number;
  precipChance?: number;
  windSpeedMph?: number;
  humidityPct?: number;
}

async function getCurrentPositionWithTimeout(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      reject(new Error('Geolocation timeout'));
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve(position);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      {
        timeout: timeoutMs,
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
      }
    );
  });
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

async function getLiveWeatherHint(): Promise<WeatherHintPayload | null> {
  try {
    const position = await getCurrentPositionWithTimeout(4000);
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`/.netlify/functions/weather?lat=${lat}&lon=${lon}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as {
      current?: {
        condition?: string;
        temperature?: number;
        windSpeed?: number;
        humidity?: number;
      };
      forecast?: Array<{
        temperature?: { high?: number; low?: number };
        precipitationProbability?: number;
      }>;
    };

    const firstForecast = payload.forecast?.[0];

    return {
      source: 'live-weather',
      condition: payload.current?.condition,
      temperatureF: toFiniteNumber(payload.current?.temperature),
      highTempF: toFiniteNumber(firstForecast?.temperature?.high),
      lowTempF: toFiniteNumber(firstForecast?.temperature?.low),
      precipChance: toFiniteNumber(firstForecast?.precipitationProbability),
      windSpeedMph: toFiniteNumber(payload.current?.windSpeed),
      humidityPct: toFiniteNumber(payload.current?.humidity),
    };
  } catch {
    return null;
  }
}

export function SebastianChatLauncher({
  className,
  variant = 'inline',
  floatingOffsetClassName,
  requiresUpgrade = false,
}: SebastianChatLauncherProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: SEBASTIAN_GREETING },
  ]);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const pollPendingResponse = (currentThreadId: string, placeholderMessageId: string, attempts = 0) => {
    if (attempts >= 45) {
      setMessages((prev) => prev.map((message) => (
        message.id === placeholderMessageId
          ? { ...message, text: 'This image review is taking longer than expected. Please try again shortly.' }
          : message
      )));
      return;
    }

    pollTimerRef.current = setTimeout(() => {
      fetch('/api/assistant/chat/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: currentThreadId }),
      })
        .then(async (response) => {
          const payload = await response.json() as ChatApiPayload;
          if (!response.ok) {
            throw new Error(payload?.assistantMessage || payload?.threadId || 'Unable to fetch assistant status.');
          }

          if (payload.pending) {
            pollPendingResponse(currentThreadId, placeholderMessageId, attempts + 1);
            return;
          }

          setMessages((prev) => prev.map((message) => (
            message.id === placeholderMessageId
              ? { ...message, text: payload.assistantMessage || 'Review complete.' }
              : message
          )));
        })
        .catch(() => {
          pollPendingResponse(currentThreadId, placeholderMessageId, attempts + 1);
        });
    }, 2200);
  };

  const uploadAssistantImage = async (file: File) => {
    setUploadError(null);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('removeBackground', 'false');
      formData.append('quality', '0.9');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to upload image.');
      }

      const imageUrl = (payload?.imageUrl as string | undefined) || (payload?.fallbackUrl as string | undefined);
      if (!imageUrl) {
        throw new Error('Upload completed but no image URL was returned.');
      }

      setAttachedImageUrl(imageUrl);
      setAttachedImageName(file.name || 'Uploaded image');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload image.';
      setUploadError(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFilePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadAssistantImage(file);
    event.target.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requiresUpgrade) return;
    const trimmed = input.trim();
    if ((!trimmed && !attachedImageUrl) || isResponding || isUploadingImage) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed || 'Please review this outfit image.',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsResponding(true);
    const imageUrlForRequest = attachedImageUrl;
    setAttachedImageUrl(null);
    setAttachedImageName(null);
    const weatherHint = await getLiveWeatherHint();

    fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: threadId || undefined,
        message: trimmed || 'Please review this outfit image and share practical improvements.',
        imageUrl: imageUrlForRequest || undefined,
        contextHints: weatherHint ? { weather: weatherHint } : undefined,
      }),
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          const code = payload?.code as string | undefined;
          if (code === 'PLAN_REQUIRED') {
            return {
              threadId: threadId,
              assistantMessage: 'Sebastian is available on Plus and Pro. Upgrade to unlock personalized guidance.',
            };
          }
          if (code === 'UPSTREAM_RATE_LIMIT' || code === 'UPSTREAM_UNAVAILABLE') {
            return {
              threadId: threadId,
              assistantMessage: 'I am seeing high demand right now. Please try again in a minute.',
            };
          }
          if (code === 'UPSTREAM_TIMEOUT') {
            return {
              threadId: threadId,
              assistantMessage: 'That request is taking longer than expected. Please try again with a shorter prompt or without an image.',
            };
          }
          if (code === 'UPSTREAM_INVALID_REQUEST') {
            return {
              threadId: threadId,
              assistantMessage: 'I could not process that request format right now. Please try again in a moment.',
            };
          }
          throw new Error(payload?.error || 'Unable to reach Sebastian right now.');
        }

        return payload as ChatApiPayload;
      })
      .then((payload) => {
        if (payload.threadId) {
          setThreadId(payload.threadId);
        }
        const assistantId = `assistant-${Date.now()}`;
        const assistantMessage: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          text: payload.assistantMessage,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (payload.pending && payload.threadId) {
          pollPendingResponse(payload.threadId, assistantId);
        }
      })
      .catch((error: unknown) => {
        const fallback = error instanceof Error ? error.message : 'Unable to reach Sebastian right now.';
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: fallback,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      })
      .finally(() => {
        setIsResponding(false);
      });
  };

  return (
    <>
      {variant === 'floating' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask Sebastian"
          className={cn(
            "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 inline-flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full border border-border bg-foreground text-background shadow-lg transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-border dark:bg-[#111A20] dark:text-white",
            floatingOffsetClassName,
            className,
          )}
        >
          <MessageCircle className="h-7 w-7" />
          <Sparkles className="pointer-events-none absolute right-5 top-4 h-3 w-3" aria-hidden="true" />
        </button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className={className}
          onClick={() => setOpen(true)}
          aria-label="Ask Sebastian"
        >
          <SebastianAvatar className="mr-2 h-6 w-6 border-primary/40" />
          <span className="hidden sm:inline">Ask Sebastian</span>
          <span className="sm:hidden">Ask</span>
        </Button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:bg-black/20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Sebastian chat"
            className="fixed bottom-4 right-4 z-50 flex h-[540px] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <SebastianAvatar className="h-9 w-9 border-primary/50" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Sebastian</h2>
                  <p className="text-xs text-muted-foreground">Personal Style Assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                      message.role === 'assistant'
                        ? 'bg-muted text-foreground whitespace-pre-line'
                        : 'ml-auto bg-primary text-primary-foreground whitespace-pre-line'
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
                {isResponding && (
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Sebastian is thinking...
                  </div>
                )}
              </div>

              <div className="border-t border-border px-4 py-3">
                {attachedImageUrl && (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[220px]">{attachedImageName || 'Image attached'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedImageUrl(null);
                        setAttachedImageName(null);
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                      disabled={isResponding || isUploadingImage || requiresUpgrade}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {uploadError && (
                  <p className="mb-2 text-xs text-destructive">{uploadError}</p>
                )}

                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about styling, outfits, or trips..."
                    aria-label="Message Sebastian"
                    maxLength={2000}
                    disabled={requiresUpgrade}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={requiresUpgrade || (!input.trim() && !attachedImageUrl) || isResponding || isUploadingImage}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFilePick}
                      disabled={requiresUpgrade || isResponding || isUploadingImage}
                    />
                    <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach
                    </span>
                  </label>
                  {isUploadingImage && (
                    <span className="text-[11px] text-muted-foreground">Uploading...</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Ask styling, wardrobe, trip, or outfit-photo questions.
                  </p>
                  <Link
                    href="/sebastian"
                    className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Who is Sebastian?
                  </Link>
                </div>
              </div>

              {requiresUpgrade && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/85 px-6 text-center backdrop-blur-[1px]">
                  <div className="max-w-[280px] rounded-xl border border-border bg-card p-4 shadow-lg">
                    <h3 className="text-sm font-semibold text-foreground">Unlock Sebastian</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Free plans do not include Sebastian. Upgrade to Plus or Pro for full AI stylist access.
                    </p>
                    <Button asChild className="mt-3 w-full" size="sm">
                      <Link href="/settings/billing">View Plus/Pro plans</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="sr-only" aria-live="polite">
              {requiresUpgrade ? 'Sebastian is locked for free plans.' : ''}
            </div>
          </section>
        </>
      )}
    </>
  );
}
