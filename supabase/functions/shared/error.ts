export function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export class ScrapingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false,
  ) {
    super(message);
    this.name = "ScrapingError";
  }
}

export class ValidationError extends ScrapingError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", true);
  }
}

export class RateLimitError extends ScrapingError {
  constructor(message: string) {
    super(message, "RATE_LIMIT_ERROR", true);
  }
}
