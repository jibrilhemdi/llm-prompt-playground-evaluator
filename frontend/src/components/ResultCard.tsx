import { ProviderResult } from "../types.js";
import { providerColor, providerLabel } from "../lib/api.js";

interface ResultCardProps {
  result?: ProviderResult;
  loading?: boolean;
}

function scoreBorder(score: number): string {
  if (score >= 70) {
    return "border-emerald-500";
  }
  if (score >= 40) {
    return "border-amber-500";
  }
  return "border-rose-500";
}

function sentimentClass(label: ProviderResult["sentiment"]["label"]): string {
  switch (label) {
    case "positive":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300";
    case "negative":
      return "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300";
    case "neutral":
      return "bg-slate-50 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function ResultCard({ result, loading = false }: ResultCardProps) {
  if (loading) {
    return (
      <article className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 h-6 w-24 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mb-3 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mb-3 h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mb-3 h-3 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </article>
    );
  }

  if (!result) {
    return null;
  }

  const gradient = providerColor(result.provider);
  const border = scoreBorder(result.keywordScore);
  const analysisSource = result.analysisSource
    ? `${result.analysisSource.sentiment === "huggingface" ? "HF" : "Fallback"} sentiment • ${
        result.analysisSource.toxicity === "huggingface" ? "HF" : "Fallback"
      } toxicity`
    : "Analysis";

  return (
    <article className={`relative overflow-hidden rounded-2xl border-2 ${border} bg-white p-5 shadow-sm dark:bg-slate-900`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{providerLabel(result.provider)}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {result.error ? "Provider request failed" : analysisSource}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            result.keywordScore >= 70
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300"
              : result.keywordScore >= 40
                ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300"
                : "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300"
          }`}
        >
          {result.keywordScore}% keyword score
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricBadge label="Latency" value={`${result.latencyMs} ms`} />
        <MetricBadge label="Tokens" value={String(result.tokenCount)} />
        <MetricBadge label="Sentiment" value={`${result.sentiment.label} (${result.sentiment.score})`} />
        <MetricBadge label="Toxicity" value={result.toxicityFlag ? "Flagged" : "Clean"} />
      </div>

      {result.factualConsistencyScore !== null && (
        <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          Factual consistency score: <strong>{result.factualConsistencyScore}%</strong>
        </div>
      )}

      {result.error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">
          {result.error}
        </div>
      ) : (
        <div className="max-h-80 overflow-auto rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
          {result.responseText}
        </div>
      )}
    </article>
  );
}

interface MetricBadgeProps {
  label: string;
  value: string;
}

function MetricBadge({ label, value }: MetricBadgeProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate font-semibold ${sentimentClass("neutral").replace("ring-1 ", "")}`}>{value}</p>
    </div>
  );
}
