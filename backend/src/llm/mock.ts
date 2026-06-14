import { ProviderId } from "../types.js";

export function mockProviderResponse(provider: ProviderId, prompt: string): string {
  const providerName =
    provider === "gemini"
      ? "Gemini"
      : provider === "openrouter"
        ? "OpenRouter"
        : "Local LLM";
  const keywordHints = getKeywordHints(prompt);
  const keywordHint = keywordHints[0] ?? "the brand";

  return [
    `${providerName} mock response for testing without API credentials.`,
    `${keywordHint} can improve brand visibility by making product messaging clearer, more relevant, and easier for LLMs to associate with customer intent.`,
    `Key focus areas: ${keywordHints.join(", ") || "brand visibility"}.`,
    "For any industry, the strongest approach is to connect concise brand facts with measurable outcomes such as awareness, recall, and conversion.",
    "This mock answer is grounded in the supplied context when RAG is enabled and is designed to keep the UI usable in local development."
  ].join("\n\n");
}

function getKeywordHints(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const hints = [
    lowerPrompt.includes("puma") ? "Puma" : "",
    lowerPrompt.includes("football") ? "football sponsorship" : "",
    lowerPrompt.includes("athlete") ? "athlete partnerships" : "",
    lowerPrompt.includes("performance") ? "performance culture" : "",
    lowerPrompt.includes("visibility") ? "brand visibility" : "",
    lowerPrompt.includes("sportswear") ? "sportswear" : "",
    lowerPrompt.includes("streetwear") ? "streetwear relevance" : "",
    lowerPrompt.includes("product innovation") ? "product innovation" : ""
  ].filter(Boolean);

  if (lowerPrompt.includes("puma") && !hints.includes("sportswear")) {
    hints.push("sportswear");
  }

  return Array.from(new Set(hints));
}
