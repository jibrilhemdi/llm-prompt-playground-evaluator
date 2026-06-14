import { SentimentMetric } from "./types.js";

const POSITIVE_WORDS = new Set([
  "excellent",
  "great",
  "good",
  "better",
  "best",
  "amazing",
  "awesome",
  "strong",
  "helpful",
  "effective",
  "positive",
  "innovative",
  "clear",
  "valuable",
  "improve",
  "improves",
  "growth",
  "trusted",
  "optimize",
  "optimized",
  "benefit",
  "benefits"
]);

const NEGATIVE_WORDS = new Set([
  "bad",
  "poor",
  "weak",
  "worse",
  "worst",
  "negative",
  "harmful",
  "confusing",
  "ineffective",
  "risk",
  "failure",
  "failed",
  "decline",
  "problem",
  "problems",
  "limited",
  "slow",
  "toxic",
  "biased"
]);

const TOXIC_KEYWORDS = [
  "hate",
  "kill",
  "slur",
  "violence",
  "abuse",
  "terrorist",
  "harassment",
  "racist",
  "sexist"
];

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "were",
  "you",
  "your",
  "our",
  "their",
  "into",
  "about",
  "using",
  "helps",
  "help",
  "based",
  "company",
  "startup",
  "modern",
  "teams",
  "team"
]);

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function measureLatency(startTime: number, endTime: number): number {
  return Math.max(0, Math.round(endTime - startTime));
}

export function calculateKeywordScore(responseText: string, keywords: string[]): number {
  if (keywords.length === 0) {
    return 0;
  }

  const lowerResponse = responseText.toLowerCase();
  const matchedKeywords = keywords.filter((keyword) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return normalizedKeyword.length > 0 && lowerResponse.includes(normalizedKeyword);
  });

  return Math.round((matchedKeywords.length / keywords.length) * 100);
}

export function calculateSentiment(responseText: string): SentimentMetric {
  const tokens = responseText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let positiveCount = 0;
  let negativeCount = 0;

  for (const token of tokens) {
    if (POSITIVE_WORDS.has(token)) {
      positiveCount += 1;
    }
    if (NEGATIVE_WORDS.has(token)) {
      negativeCount += 1;
    }
  }

  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { label: "neutral", score: 0 };
  }

  const score = Math.round(((positiveCount - negativeCount) / total) * 100) / 100;
  if (score > 0.15) {
    return { label: "positive", score };
  }
  if (score < -0.15) {
    return { label: "negative", score };
  }
  return { label: "neutral", score };
}

export function hasToxicityFlag(responseText: string): boolean {
  const lowerResponse = responseText.toLowerCase();
  return TOXIC_KEYWORDS.some((keyword) => lowerResponse.includes(keyword));
}

export function extractContextEntities(contextDocument: string): string[] {
  const words = contextDocument
    .replace(/[.,;:()"\n\r]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);

  const seen = new Set<string>();
  const entities: string[] = [];

  for (const word of words) {
    const startsUppercase = /^[A-Z]/.test(word);
    const isAllUppercase = /^[A-Z0-9-]+$/.test(word);
    const normalized = word.toLowerCase();

    if (STOPWORDS.has(normalized)) {
      continue;
    }

    if ((startsUppercase || isAllUppercase) && !seen.has(normalized)) {
      seen.add(normalized);
      entities.push(word);
    }
  }

  return entities;
}

export function calculateFactualConsistencyScore(responseText: string, contextDocument?: string): number | null {
  if (!contextDocument || contextDocument.trim().length === 0) {
    return null;
  }

  const entities = extractContextEntities(contextDocument);
  if (entities.length === 0) {
    return null;
  }

  const lowerResponse = responseText.toLowerCase();
  const matchedEntities = entities.filter((entity) => lowerResponse.includes(entity.toLowerCase()));

  return Math.round((matchedEntities.length / entities.length) * 100);
}

export function replaceVariables(prompt: string, variables?: Record<string, string>): string {
  if (!variables) {
    return prompt;
  }

  return Object.entries(variables).reduce((updatedPrompt, [name, value]) => {
    return updatedPrompt.replaceAll(`{{${name}}}`, value);
  }, prompt);
}

export function truncateToApproximateTokens(text: string, maxTokens: number): string {
  const maxCharacters = maxTokens * 4;
  if (text.length <= maxCharacters) {
    return text;
  }

  const start = text.slice(0, Math.ceil(maxCharacters / 2));
  const end = text.slice(-Math.floor(maxCharacters / 2));
  return `${start}\n\n[...truncated middle...]\n\n${end}`;
}

export function buildGroundedPrompt(prompt: string, contextDocument?: string): string {
  if (!contextDocument || contextDocument.trim().length === 0) {
    return prompt;
  }

  const context = truncateToApproximateTokens(contextDocument, 2000);
  return `Context: ${context}\n\nAnswer based only on the context: ${prompt}`;
}
