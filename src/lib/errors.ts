import type { ErrorCode } from "./types";

/**
 * A failure the user should hear about, with a stable code. Thrown by services and routes alike;
 * the HTTP layer turns it into a reply and the client translates the code.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "AppError";
  }
}
