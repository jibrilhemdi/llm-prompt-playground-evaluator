import { PlaygroundRequest, ProviderResult, RunRecord, RunResponse } from "../types.js";

export async function runPlayground(payload: PlaygroundRequest, file?: File): Promise<RunResponse> {
  if (file) {
    const formData = new FormData();
    formData.append("prompt", payload.prompt);
    formData.append("providers", JSON.stringify(payload.providers));
    formData.append("keywords", JSON.stringify(payload.keywords));
    formData.append("ragEnabled", String(Boolean(payload.ragEnabled)));
    formData.append("variables", JSON.stringify(payload.variables ?? {}));
    if (payload.brandName) {
      formData.append("brandName", payload.brandName);
    }
    if (payload.industry) {
      formData.append("industry", payload.industry);
    }

    if (payload.contextDocument) {
      formData.append("contextDocument", payload.contextDocument);
    }
    if (payload.localEndpoint) {
      formData.append("localEndpoint", payload.localEndpoint);
    }
    if (payload.localModel) {
      formData.append("localModel", payload.localModel);
    }
    if (payload.openRouterModel) {
      formData.append("openRouterModel", payload.openRouterModel);
    }

    formData.append("document", file);

    const response = await fetch("/api/playground", {
      method: "POST",
      body: formData
    });

    return parseJsonResponse<RunResponse>(response);
  }

  const response = await fetch("/api/playground", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse<RunResponse>(response);
}

export async function getHistory(): Promise<RunRecord[]> {
  const response = await fetch("/api/history?limit=10");
  return parseJsonResponse<RunRecord[]>(response);
}

export async function deleteHistoryRun(id: number): Promise<void> {
  const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
  await parseDeleteResponse(response);
}

export async function deleteAllHistory(): Promise<void> {
  const response = await fetch("/api/history", { method: "DELETE" });
  await parseDeleteResponse(response);
}

export async function getRun(id: number): Promise<RunRecord> {
  const response = await fetch(`/api/history/${id}`);
  return parseJsonResponse<RunRecord>(response);
}

async function parseJsonResponse<T extends object>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    const message = "error" in payload && typeof payload.error === "string" ? payload.error : "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

async function parseDeleteResponse(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let message = "Request failed";
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === "string") {
      message = payload.error;
    }
  } catch {
    message = "Could not delete history";
  }

  throw new Error(message);
}

export function providerLabel(provider: ProviderResult["provider"]): string {
  switch (provider) {
    case "gemini":
      return "Gemini";
    case "openrouter":
      return "OpenRouter";
    case "local":
      return "Local";
  }
}

export function providerColor(provider: ProviderResult["provider"]): string {
  switch (provider) {
    case "gemini":
      return "from-blue-500 to-cyan-500";
    case "openrouter":
      return "from-violet-500 to-fuchsia-500";
    case "local":
      return "from-emerald-500 to-teal-500";
  }
}

export function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function parseKeywords(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function parseVariables(value: string): Record<string, string> {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Variables must be a JSON object");
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, entry]) => [key, typeof entry === "string" ? entry : String(entry)])
    );
  } catch {
    throw new Error("Variables must be valid JSON, for example { \"brand\": \"Puma\", \"industry\": \"Global sportswear, football sponsorships, and performance culture\" }");
  }
}
