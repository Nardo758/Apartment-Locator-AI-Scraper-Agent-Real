// Minimal Deno declaration for environments where Deno is not available (tests / Node)
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};
