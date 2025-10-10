export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    // try stringify if possible
    return String(e);
  } catch {
    return "Unknown error";
  }
}
