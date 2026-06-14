import { SentimentMetric } from "../types.js";

interface TextClassificationPrediction {
  label: string;
  score: number;
}

const DEFAULT_SENTIMENT_MODEL = "distilbert-base-uncased-finetuned-sst-2-english";
const DEFAULT_TOXICITY_MODEL = "unitary/toxic-bert";
const DEFAULT_TOXICITY_THRESHOLD = 0.5;
const DEFAULT_TIMEOUT_MS = 5000;
const TOXIC_LABEL_KEYWORDS = [
  "toxic",
  "severe_toxic",
  "obscene",
  "threat",
  "insult",
  "identity_hate",
  "hate",
  "abusive",
  "harassment",
  "profanity"
];

export async function analyzeSentimentWithHuggingFace(responseText: string): Promise<SentimentMetric | null> {
  if (!responseText.trim()) {
    return null;
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  try {
    const model = process.env.HUGGINGFACE_SENTIMENT_MODEL?.trim() || DEFAULT_SENTIMENT_MODEL;
    const predictions = await callTextClassification(model, responseText, apiKey);
    const topPrediction = getTopPrediction(predictions);

    if (!topPrediction) {
      return null;
    }

    return mapSentimentPrediction(topPrediction);
  } catch {
    return null;
  }
}

export async function analyzeToxicityWithHuggingFace(responseText: string): Promise<boolean | null> {
  if (!responseText.trim()) {
    return null;
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  try {
    const model = process.env.HUGGINGFACE_TOXICITY_MODEL?.trim() || DEFAULT_TOXICITY_MODEL;
    const threshold = getToxicityThreshold();
    const predictions = await callTextClassification(model, responseText, apiKey);

    return predictions.some((prediction) => {
      const normalizedLabel = prediction.label.toLowerCase();
      return prediction.score >= threshold && (isToxicLabel(normalizedLabel) || normalizedLabel === "label_1");
    });
  } catch {
    return null;
  }
}

async function callTextClassification(model: string, text: string, apiKey: string): Promise<TextClassificationPrediction[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: text }),
      signal: controller.signal
    });

    const payload = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      throw new Error(getHuggingFaceErrorMessage(payload, response.status));
    }

    const predictions = normalizePredictions(payload);
    if (predictions.length === 0) {
      throw new Error("Hugging Face returned an empty prediction");
    }

    return predictions;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePredictions(payload: unknown): TextClassificationPrediction[] {
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected Hugging Face response");
  }

  const predictions = payload.length > 0 && Array.isArray(payload[0]) ? payload[0] : payload;
  if (!Array.isArray(predictions)) {
    throw new Error("Unexpected Hugging Face response");
  }

  return predictions
    .map((prediction) => {
      if (!prediction || typeof prediction !== "object") {
        return null;
      }

      const record = prediction as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label : "";
      const score = typeof record.score === "number" ? record.score : Number.NaN;

      if (!label || !Number.isFinite(score)) {
        return null;
      }

      return { label, score };
    })
    .filter((prediction): prediction is TextClassificationPrediction => prediction !== null);
}

function getTopPrediction(predictions: TextClassificationPrediction[]): TextClassificationPrediction | null {
  return predictions.reduce<TextClassificationPrediction | null>((top, prediction) => {
    if (!top || prediction.score > top.score) {
      return prediction;
    }
    return top;
  }, null);
}

function mapSentimentPrediction(prediction: TextClassificationPrediction): SentimentMetric {
  const label = prediction.label.toLowerCase();

  if (label.includes("pos")) {
    return { label: "positive", score: roundScore(prediction.score) };
  }
  if (label.includes("neg")) {
    return { label: "negative", score: roundScore(-prediction.score) };
  }
  if (label.includes("neutral")) {
    return { label: "neutral", score: 0 };
  }

  return { label: "neutral", score: 0 };
}

function isToxicLabel(label: string): boolean {
  return TOXIC_LABEL_KEYWORDS.some((keyword) => label.includes(keyword));
}

function getToxicityThreshold(): number {
  const threshold = Number(process.env.HUGGINGFACE_TOXICITY_THRESHOLD);
  return Number.isFinite(threshold) && threshold > 0 && threshold <= 1 ? threshold : DEFAULT_TOXICITY_THRESHOLD;
}

function getTimeoutMs(): number {
  const timeoutMs = Number(process.env.HUGGINGFACE_TIMEOUT_MS);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
}

function getHuggingFaceErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") {
      return error;
    }
  }

  return `Hugging Face request failed with status ${status}`;
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
