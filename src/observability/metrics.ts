// Use require to avoid ambient typing issues in the test shim
// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore
const promClient = require("prom-client");

// Collect default metrics (node process metrics)
// @ts-ignore
promClient.collectDefaultMetrics({ timeout: 5000 });

// Validation counters
// Underlying prom-client counters (for real runtime)
// @ts-ignore
const _validationPass = new promClient.Counter({
  name: "validation_pass_total",
  help: "Number of successful zod validations for scraped properties",
});
// @ts-ignore
const _validationFail = new promClient.Counter({
  name: "validation_fail_total",
  help: "Number of failed zod validations for scraped properties",
});
// @ts-ignore
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
  underlying: any,
  onInc: (labelsOrValue?: any, value?: number) => void,
) {
  return {
    inc(labelsOrValue?: any, value?: number) {
      try {
        underlying.inc(labelsOrValue as any, value as any);
      } catch (e) { /* ignore runtime shim issues */ }
      onInc(labelsOrValue, value);
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
  (labels: any, v?: number) => {
    const increment = typeof labels === "number" ? labels : (v ?? 1);
    const reason = (labels && typeof labels === "object" && labels.reason)
      ? String(labels.reason)
      : "unknown";
    failByReasonMap[reason] = (failByReasonMap[reason] || 0) + increment;
  },
);

export function getMetrics(): Promise<string> {
  // Try to delegate to prom-client if available, otherwise synthesize minimal metrics output
  try {
    // @ts-ignore
    if (
      promClient && promClient.register &&
      typeof promClient.register.metrics === "function"
    ) {
      // @ts-ignore
      return promClient.register.metrics();
    }
  } catch (e) {
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

// @ts-ignore
export default promClient;
