import { calculateStabilityScore } from './orchestrator';

export type PropertyLike = unknown;

const MODEL_TIERS = {
  cheap: 'gpt-3.5-turbo',
  balanced: 'gpt-3.5-turbo-16k',
  best: 'gpt-4-turbo-preview',
};

export const THRESHOLDS = {
  veryStable: 0.8,
  stable: 0.5,
  promptStable: 0.7,
};

export function getOptimalAIModel(property?: PropertyLike): string {
  let stability = 0;
  try {
    const raw = calculateStabilityScore(property as unknown as Parameters<typeof calculateStabilityScore>[0]);
    stability = typeof raw === 'number' && !Number.isNaN(raw) ? Math.max(0, Math.min(1, raw)) : 0;
  } catch {
    stability = 0;
  }

  if (stability >= THRESHOLDS.veryStable) return MODEL_TIERS.cheap;
  if (stability >= THRESHOLDS.stable) return MODEL_TIERS.balanced;
  return MODEL_TIERS.best;
}

export function optimizeAIPrompt(html: string | undefined, property?: PropertyLike): string {
  let stability = 0;
  try {
    const raw = calculateStabilityScore(property as unknown as Parameters<typeof calculateStabilityScore>[0]);
    stability = typeof raw === 'number' && !Number.isNaN(raw) ? Math.max(0, Math.min(1, raw)) : 0;
  } catch {
    stability = 0;
  }

  const safeHtml = typeof html === 'string' ? html.replace(/\s+/g, ' ').trim() : '';

  const jsonInstructions = `\nReturn the result as valid JSON only. Use these fields:\n{\n  "price": number | null,\n  "status": "active" | "pending" | "removed" | "unknown",\n  "concessions": string | null,\n  "notes": string | null\n}\n`;

  if (stability >= THRESHOLDS.promptStable) {
    const snippet = safeHtml.slice(0, 5000);
    return (
      `You are a web-extraction assistant. Check ONLY for changes in price, status, or concessions in the following HTML snippet. ` +
      `If nothing changed, reply with { "price": null, "status": "unknown", "concessions": null, "notes": "no significant changes" }.` +
      `\n\nHTML_SNIPPET_START\n${snippet}\nHTML_SNIPPET_END\n\n` +
      jsonInstructions
    );
  }

  const fullSnippet = safeHtml.slice(0, 15000);
  return (
    `You are a web-extraction assistant. Extract all apartment listing data (price, bedrooms, bathrooms, status, concessions, move-in date, unit identifiers, and listing URL) from the HTML below. ` +
    `Return valid JSON that matches the schema described below. If a field cannot be parsed, set it to null.` +
    `\n\nHTML_SNIPPET_START\n${fullSnippet}\nHTML_SNIPPET_END\n\n` +
    jsonInstructions
  );
}
