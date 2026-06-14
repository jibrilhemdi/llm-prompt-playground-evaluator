import { useEffect, useMemo, useRef, useState } from "react";
import { HistorySidebar } from "./components/HistorySidebar.js";
import { MetricsChart } from "./components/MetricsChart.js";
import { PromptInput } from "./components/PromptInput.js";
import { ProviderSelector } from "./components/ProviderSelector.js";
import { ResultCard } from "./components/ResultCard.js";
import { ToastContainer } from "./components/ToastContainer.js";
import { deleteAllHistory, deleteHistoryRun, getHistory, getRun, parseKeywords, parseVariables, providerLabel, runPlayground } from "./lib/api.js";
import {
  ProviderId,
  ProviderResult,
  ResponseRecord,
  RunRecord,
  ToastMessage
} from "./types.js";

const DEFAULT_BRAND = "Puma";
const DEFAULT_INDUSTRY = "Global sportswear, football sponsorships, and performance culture";
const DEFAULT_PROMPT = "How can {{brand}} strengthen its position as a football and performance culture brand through sponsorships, athlete partnerships, product innovation, and streetwear relevance?";
const DEFAULT_KEYWORDS = "Puma, football sponsorship, sportswear, athlete partnerships, performance culture";
const DEFAULT_VARIABLES = '{"brand":"Puma","industry":"Global sportswear, football sponsorships, and performance culture"}';
const DEFAULT_CONTEXT = `PUMA is a global sportswear and lifestyle brand with deep roots in football, running, motorsport, training, and street culture. The brand is known for football boots, performance apparel, training shoes, collaborations with athletes and designers, and partnerships with football clubs, federations, and high-profile players. Its positioning blends competitive performance with speed, style, and cultural relevance, reaching football fans, athletes, sneaker collectors, and fashion-conscious consumers. A strong PUMA message should connect product innovation, football sponsorship, athlete credibility, and lifestyle visibility without narrowing the brand to a single retail channel.`;
const DEFAULT_OPENROUTER_MODEL = "google/gemma-4-31b-it:free";

