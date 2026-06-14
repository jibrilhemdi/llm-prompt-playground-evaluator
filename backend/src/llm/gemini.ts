import { GoogleGenerativeAI } from "@google/generative-ai";
import { mockProviderResponse } from "./mock.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.MOCK_MODE === "true") {
    return mockProviderResponse("gemini", prompt);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text.trim().length === 0) {
        throw new Error("Gemini returned an empty response");
      }

      return text.trim();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("429") && attempt < 3) {
        await delay(1000 * 2 ** (attempt - 1));
        continue;
      }
      if (attempt < 3) {
        await delay(750 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
}
