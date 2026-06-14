import { ProviderId } from "../types.js";

interface ProviderOption {
  id: ProviderId;
  name: string;
  description: string;
}

const providers: ProviderOption[] = [
  {
    id: "gemini",
    name: "Gemini",
    description: "Google Gemini free-tier model access."
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Free-tier LLM access through OpenRouter’s shared model gateway."
  },
  {
    id: "local",
    name: "Local",
    description: "Optional Ollama or OpenAI-compatible local endpoint, default model gemma4:e2b."
  }
];

interface ProviderSelectorProps {
  selectedProviders: ProviderId[];
  onProvidersChange: (providers: ProviderId[]) => void;
}

export function ProviderSelector({ selectedProviders, onProvidersChange }: ProviderSelectorProps) {
  const toggleProvider = (provider: ProviderId) => {
    const isSelected = selectedProviders.includes(provider);
    onProvidersChange(isSelected ? selectedProviders.filter((item) => item !== provider) : [...selectedProviders, provider]);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Providers</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Select the models you want to compare side-by-side.
      </p>

      <div className="space-y-3">
        {providers.map((provider) => {
          const checked = selectedProviders.includes(provider.id);

          return (
            <label
              key={provider.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                checked
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleProvider(provider.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block font-medium text-slate-900 dark:text-white">{provider.name}</span>
                <span className="block text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {provider.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
