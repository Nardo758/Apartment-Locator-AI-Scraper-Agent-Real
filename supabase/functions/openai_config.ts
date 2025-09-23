export const recommendedConfig = {
  model: "gpt-4-turbo-preview",
  response_format: { type: "json_object" },
  temperature: 0.1,
  top_p: 0.1,
  max_tokens: 2000,
} as const;
