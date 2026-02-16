import type { AssistantModerationResult } from './types';
import { SEBASTIAN_REFUSAL_TEMPLATES } from './persona';

const BLOCKED_PROMPT_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /\b(suicide|self-harm|kill myself)\b/i, flag: 'self_harm' },
  { pattern: /\b(diagnose|prescription|medical advice)\b/i, flag: 'medical' },
  { pattern: /\b(legal advice|lawsuit|tax evasion)\b/i, flag: 'legal' },
  { pattern: /\b(ugly|rate attractiveness|hot or not|body shame)\b/i, flag: 'body_shaming' },
  { pattern: /\b(ignore previous|reveal system prompt|override safety)\b/i, flag: 'prompt_injection' },
  { pattern: /\b(hate|racial slur|ethnic cleansing)\b/i, flag: 'hate' },
  { pattern: /<\s*script\b/i, flag: 'script_tag' },
  { pattern: /<\s*\/\s*script\s*>/i, flag: 'script_tag' },
  { pattern: /on\w+\s*=/i, flag: 'inline_event_handler' },
  { pattern: /javascript\s*:/i, flag: 'javascript_uri' },
  { pattern: /<!--#\s*(include|exec|echo|config|fsize|flastmod)\b/i, flag: 'ssi_directive' },
  { pattern: /\$\{[^}]+\}/, flag: 'template_injection' },
  { pattern: /<\|im_start\|>|<\|im_end\|>|<\|system\|>/i, flag: 'prompt_escape_token' },
  { pattern: /(^|\s)(system|assistant|developer)\s*:/i, flag: 'role_injection' },
];

const BLOCKED_IMAGE_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /\b(nude|nudity|porn|sexual)\b/i, flag: 'sexual_content' },
  { pattern: /\b(gore|graphic violence)\b/i, flag: 'graphic_violence' },
];

const DISALLOWED_OUTPUT_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /\b(you are ugly|your body is)\b/i, flag: 'body_shaming_output' },
];

function stripControlCharacters(input: string): string {
  let result = '';
  for (const character of input) {
    const code = character.charCodeAt(0);
    const isControl =
      (code >= 0x00 && code <= 0x08) ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f;

    result += isControl ? ' ' : character;
  }
  return result;
}

export function sanitizeUserTextForPrompt(input: string): string {
  return stripControlCharacters(input)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

export function moderateInput(prompt: string, imageUrl?: string): AssistantModerationResult {
  const normalizedPrompt = sanitizeUserTextForPrompt(prompt);
  const flags: string[] = [];

  for (const { pattern, flag } of BLOCKED_PROMPT_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      flags.push(flag);
    }
  }

  if (imageUrl) {
    for (const { pattern, flag } of BLOCKED_IMAGE_PATTERNS) {
      if (pattern.test(prompt)) {
        flags.push(flag);
      }
    }
  }

  if (flags.length > 0) {
    return {
      blocked: true,
      flags,
      reason: 'Input blocked by safety policy',
      safeReply: SEBASTIAN_REFUSAL_TEMPLATES.safetyBlocked,
    };
  }

  return { blocked: false, flags: [] };
}

export function moderateOutput(outputText: string): AssistantModerationResult {
  const normalizedOutput = sanitizeUserTextForPrompt(outputText);
  const flags: string[] = [];

  for (const { pattern, flag } of DISALLOWED_OUTPUT_PATTERNS) {
    if (pattern.test(normalizedOutput)) {
      flags.push(flag);
    }
  }

  if (flags.length > 0) {
    return {
      blocked: true,
      flags,
      reason: 'Output blocked by safety policy',
      safeReply: SEBASTIAN_REFUSAL_TEMPLATES.outOfScope,
    };
  }

  return { blocked: false, flags: [] };
}

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const allowedHostFragments = ['supabase.co', 'localhost'];
    return allowedHostFragments.some((fragment) => parsed.hostname.includes(fragment));
  } catch {
    return false;
  }
}

export function sanitizeContextValue(value: string | null | undefined): string {
  if (!value) return '';
  return sanitizeUserTextForPrompt(value)
    .replace(/[<>`{}[\]]/g, '');
}
