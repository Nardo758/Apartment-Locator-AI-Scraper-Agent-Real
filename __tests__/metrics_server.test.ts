import fetch from "node-fetch";
import {
  startMetricsServer,
  stopMetricsServer,
} from "../src/observability/server";

const PORT = 9999;

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
  const json = await healthResp.json();
  expect(json.status).toBe("ok");
});
