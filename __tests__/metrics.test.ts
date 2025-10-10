import metricsClient, {
  getMetrics,
  validationFailByReason,
  validationFailCounter,
  validationPassCounter,
} from "../src/observability/metrics";

beforeEach(() => {
  // Clear metrics between tests
  metricsClient.register.clear();
});

test("validation counters increment on pass and fail", async () => {
  // Use exported counters from the metrics module
  validationPassCounter.inc();
  validationFailCounter.inc(2);
  validationFailByReason.inc({ reason: "zod_error" } as any, 2);

  const metrics = await getMetrics();
  expect(metrics).toContain("validation_pass_total 1");
  expect(metrics).toContain("validation_fail_total 2");
  expect(metrics).toContain('validation_fail_by_reason{reason="zod_error"} 2');
});
