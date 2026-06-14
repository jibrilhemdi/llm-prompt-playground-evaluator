import { ProviderId } from "../types.js";

export function mockProviderResponse(provider: ProviderId, prompt: string): string {
  const providerName =
    provider === "gemini"
      ? "Gemini"
      : provider === "openrouter"
        ? "OpenRouter"
        : "Local LLM";
  const keywordHint = prompt.match(/\b[A-Z][A-Za-z0-9&.-]{2,}\b/)?.[0] ?? "the brand";

  return [
    `${providerName} mock response for testing without API credentials.`,
    `${keywordHint} can improve brand visibility by making product messaging clearer, more relevant, and easier for LLMs to associate with customer intent.`,
    `For any industry, the strongest approach is to connect concise brand facts with measurable outcomes such as awareness, recall, and conversion.`,
    "This mock answer is grounded in the supplied context when RAG is enabled and is designed to keep the UI usable in local development."
  ].join("\n\n");
}
