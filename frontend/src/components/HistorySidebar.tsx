import { type KeyboardEvent } from "react";
import { RunRecord } from "../types.js";
import { formatTime, providerLabel } from "../lib/api.js";

interface HistorySidebarProps {
  history: RunRecord[];
  selectedRunId?: number;
  onSelectRun: (run: RunRecord) => void;
  onDeleteRun: (runId: number) => void;
  onDeleteAll: () => void;
}

export function HistorySidebar({ history, selectedRunId, onSelectRun, onDeleteRun, onDeleteAll }: HistorySidebarProps) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">History</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Last 10 prompt runs</p>
        </div>
        <button
          type="button"
          disabled={history.length === 0}
          onClick={onDeleteAll}
          className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
            history.length === 0
              ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
              : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950"
          }`}
        >
          Clear all
        </button>
      </div>

      {history.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          No runs yet. Run a prompt to build evaluation history.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((run) => {
            const averageScore =
              run.responses.length === 0
                ? 0
                : Math.round(run.responses.reduce((sum, response) => sum + response.keyword_score, 0) / run.responses.length);

            return (
              <div
                key={run.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRun(run)}
                onKeyDown={(event) => handleRunKeyDown(event, run)}
                className={`relative rounded-xl border p-3 text-left transition hover:border-indigo-400 ${
                  selectedRunId === run.id
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                    : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">#{run.id}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(run.timestamp)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-900 dark:text-white">{run.prompt}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteRun(run.id);
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:text-rose-300 dark:hover:bg-rose-950"
                    aria-label={`Delete run #${run.id}`}
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                    {run.providers.map(providerLabel).join(", ")}
                  </span>
                  {(run.brand_name || run.industry) && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900">
                      {[run.brand_name, run.industry].filter(Boolean).join(" • ")}
                    </span>
                  )}
                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
                    Avg {averageScore}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function handleRunKeyDown(event: KeyboardEvent<HTMLDivElement>, run: RunRecord) {
  if (event.currentTarget !== event.target) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.currentTarget.click();
  }
}
