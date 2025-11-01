import {
  startMetricsServer,
  stopMetricsServer,
} from "../src/observability/server";

const PORT = 9999;

// Mock fetch for testing
const fetch = async (url: string) => {
  const http = await import('http');
  return new Promise<{ status: number; text: () => Promise<string>; json: () => Promise<any> }>((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 200,
          text: async () => data,
          json: async () => JSON.parse(data)
        });
      });
    }).on('error', reject);
  });
};

beforeAll(() => {
  startMetricsServer({ port: PORT, enabled: true });
});

afterAll(() => {
  stopMetricsServer();
});

test("metrics endpoint responds and health endpoint OK", async () => {
  const metricsResp = await fetch(`http://127.0.0.1:${PORT}/metrics`);
  expect(metricsResp.status).toBe(200);
  const text = await metricsResp.text();
  expect(text.length).toBeGreaterThan(0);

  const healthResp = await fetch(`http://127.0.0.1:${PORT}/health`);
  expect(healthResp.status).toBe(200);
  const json = await healthResp.json() as { status: string };
  expect(json.status).toBe("ok");
});
