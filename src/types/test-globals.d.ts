// Extended test type definitions for Deno
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const test: (name: string, fn: () => void | Promise<void>) => void;
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;

declare const expect: {
  <T = any>(actual: T): {
    toBe(expected: T): void;
    toEqual(expected: any): void;
    toStrictEqual(expected: any): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeInstanceOf(cls: new (...args: any[]) => any): void;
    toContain(expected: any): void;
    toContainEqual(expected: any): void;
    toHaveLength(length: number): void;
    toHaveProperty(property: string, value?: any): void;
    toMatch(regexp: RegExp): void;
    toMatchObject(object: any): void;
    toThrow(error?: any): void;
    toBeCloseTo(expected: number, precision?: number): void;
    arrayContaining(expected: any[]): any;
    objectContaining(expected: any): any;
    stringContaining(expected: string): any;
    stringMatching(expected: string | RegExp): any;
    not: {
      toBe(expected: any): void;
      toEqual(expected: any): void;
      toContain(expected: any): void;
      toThrow(error?: any): void;
    };
    resolves: {
      toBe(expected: any): Promise<void>;
      toEqual(expected: any): Promise<void>;
      toThrow(error?: any): Promise<void>;
    };
    rejects: {
      toThrow(error?: any): Promise<void>;
    };
  };
  arrayContaining(expected: any[]): any;
  objectContaining(expected: any): any;
  stringContaining(expected: string): any;
  stringMatching(expected: string | RegExp): any;
  assertions(expected: number): void;
  extend(matchers: any): void;
};
