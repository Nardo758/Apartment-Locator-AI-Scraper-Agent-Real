declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => Promise<void> | void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare function expect(actual: any): any;
// Minimal jest namespace if referenced in tests
declare const jest: any;
