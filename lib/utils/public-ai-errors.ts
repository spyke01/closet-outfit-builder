export type PublicAiError = {
  error: string;
  code: 'UPSTREAM_TIMEOUT' | 'UPSTREAM_INVALID_REQUEST' | 'UPSTREAM_UNAVAILABLE' | 'UPSTREAM_RATE_LIMIT' | 'UPSTREAM_ERROR';
  status: number;
};

type PublicAiErrorMessages = {
  timeout: string;
  invalidRequest: string;
  unavailable: string;
  rateLimit: string;
  generic: string;
};

const DEFAULT_MESSAGES: PublicAiErrorMessages = {
  timeout: 'The request took too long. Please try again.',
  invalidRequest: 'The request could not be processed. Please retry.',
  unavailable: 'This service is temporarily unavailable. Please try again later.',
  rateLimit: 'This service is handling high demand right now. Please retry in a moment.',
  generic: 'The request could not be completed right now. Please try again.',
};

function isConfigurationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('config_error') ||
    normalized.includes('token is not configured') ||
    normalized.includes('not configured') ||
    normalized.includes('missing replicate_api_token')
  );
}

export function mapPublicAiError(
  rawMessage: string,
  overrides: Partial<PublicAiErrorMessages> = {}
): PublicAiError {
  const message = rawMessage || '';
  const messages = { ...DEFAULT_MESSAGES, ...overrides };

  if (message.toLowerCase().includes('timeout')) {
    return { error: messages.timeout, code: 'UPSTREAM_TIMEOUT', status: 504 };
  }

  if (message.includes('422')) {
    return { error: messages.invalidRequest, code: 'UPSTREAM_INVALID_REQUEST', status: 502 };
  }

  if (message.includes('UPSTREAM_CIRCUIT_OPEN') || isConfigurationError(message)) {
    return { error: messages.unavailable, code: 'UPSTREAM_UNAVAILABLE', status: 503 };
  }

  if (message.includes('429')) {
    return { error: messages.rateLimit, code: 'UPSTREAM_RATE_LIMIT', status: 503 };
  }

  return { error: messages.generic, code: 'UPSTREAM_ERROR', status: 502 };
}
