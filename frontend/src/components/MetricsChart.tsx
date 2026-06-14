import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { providerLabel } from "../lib/api.js";
import { ProviderId, RunRecord } from "../types.js";

interface MetricsChartProps {
  history: RunRecord[];
}

interface ChartDatum {
  timestamp: string;
  gemini?: number;
  openrouter?: number;
  local?: number;
}

const providerColors: Record<ProviderId, string> = {
  gemini: "#2563eb",
  openrouter: "#8b5cf6",
  local: "#10b981"
};

const chartedProviders = new Set(Object.keys(providerColors) as ProviderId[]);

export function MetricsChart({ history }: MetricsChartProps) {
  const data = buildChartData(history);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Keyword Match Trend</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Average keyword match score per provider over recent runs.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          Run prompts to populate the evaluation chart.
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {(Object.keys(providerColors) as ProviderId[]).map((provider) => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={provider}
                  name={providerLabel(provider)}
                  stroke={providerColors[provider]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function buildChartData(history: RunRecord[]): ChartDatum[] {
  return history
    .slice()
    .reverse()
    .map((run) => {
      const datum: ChartDatum = {
        timestamp: new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(run.timestamp))
      };

      for (const response of run.responses) {
        if (chartedProviders.has(response.provider as ProviderId)) {
          datum[response.provider as ProviderId] = response.keyword_score;
        }
      }

      return datum;
    });
}
