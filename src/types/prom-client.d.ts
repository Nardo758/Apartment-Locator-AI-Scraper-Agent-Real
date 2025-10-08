declare module "prom-client" {
  const client: any;
  export default client;
  export const Counter: any;
  export const Gauge: any;
  export const Histogram: any;
  export const Summary: any;
  export const Registry: any;
}
