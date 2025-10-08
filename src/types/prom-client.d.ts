declare module "prom-client" {
  /** Minimal Counter interface used by our runtime wrapper */
  export interface Counter {
    inc(labelsOrValue?: Record<string, unknown> | number, value?: number): void;
  }

  export interface Registry {
    metrics(): Promise<string> | string;
  }

  const client: {
    Counter: { new (opts: { name: string; help: string; labelNames?: string[] }): Counter };
    register?: Registry;
    collectDefaultMetrics?: (opts?: { timeout?: number }) => void;
  };

  export default client;
  export const Counter: any;
  export const Gauge: any;
  export const Histogram: any;
  export const Summary: any;
  export const Registry: any;
}
