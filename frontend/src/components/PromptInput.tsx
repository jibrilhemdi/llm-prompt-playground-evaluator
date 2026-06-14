import { ChangeEvent } from "react";

const openRouterModels = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nex-agi/nex-n2-pro:free"
] as const;

interface PromptInputProps {
  prompt: string;
  keywordsText: string;
  variablesText: string;
  contextDocument: string;
  ragEnabled: boolean;
  brandName: string;
  industry: string;
  selectedFile: File | null;
  localEndpoint: string;
  localModel: string;
  openRouterModel: string;
  onPromptChange: (value: string) => void;
  onKeywordsChange: (value: string) => void;
  onVariablesChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onBrandNameChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onRagChange: (value: boolean) => void;
  onFileChange: (file: File | null) => void;
  onLocalEndpointChange: (value: string) => void;
  onLocalModelChange: (value: string) => void;
  onOpenRouterModelChange: (value: string) => void;
}

export function PromptInput({
  prompt,
  keywordsText,
  variablesText,
  contextDocument,
  ragEnabled,
  brandName,
  industry,
  selectedFile,
  localEndpoint,
  localModel,
  openRouterModel,
  onPromptChange,
  onKeywordsChange,
  onVariablesChange,
  onContextChange,
  onBrandNameChange,
  onIndustryChange,
  onRagChange,
  onFileChange,
  onLocalEndpointChange,
  onLocalModelChange,
  onOpenRouterModelChange
}: PromptInputProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onFileChange(file);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Prompt Playground</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Use any brand and industry, then reference variables like <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{"{{brand}}"}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{"{{industry}}"}</code>, and optional RAG context.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Brand name</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            value={brandName}
            onChange={(event) => onBrandNameChange(event.target.value)}
            placeholder="Puma"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Industry</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            value={industry}
            onChange={(event) => onIndustryChange(event.target.value)}
            placeholder="Sports apparel, football sponsorship, and performance culture"
          />
        </div>
      </div>

      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Prompt</label>
      <textarea
        className="mb-4 min-h-40 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="How can {{brand}} strengthen its position as a football and performance culture brand through sponsorships, athlete partnerships, product innovation, and streetwear relevance?"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Keywords, comma-separated
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            value={keywordsText}
            onChange={(event) => onKeywordsChange(event.target.value)}
            placeholder="Puma, football sponsorship, sportswear, athlete partnerships, performance culture"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Variables JSON</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            value={variablesText}
            onChange={(event) => onVariablesChange(event.target.value)}
            placeholder='{"brand":"Puma","industry":"Global sportswear, football sponsorships, and performance culture"}'
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Document Context</label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
              <input type="file" accept=".txt,.pdf" onChange={handleFileChange} className="hidden" />
              Upload .txt/.pdf
            </label>
          </div>
          <textarea
            className="min-h-36 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            value={contextDocument}
            onChange={(event) => onContextChange(event.target.value)}
            placeholder="Paste an About Us page, product brief, market overview, or brand facts here."
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Selected file: {selectedFile.name}</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={ragEnabled}
              onChange={(event) => onRagChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Enable RAG grounding
          </label>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            When enabled, the document is prepended to the prompt and factual consistency is scored.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                OpenRouter model
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                value={openRouterModel}
                onChange={(event) => onOpenRouterModelChange(event.target.value)}
              >
                {openRouterModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Local endpoint
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                value={localEndpoint}
                onChange={(event) => onLocalEndpointChange(event.target.value)}
                placeholder="http://localhost:11434"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Local model
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                value={localModel}
                onChange={(event) => onLocalModelChange(event.target.value)}
                placeholder="gemma4:e2b"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
