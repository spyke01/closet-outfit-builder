import { describe, expect, it } from 'vitest';
import {
  SEBASTIAN_GREETING,
  SEBASTIAN_REFUSAL_TEMPLATES,
  buildSebastianSystemPrompt,
  createSebastianPreviewReply,
  validateSebastianSystemPrompt,
} from '@/lib/services/assistant/persona';

describe('Sebastian persona', () => {
  it('builds a stable system prompt with key behavior rules', () => {
    const prompt = buildSebastianSystemPrompt();
    expect(prompt).toContain('You are Sebastian');
    expect(prompt).toContain('Response order: recommendation, short reasoning, alternatives, optional next step.');
    expect(prompt).toContain('Do not fabricate wardrobe ownership');
    expect(prompt).toContain('Keep this structure implicit: do not print section headers');
  });

  it('validates required guardrail clauses in the system prompt', () => {
    const prompt = buildSebastianSystemPrompt();
    const validation = validateSebastianSystemPrompt(prompt);
    expect(validation.valid).toBe(true);
    expect(validation.missingClauses).toHaveLength(0);
  });

  it('flags missing guardrail clauses when prompt is edited unsafely', () => {
    const editedPrompt = 'You are Sebastian. Help with style.';
    const validation = validateSebastianSystemPrompt(editedPrompt);
    expect(validation.valid).toBe(false);
    expect(validation.missingClauses.length).toBeGreaterThan(0);
  });

  it('provides reusable greeting and refusal tokens', () => {
    expect(SEBASTIAN_GREETING.length).toBeGreaterThan(10);
    expect(SEBASTIAN_REFUSAL_TEMPLATES.safetyBlocked).toContain("can't");
  });

  it('returns contextual preview responses', () => {
    expect(createSebastianPreviewReply('Can you help me pack for my trip?')).toContain('destination and weather');
    expect(createSebastianPreviewReply('')).toContain('office, social, or travel');
  });
});
