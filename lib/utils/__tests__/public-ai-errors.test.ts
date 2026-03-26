import { describe, expect, it } from 'vitest';

import { mapPublicAiError } from '@/lib/utils/public-ai-errors';

describe('mapPublicAiError', () => {
  it('maps provider configuration details to a generic unavailable response', () => {
    const mapped = mapPublicAiError('Replicate token is not configured');

    expect(mapped).toEqual({
      error: 'This service is temporarily unavailable. Please try again later.',
      code: 'UPSTREAM_UNAVAILABLE',
      status: 503,
    });
  });

  it('maps invalid request details without exposing upstream payloads', () => {
    const mapped = mapPublicAiError('Replicate invalid request: 422 - model payload rejected');

    expect(mapped).toEqual({
      error: 'The request could not be processed. Please retry.',
      code: 'UPSTREAM_INVALID_REQUEST',
      status: 502,
    });
  });

  it('maps unknown failures to a generic upstream error', () => {
    const mapped = mapPublicAiError('Replicate create prediction failed: 500 - internal');

    expect(mapped).toEqual({
      error: 'The request could not be completed right now. Please try again.',
      code: 'UPSTREAM_ERROR',
      status: 502,
    });
  });
});
