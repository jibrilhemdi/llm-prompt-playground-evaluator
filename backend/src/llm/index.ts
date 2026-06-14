import { callGemini } from "./gemini.js";
import { analyzeSentimentWithHuggingFace, analyzeToxicityWithHuggingFace } from "./huggingface.js";
import { callLocal } from "./local.js";
import { callOpenRouter } from "./openrouter.js";
import {
  calculateFactualConsistencyScore,
  calculateKeywordScore,
  calculateSentiment,
  estimateTokenCount,
  hasToxicityFlag,
  measureLatency
} from "../evaluation.js";
import { ProviderConfig, ProviderId, ProviderResult } from "../types.js";

export async function runProvider(
  provider: ProviderId,
  prompt: string,
  keywords: string[],
  contextDocument?: string,
  config: ProviderConfig = {}
): Promise<ProviderResult> {
  const startedAt = performance.now();

  try {
    const responseText = await callProvider(provider, prompt, config);
    const endedAt = performance.now();

    const [huggingFaceSentiment, huggingFaceToxicity] = await Promise.all([
      analyzeSentimentWithHuggingFace(responseText),
      analyzeToxicityWithHuggingFace(responseText)
    ]);
    const sentiment = huggingFaceSentiment ?? calculateSentiment(responseText);
    const toxicityFlag = huggingFaceToxicity ?? hasToxicityFlag(responseText);

    return {
      provider,
      responseText,
      latencyMs: measureLatency(startedAt, endedAt),
      tokenCount: estimateTokenCount(responseText),
      keywordScore: calculateKeywordScore(responseText, keywords),
      sentiment,
      toxicityFlag,
      analysisSource: {
        sentiment: huggingFaceSentiment ? "huggingface" : "fallback",
        toxicity: huggingFaceToxicity === null ? "fallback" : "huggingface"
      },
      factualConsistencyScore: calculateFactualConsistencyScore(responseText, contextDocument)
    };
  } catch (error) {
    const endedAt = performance.now();
    const message = error instanceof Error ? error.message : "Provider request failed";

    return {
      provider,
      responseText: "",
      latencyMs: measureLatency(startedAt, endedAt),
      tokenCount: 0,
      keywordScore: calculateKeywordScore("", keywords),
      sentiment: calculateSentiment(""),
      toxicityFlag: false,
      analysisSource: {
        sentiment: "fallback",
        toxicity: "fallback"
      },
      factualConsistencyScore: calculateFactualConsistencyScore("", contextDocument),
      error: message
    };
  }
}

async function callProvider(provider: ProviderId, prompt: string, config: ProviderConfig): Promise<string> {
  switch (provider) {
    case "gemini":
      return callGemini(prompt);
    case "openrouter":
      return callOpenRouter(prompt, config.openRouterModel);
    case "local":
      return callLocal(prompt, config.localEndpoint, config.localModel);
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Unsupported provider: ${exhaustiveCheck}`);
    }
  }
}
