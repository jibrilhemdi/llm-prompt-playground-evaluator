export type ProviderId = "gemini" | "openrouter" | "local";
export type AnalysisSource = "huggingface" | "fallback";

export interface SentimentMetric {
  label: "positive" | "negative" | "neutral";
  score: number;
}

export interface ProviderResult {
  provider: ProviderId;
  responseText: string;
  latencyMs: number;
  tokenCount: number;
  keywordScore: number;
  sentiment: SentimentMetric;
  toxicityFlag: boolean;
  factualConsistencyScore: number | null;
  analysisSource?: {
    sentiment: AnalysisSource;
    toxicity: AnalysisSource;
  };
  error?: string;
}

export interface PlaygroundRequest {
  prompt: string;
  providers: ProviderId[];
  keywords: string[];
  contextDocument?: string;
  ragEnabled?: boolean;
  variables?: Record<string, string>;
  brandName?: string;
  industry?: string;
  localEndpoint?: string;
  localModel?: string;
  openRouterModel?: string;
}

export interface RunRecord {
  id: number;
  timestamp: string;
  prompt: string;
  context_document: string | null;
  brand_name: string | null;
  industry: string | null;
  keywords: string;
  providers: string;
}

export interface ResponseRecord {
  id: number;
  run_id: number;
  provider: string;
  response_text: string;
  latency_ms: number;
  token_count: number;
  keyword_score: number;
  sentiment_score: number;
  sentiment_label: string;
  toxicity_flag: number;
  factual_consistency_score: number | null;
  error: string | null;
}

export interface RunWithResponses extends Omit<RunRecord, "keywords" | "providers"> {
  keywords: string[];
  providers: ProviderId[];
  responses: ResponseRecord[];
}

export interface ProviderConfig {
  localEndpoint?: string;
  localModel?: string;
  openRouterModel?: string;
}
