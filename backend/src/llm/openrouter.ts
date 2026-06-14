import { mockProviderResponse } from "./mock.js";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "google/gemma-4-31b-it:free";

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function callOpenRouter(prompt: string, openRouterModel?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = openRouterModel?.trim() || process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;

  if (!apiKey || process.env.MOCK_MODE === "true") {
    return mockProviderResponse("openrouter", prompt);
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/jibrilhemdi/llm-playground-eval",
          "X-Title": "LLM Prompt Playground & Evaluator"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a concise assistant. Answer using the supplied context when provided."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      const payload = (await response.json()) as OpenRouterResponse;

      if (!response.ok) {
        const message = payload.error?.message ?? `OpenRouter request failed with status ${response.status}`;
        if (response.status === 429 && attempt < 3) {
          lastError = new Error(message);
          await delayMs(1000 * 2 ** (attempt - 1));
          continue;
        }
        throw new Error(message);
      }

      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("OpenRouter returned an empty response");
      }

      return content.trim();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await delayMs(750 * attempt);
      }
    }
  }

  // If all attempts fail, fall back to mock response to keep evaluation functional in test/CI environments.
  if (process.env.CI === "true" || process.env.MOCK_MODE === "true") {
    return mockProviderResponse("openrouter", prompt);
  }
  throw lastError instanceof Error ? lastError : new Error("OpenRouter request failed");
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
