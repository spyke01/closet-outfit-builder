import { z } from 'zod';

export const AssistantChatRequestSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  contextHints: z.object({
    focusItemId: z.string().uuid().optional(),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tripId: z.string().uuid().optional(),
    weather: z.object({
      source: z.string().max(30).optional(),
      condition: z.string().max(80).optional(),
      temperatureF: z.number().finite().optional(),
      highTempF: z.number().finite().optional(),
      lowTempF: z.number().finite().optional(),
      precipChance: z.number().min(0).max(100).optional(),
      windSpeedMph: z.number().min(0).max(300).optional(),
      humidityPct: z.number().min(0).max(100).optional(),
    }).optional(),
  }).optional(),
});

export type AssistantChatRequest = z.infer<typeof AssistantChatRequestSchema>;

export interface AssistantCitation {
  type: 'wardrobe_item' | 'outfit' | 'calendar_entry' | 'trip';
  id: string;
}

export interface AssistantChatResponse {
  threadId: string;
  assistantMessage: string;
}

export type AssistantErrorCode =
  | 'AUTH_REQUIRED'
  | 'PLAN_REQUIRED'
  | 'SAFETY_BLOCKED'
  | 'THREAD_NOT_FOUND'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'BURST_LIMIT_EXCEEDED'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_INVALID_REQUEST'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'CONFIG_ERROR';

export interface AssistantContextPack {
  userId: string;
  wardrobe: Array<{
    id: string;
    name: string;
    category: string;
    color?: string | null;
    season?: string[] | null;
    formalityScore?: number | null;
  }>;
  recentOutfits: Array<{
    id: string;
    itemIds: string[];
    loved: boolean;
    createdAt: string;
  }>;
  calendarWindow: Array<{
    id: string;
    date: string;
    status: 'planned' | 'worn';
    notes?: string | null;
    outfitId?: string | null;
    weatherContext?: {
      source?: string | null;
      condition?: string | null;
      temperatureF?: number | null;
      highTempF?: number | null;
      lowTempF?: number | null;
      precipChance?: number | null;
      windSpeedMph?: number | null;
      humidityPct?: number | null;
    } | null;
  }>;
  trips: Array<{
    id: string;
    name: string;
    destinationText: string;
    startDate: string;
    endDate: string;
  }>;
  currentWeather?: {
    source?: string | null;
    condition?: string | null;
    temperatureF?: number | null;
    highTempF?: number | null;
    lowTempF?: number | null;
    precipChance?: number | null;
    windSpeedMph?: number | null;
    humidityPct?: number | null;
  } | null;
  hints?: {
    focusItemId?: string;
    eventDate?: string;
    tripId?: string;
    weather?: {
      source?: string;
      condition?: string;
      temperatureF?: number;
      highTempF?: number;
      lowTempF?: number;
      precipChance?: number;
      windSpeedMph?: number;
      humidityPct?: number;
    };
  };
}

export interface AssistantModerationResult {
  blocked: boolean;
  flags: string[];
  reason?: string;
  safeReply?: string;
}

export interface AssistantProviderInput {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageUrl?: string;
  context: AssistantContextPack;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export interface AssistantProviderOutput {
  model: string;
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
}
