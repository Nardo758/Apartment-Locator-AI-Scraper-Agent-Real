interface MinimalDeno {
  env: {
    get(name: string): string | undefined;
  };
  exit(code?: number): never;
  version?: { deno: string };
}

declare global {
  // Attach a minimal Deno interface to globalThis to avoid duplicate identifier issues
  var Deno: MinimalDeno;
}

export {};
