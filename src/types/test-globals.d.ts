// Global test type definitions for Deno (jest-like convenience)
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const test: (name: string, fn: () => void | Promise<void>) => void;
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;

declare const expect: {
  (value: any): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toContain(expected: any): void;
    toThrow(error?: any): void;
    resolves: {
      toBe(expected: any): Promise<void>;
      toEqual(expected: any): Promise<void>;
    };
    rejects: {
      toThrow(error?: any): Promise<void>;
    };
  };
};
