type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerContext {
  component: string;
}

type LogMetadata = unknown;

function shouldEmit(level: LogLevel): boolean {
  if (level === 'warn' || level === 'error') {
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return process.env.SECURITY_DEBUG === 'true';
}

function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }

  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function serialize(metadata?: LogMetadata): string {
  if (metadata === undefined) {
    return '';
  }

  try {
    return ` ${JSON.stringify(metadata)}`;
  } catch {
    return ' {"metadata":"[unserializable]"}';
  }
}

function emit(level: LogLevel, component: string, message: unknown, metadata?: LogMetadata): void {
  if (!shouldEmit(level)) {
    return;
  }

  const line = `[${component}] ${normalizeMessage(message)}${serialize(metadata)}`;
  if (level === 'debug' || level === 'info') {
    // Intentionally use stdout only when explicitly enabled in production.
    if (process.env.NODE_ENV !== 'production' || process.env.SECURITY_DEBUG === 'true') {
      console.info(line);
    }
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.error(line);
}

export function createLogger(context: LoggerContext) {
  return {
    debug: (message: unknown, metadata?: LogMetadata) => emit('debug', context.component, message, metadata),
    info: (message: unknown, metadata?: LogMetadata) => emit('info', context.component, message, metadata),
    warn: (message: unknown, metadata?: LogMetadata) => emit('warn', context.component, message, metadata),
    error: (message: unknown, metadata?: LogMetadata) => emit('error', context.component, message, metadata),
  };
}