export default function App() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [keywordsText, setKeywordsText] = useState(DEFAULT_KEYWORDS);
  const [variablesText, setVariablesText] = useState(DEFAULT_VARIABLES);
  const [contextDocument, setContextDocument] = useState(DEFAULT_CONTEXT);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND);
  const [industry, setIndustry] = useState(DEFAULT_INDUSTRY);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [providers, setProviders] = useState<ProviderId[]>(["openrouter", "local"]);
  const [localEndpoint, setLocalEndpoint] = useState("");
  const [localModel, setLocalModel] = useState("gemma4:e2b");
  const [openRouterModel, setOpenRouterModel] = useState(DEFAULT_OPENROUTER_MODEL);
  const [results, setResults] = useState<ProviderResult[]>([]);
  const [loadingProviders, setLoadingProviders] = useState<ProviderId[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number>();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document === "undefined") {
      return false;
    }

    return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const selectedProvidersLabel = useMemo(() => {
    if (providers.length === 0) {
      return "No providers selected";
    }
    return providers.map((provider) => providerLabel(provider)).join(", ");
  }, [providers]);

  const displayedResults = useMemo(() => {
    if (results.length > 0) {
      return results;
    }
    if (history.length > 0) {
      return history[0].responses.map(mapResponseToResult);
    }
    return [];
  }, [history, results]);

  const hasReportableResults = displayedResults.length > 0;
  const resultsGridClass = displayedResults.length >= 3 ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "grid gap-5 md:grid-cols-2";

  async function loadHistory() {
    try {
      const runs = await getHistory();
      setHistory(runs);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Could not load history");
    }
  }

  function updateVariablesValue(key: string, value: string) {
    try {
      const variables = parseVariables(variablesText);
      setVariablesText(JSON.stringify({ ...variables, [key]: value }, null, 0));
    } catch {
      setVariablesText(JSON.stringify({ [key]: value }, null, 0));
    }
  }

  function updateContextForBrandIndustry(brand: string, market: string) {
    const currentTemplate = buildContextDocument(brandName, industry);
    if (
      contextDocument.trim() === "" ||
      contextDocument === DEFAULT_CONTEXT ||
      contextDocument === currentTemplate
    ) {
      setContextDocument(buildContextDocument(brand, market));
    }
  }

  function updateBrandName(value: string) {
    setBrandName(value);
    updateVariablesValue("brand", value);
    updateContextForBrandIndustry(value, industry);
  }

  function updateIndustry(value: string) {
    setIndustry(value);
    updateVariablesValue("industry", value);
    updateContextForBrandIndustry(brandName, value);
  }

  async function runEvaluation() {
    try {
      const keywords = parseKeywords(keywordsText);
      const variables = parseVariables(variablesText);

      if (providers.length === 0) {
        addToast("error", "Select at least one provider.");
        return;
      }
      if (keywords.length === 0) {
        addToast("error", "Add at least one keyword for evaluation.");
        return;
      }

      setLoadingProviders(providers);
      setResults([]);

      const response = await runPlayground(
        {
          prompt,
          providers,
          keywords,
          contextDocument: contextDocument.trim() || undefined,
          ragEnabled,
          variables,
          brandName,
          industry,
          localEndpoint: localEndpoint.trim() || undefined,
          localModel: localModel.trim() || undefined,
          openRouterModel
        },
        selectedFile ?? undefined
      );

      setResults(response.results);
      setSelectedRunId(response.runId);
      addToast("success", `Run #${response.runId} completed in ${response.latencyMs} ms.`);
      await loadHistory();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Prompt evaluation failed");
    } finally {
      setLoadingProviders([]);
    }
  }

  async function restoreRun(run: RunRecord) {
    try {
      const fullRun = await getRun(run.id);
      setSelectedRunId(fullRun.id);
      setPrompt(fullRun.prompt);
      setKeywordsText(fullRun.keywords.join(", "));
      setContextDocument(fullRun.context_document ?? "");
      setRagEnabled(Boolean(fullRun.context_document));
      setBrandName(fullRun.brand_name ?? "");
      setIndustry(fullRun.industry ?? "");
      setProviders(fullRun.providers);
      setResults(mapResponsesToResults(fullRun.responses));
      addToast("info", `Restored run #${fullRun.id}.`);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Could not restore run");
    }
  }

  async function deleteRun(runId: number) {
    if (!window.confirm("Delete this run? This cannot be undone.")) {
      return;
    }

    try {
      await deleteHistoryRun(runId);
      setHistory((currentHistory) => currentHistory.filter((run) => run.id !== runId));
      if (selectedRunId === runId) {
        setSelectedRunId(undefined);
        setResults([]);
      }
      addToast("success", "Run deleted.");
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Could not delete run");
    }
  }

  async function deleteAllRuns() {
    if (history.length === 0 || !window.confirm("Delete all history? This cannot be undone.")) {
      return;
    }

    try {
      await deleteAllHistory();
      setHistory([]);
      setSelectedRunId(undefined);
      setResults([]);
      addToast("success", "All history deleted.");
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Could not delete history");
    }
  }

  function dismissToast(id: number) {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }

  function addToast(type: ToastMessage["type"], text: string) {
    const id = Date.now();
    setToasts((currentToasts) => [...currentToasts, { id, type, text }]);
    window.setTimeout(() => dismissToast(id), 5000);
  }

  async function downloadReport() {
    if (!reportRef.current || displayedResults.length === 0) {
      return;
    }

    setIsDownloadingReport(true);
    try {
      const html2pdfModule = await import("html2pdf.js");
      const filename = `llm-prompt-report-${new Date().toISOString().slice(0, 10)}.pdf`;

      await html2pdfModule
        .default()
        .set({
          margin: 10,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(reportRef.current)
        .save();
    } catch {
      addToast("error", "Could not download PDF report");
    } finally {
      setIsDownloadingReport(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-4 px-6 2xl:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              LLM Prompt Playground & Evaluator
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
              Compare OpenRouter, Gemini, and Local outputs, then evaluate quality with keyword, sentiment,
              toxicity, latency, and RAG grounding metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {selectedProvidersLabel}
            </div>
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1920px] gap-6 px-6 py-6 2xl:px-10 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-6">
          <PromptInput
            prompt={prompt}
            keywordsText={keywordsText}
            variablesText={variablesText}
            contextDocument={contextDocument}
            ragEnabled={ragEnabled}
            brandName={brandName}
            industry={industry}
            selectedFile={selectedFile}
            localEndpoint={localEndpoint}
            localModel={localModel}
            openRouterModel={openRouterModel}
            onPromptChange={setPrompt}
            onKeywordsChange={setKeywordsText}
            onVariablesChange={setVariablesText}
            onContextChange={setContextDocument}
            onBrandNameChange={updateBrandName}
            onIndustryChange={updateIndustry}
            onRagChange={setRagEnabled}
            onFileChange={setSelectedFile}
            onLocalEndpointChange={setLocalEndpoint}
            onLocalModelChange={setLocalModel}
            onOpenRouterModelChange={setOpenRouterModel}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <ProviderSelector selectedProviders={providers} onProvidersChange={setProviders} />
            <button
              type="button"
              disabled={loadingProviders.length > 0}
              onClick={runEvaluation}
              className="rounded-2xl bg-indigo-600 px-8 py-4 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingProviders.length > 0 ? "Running..." : "Run"}
            </button>
            <button
              type="button"
              disabled={!hasReportableResults || isDownloadingReport}
              onClick={downloadReport}
              className="rounded-2xl border border-indigo-200 bg-white px-6 py-4 font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950/40"
            >
              {isDownloadingReport ? "Preparing..." : "Download PDF"}
            </button>
          </div>

          <MetricsChart history={history} />

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Results</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Side-by-side provider comparison</p>
              </div>
            </div>

            <div className={resultsGridClass}>
              {loadingProviders.length > 0
                ? loadingProviders.map((provider) => <ResultCard key={provider} loading />)
                : displayedResults.length > 0
                  ? displayedResults.map((result) => <ResultCard key={result.provider} result={result} />)
                  : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 md:col-span-2">
                      Run a prompt to compare provider responses and evaluation metrics.
                    </div>
                  )}
            </div>
          </section>
        </div>

        <HistorySidebar
          history={history}
          selectedRunId={selectedRunId}
          onSelectRun={restoreRun}
          onDeleteRun={deleteRun}
          onDeleteAll={deleteAllRuns}
        />
      </main>

      <div ref={reportRef} className="fixed left-[-10000px] top-0 w-[850px] bg-white p-10 text-slate-900" aria-hidden="true">
        <div className="mb-8 border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">LLM Prompt Evaluation Report</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">{brandName || "Brand"}{industry ? ` — ${industry}` : ""}</h1>
          <p className="mt-2 text-sm text-slate-500">{new Date().toLocaleString()}</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Prompt</h2>
            <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6">{prompt}</p>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Keywords</h2>
            <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6">{keywordsText}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Document Context</h2>
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 whitespace-pre-wrap">
            {contextDocument.trim() || "No document context provided."}
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Provider Results</h2>
          <div className="grid grid-cols-3 gap-4">
            {displayedResults.map((result) => (
              <div key={result.provider} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-lg font-semibold text-slate-950">{providerLabel(result.provider)}</h3>
                <p className="mt-2 text-sm text-slate-500">Keyword score: {result.keywordScore}%</p>
                <p className="mt-1 text-sm text-slate-500">Sentiment: {result.sentiment.label} ({result.sentiment.score})</p>
                <p className="mt-1 text-sm text-slate-500">Toxicity: {result.toxicityFlag ? "Flagged" : "Clean"}</p>
                <p className="mt-1 text-sm text-slate-500">Latency: {result.latencyMs} ms</p>
                <p className="mt-3 text-xs leading-5 text-slate-700">{result.responseText}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function buildContextDocument(brandName: string, industry: string): string {
  const brand = brandName.trim() || "the brand";
  const market = industry.trim() || "the market";
  return `${brand} operates in the ${market} market. Use this profile to answer prompts about positioning, products or services, target customers, and key differentiators for any industry.`;
}

function mapResponseToResult(response: ResponseRecord): ProviderResult {
  return {
    provider: response.provider as ProviderId,
    responseText: response.response_text,
    latencyMs: response.latency_ms,
    tokenCount: response.token_count,
    keywordScore: response.keyword_score,
    sentiment: {
      label: response.sentiment_label as ProviderResult["sentiment"]["label"],
      score: response.sentiment_score
    },
    toxicityFlag: Boolean(response.toxicity_flag),
    factualConsistencyScore: response.factual_consistency_score,
    analysisSource: response.analysis_source ?? undefined,
    error: response.error ?? undefined
  };
}

function mapResponsesToResults(responses: ResponseRecord[]): ProviderResult[] {
  return responses.map(mapResponseToResult);
}
