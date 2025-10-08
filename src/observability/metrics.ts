// Import a minimal prom-client shape from our ambient types
// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore - runtime may not provide full types in test shim
const promClient = require("prom-client") as import("prom-client").default;

// Collect default metrics (node process metrics) when available
if (typeof promClient.collectDefaultMetrics === "function") {
  promClient.collectDefaultMetrics({ timeout: 5000 });
}

// Validation counters
// Underlying prom-client counters (for real runtime)
// @ts-ignore: prom-client runtime shape may differ in test shim
const _validationPass = new promClient.Counter({
  name: "validation_pass_total",
  help: "Number of successful zod validations for scraped properties",
});
// @ts-ignore: prom-client runtime shape may differ in test shim
const _validationFail = new promClient.Counter({
  name: "validation_fail_total",
  help: "Number of failed zod validations for scraped properties",
});
// @ts-ignore: prom-client runtime shape may differ in test shim
const _validationFailByReason = new promClient.Counter({
  name: "validation_fail_by_reason",
  help: "Validation failures labeled by reason",
  labelNames: ["reason"] as string[],
});

// Local counters for deterministic test inspection
let passCount = 0;
let failCount = 0;
const failByReasonMap: Record<string, number> = {};

function wrapCounter(
  underlying: import("prom-client").Counter,
  onInc: (
    labelsOrValue?: Record<string, unknown> | number,
    value?: number,
  ) => void,
) {
  return {
    inc(labelsOrValue?: Record<string, unknown> | number, value?: number) {
      try {
        // use unknown intermediate to avoid `any` while keeping runtime cast
        (underlying as unknown as { inc: (a?: unknown, b?: unknown) => void })
          .inc(labelsOrValue as unknown, value as unknown);
      } catch (_e) { /* ignore runtime shim issues */ }
      // pass the raw value through with a narrowed union type
      onInc(
        labelsOrValue as Record<string, unknown> | number | undefined,
        value,
      );
    },
  };
}

export const validationPassCounter = wrapCounter(_validationPass, () => {
  passCount += 1;
});
export const validationFailCounter = wrapCounter(_validationFail, (_l, v) => {
  failCount += typeof _l === "number" ? _l : (v ?? 1);
});
export const validationFailByReason = wrapCounter(
  _validationFailByReason,
  (labels?: Record<string, unknown> | number, v?: number) => {
    const increment = typeof labels === "number" ? labels : (v ?? 1);
    // Safely extract a 'reason' label without using `any`.
    let reason = "unknown";
    if (labels && typeof labels === "object") {
      const maybe = labels as Record<string, unknown>;
      if ("reason" in maybe && maybe.reason != null) {
        reason = String(maybe.reason);
      }
    }
    failByReasonMap[reason] = (failByReasonMap[reason] || 0) + increment;
  },
);

export function getMetrics(): Promise<string> {
  // Try to delegate to prom-client if available, otherwise synthesize minimal metrics output
  try {
    if (
      promClient && promClient.register &&
      typeof (promClient.register.metrics) === "function"
    ) {
      const result = promClient.register.metrics();
      return result instanceof Promise
        ? result
        : Promise.resolve(String(result));
    }
  } catch (_e) {
    // fall through to synthesize
  }

  let out = "";
  out += `validation_pass_total ${passCount}\n`;
  out += `validation_fail_total ${failCount}\n`;
  for (const r of Object.keys(failByReasonMap)) {
    out += `validation_fail_by_reason{reason="${r}"} ${failByReasonMap[r]}\n`;
  }
  return Promise.resolve(out);
}

// @ts-ignore: prom-client default export may be untyped in this runtime/test shim
export default promClient;
