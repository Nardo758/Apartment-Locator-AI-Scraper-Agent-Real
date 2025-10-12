declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => Promise<void> | void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare const expect: any;
declare function afterEach(fn: () => void): void;
// Minimal jest namespace if referenced in tests
declare const jest: any;
declare namespace jest {
	// Minimal helpers used in tests — expand only as needed
	export type MockedFunction<T> = any;
}
