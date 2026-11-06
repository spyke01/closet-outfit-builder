type LogLevel = "debug" | "info" | "warn" | "error";
interface LoggerContext {
  component: string;
}
type LogMetadata = unknown;
const sensitiveKey =
  /api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|secret|password|service[_-]?role/i;
function redact(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (typeof value === "string") {
    let text = value
      .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
      .replace(
        /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|r8_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g,
        "[REDACTED]",
      );
    // Also remove exact configured secrets if a provider accidentally echoes one.
    for (const [key, secret] of Object.entries(process.env))
      if (sensitiveKey.test(key) && secret && secret.length >= 8)
        text = text.split(secret).join("[REDACTED]");
    return text;
  }
  if (!value || typeof value !== "object") return value;
  if (seen.has(value) || depth > 5) return "[omitted]";
  seen.add(value);
  if (value instanceof Error)
    return {
      name: value.name,
      message: redact(value.message, seen, depth + 1),
    };
  if (Array.isArray(value))
    return value.map((item) => redact(item, seen, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : redact(item, seen, depth + 1),
    ]),
  );
}
function shouldEmit(level: LogLevel) {
  return (
    level === "warn" ||
    level === "error" ||
    process.env.NODE_ENV !== "production" ||
    process.env.SECURITY_DEBUG === "true"
  );
}
function format(value: unknown) {
  const safe = redact(value);
  if (typeof safe === "string") return safe;
  try {
    return JSON.stringify(safe);
  } catch {
    return "[unserializable]";
  }
}
function emit(
  level: LogLevel,
  component: string,
  message: unknown,
  metadata?: LogMetadata,
) {
  if (!shouldEmit(level)) return;
  const line = `[${component}] ${format(message)}${metadata === undefined ? "" : ` ${format(metadata)}`}`;
  if (level === "debug" || level === "info") console.info(line);
  else if (level === "warn") console.warn(line);
  else console.error(line);
}
export function createLogger(context: LoggerContext) {
  return {
    debug: (message: unknown, metadata?: LogMetadata) =>
      emit("debug", context.component, message, metadata),
    info: (message: unknown, metadata?: LogMetadata) =>
      emit("info", context.component, message, metadata),
    warn: (message: unknown, metadata?: LogMetadata) =>
      emit("warn", context.component, message, metadata),
    error: (message: unknown, metadata?: LogMetadata) =>
      emit("error", context.component, message, metadata),
  };
}
