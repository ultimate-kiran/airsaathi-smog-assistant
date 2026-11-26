/**
 * Structured, one-line JSON logs. Never pass personal data, coordinates finer than ~1 km,
 * questions, or secrets: log events and outcomes only.
 */
type Level = "info" | "warn" | "error";

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (level === "info" && process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Error name only: messages from upstream libraries can echo URLs or payloads. */
export const errorName = (e: unknown) => (e instanceof Error ? e.name : "unknown");
