export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return typeof e === "string" ? e : JSON.stringify(e);
  } catch (_err) {
    return String(e);
  }
}

export default errMsg;
