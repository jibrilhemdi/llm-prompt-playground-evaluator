import Database from "better-sqlite3";
import { ResponseRecord, RunRecord, RunWithResponses, ProviderId, ProviderResult } from "./types.js";

let db: Database.Database | null = null;

export function getDatabase(databaseUrl: string): Database.Database {
  if (!db) {
    db = new Database(databaseUrl);
    db.pragma("journal_mode = WAL");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      prompt TEXT NOT NULL,
      context_document TEXT,
      brand_name TEXT,
      industry TEXT,
      keywords TEXT NOT NULL,
      providers TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      response_text TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      token_count INTEGER NOT NULL,
      keyword_score INTEGER NOT NULL,
      sentiment_score REAL NOT NULL,
      sentiment_label TEXT NOT NULL,
      toxicity_flag INTEGER NOT NULL,
      factual_consistency_score INTEGER,
      error TEXT,
      FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_runs_timestamp ON runs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_responses_run_id ON responses(run_id);
  `);

  addColumnIfMissing(database, "runs", "brand_name", "TEXT");
  addColumnIfMissing(database, "runs", "industry", "TEXT");
}

export function saveRun(
  timestamp: string,
  prompt: string,
  contextDocument: string | null,
  brandName: string | null,
  industry: string | null,
  keywords: string[],
  providers: ProviderId[],
  results: ProviderResult[]
): number {
  const database = getDatabase(process.env.DATABASE_URL ?? "./playground.db");
  const insertRun = database.prepare(`
    INSERT INTO runs (timestamp, prompt, context_document, brand_name, industry, keywords, providers)
    VALUES (@timestamp, @prompt, @contextDocument, @brandName, @industry, @keywords, @providers)
  `);

  const result = insertRun.run({
    timestamp,
    prompt,
    contextDocument,
    brandName,
    industry,
    keywords: JSON.stringify(keywords),
    providers: JSON.stringify(providers)
  });

  const runId = Number(result.lastInsertRowid);
  const insertResponse = database.prepare(`
    INSERT INTO responses (
      run_id, provider, response_text, latency_ms, token_count, keyword_score,
      sentiment_score, sentiment_label, toxicity_flag, factual_consistency_score, error
    ) VALUES (
      @runId, @provider, @responseText, @latencyMs, @tokenCount, @keywordScore,
      @sentimentScore, @sentimentLabel, @toxicityFlag, @factualConsistencyScore, @error
    )
  `);

  for (const response of results) {
    insertResponse.run({
      runId,
      provider: response.provider,
      responseText: response.responseText,
      latencyMs: response.latencyMs,
      tokenCount: response.tokenCount,
      keywordScore: response.keywordScore,
      sentimentScore: response.sentiment.score,
      sentimentLabel: response.sentiment.label,
      toxicityFlag: response.toxicityFlag ? 1 : 0,
      factualConsistencyScore: response.factualConsistencyScore,
      error: response.error ?? null
    });
  }

  return runId;
}

export function getHistory(limit = 10): RunWithResponses[] {
  const database = getDatabase(process.env.DATABASE_URL ?? "./playground.db");
  const rows = database
    .prepare(
      `
      SELECT * FROM runs
      ORDER BY timestamp DESC
      LIMIT ?
    `
    )
    .all(limit) as RunRecord[];

  return rows.map((row) => ({
    ...row,
    keywords: parseJsonArray(row.keywords),
    providers: parseJsonArray(row.providers) as ProviderId[],
    responses: getResponsesForRun(row.id)
  }));
}

export function getRunById(id: number): RunWithResponses | null {
  const database = getDatabase(process.env.DATABASE_URL ?? "./playground.db");
  const row = database.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRecord | undefined;

  if (!row) {
    return null;
  }

  return {
    ...row,
    keywords: parseJsonArray(row.keywords),
    providers: parseJsonArray(row.providers) as ProviderId[],
    responses: getResponsesForRun(row.id)
  };
}

export function deleteRunById(id: number): number {
  const database = getDatabase(process.env.DATABASE_URL ?? "./playground.db");
  const result = database.prepare("DELETE FROM runs WHERE id = ?").run(id);
  return result.changes;
}

export function deleteAllRuns(): number {
  const database = getDatabase(process.env.DATABASE_URL ?? "./playground.db");
  const result = database.prepare("DELETE FROM runs").run();
  return result.changes;
}

function getResponsesForRun(runId: number): ResponseRecord[] {
  const database = getDatabase(process.env.DATABASE_URL ?? "./playground.db");
  return database
    .prepare("SELECT * FROM responses WHERE run_id = ? ORDER BY id ASC")
    .all(runId) as ResponseRecord[];
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function addColumnIfMissing(database: Database.Database, tableName: string, columnName: string, columnDefinition: string): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    database.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`).run();
  }
}
