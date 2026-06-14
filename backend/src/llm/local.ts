import { mockProviderResponse } from "./mock.js";

export async function callLocal(prompt: string, endpoint = "http://localhost:11434", model = "gemma4:e2b"): Promise<string> {
  if (process.env.MOCK_MODE === "true" || !endpoint) {
    return mockProviderResponse("local", prompt);
  }

  const url = endpoint.endsWith("/chat/completions") ? endpoint : `${endpoint.replace(/\/$/, "")}/v1/chat/completions`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Local LLM request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("Local LLM returned an empty response");
      }

      return content.trim();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Local LLM request failed");
}
