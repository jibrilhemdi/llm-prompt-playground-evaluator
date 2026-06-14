import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
dotenv.config({ path: ".env.keys" });
import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import { z } from "zod";
import { deleteAllRuns, deleteRunById, getHistory, getRunById, saveRun } from "./database.js";
import { buildGroundedPrompt, replaceVariables } from "./evaluation.js";
import { runProvider } from "./llm/index.js";
import type { ProviderId, PlaygroundRequest } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const databaseUrl = process.env.DATABASE_URL ?? "./playground.db";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const providerSchema = z.enum(["gemini", "openrouter", "local"]);
const openRouterModelSchema = z.enum([
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nex-agi/nex-n2-pro:free"
]);
const playgroundSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required"),
  providers: z.array(providerSchema).min(1, "Select at least one provider"),
  keywords: z.array(z.string().trim()).max(10).default([]),
  contextDocument: z.string().trim().optional(),
  ragEnabled: z.boolean().default(false),
  variables: z.record(z.string()).default({}),
  brandName: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  localEndpoint: z.string().trim().url().optional(),
  localModel: z.string().trim().optional(),
  openRouterModel: openRouterModelSchema.optional()
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.post("/api/playground", upload.single("document"), async (req: Request, res: Response) => {
  try {
    const parsedRequest = parsePlaygroundRequest(req);
    const validationResult = playgroundSchema.safeParse(parsedRequest);

    if (!validationResult.success) {
      res.status(400).json({ error: validationResult.error.flatten() });
      return;
    }

    const request = validationResult.data;
    const originalPrompt = replaceVariables(request.prompt, request.variables);
    const promptForProviders = request.ragEnabled
      ? buildGroundedPrompt(originalPrompt, request.contextDocument)
      : originalPrompt;

    const startedAt = performance.now();
    const results = await Promise.all(
      request.providers.map((provider) =>
        runProvider(provider, promptForProviders, request.keywords, request.contextDocument, {
          localEndpoint: request.localEndpoint,
          localModel: request.localModel,
          openRouterModel: request.openRouterModel
        })
      )
    );
    const endedAt = performance.now();

    const runId = saveRun(
      new Date().toISOString(),
      originalPrompt,
      request.contextDocument?.trim() || null,
      request.brandName?.trim() || null,
      request.industry?.trim() || null,
      request.keywords,
      request.providers,
      results
    );

    res.json({
      runId,
      latencyMs: Math.max(0, Math.round(endedAt - startedAt)),
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/history", (_req: Request, res: Response) => {
  try {
    const limit = Number.parseInt(String(_req.query.limit ?? "10"), 10);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 10;
    res.json(getHistory(safeLimit));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load history";
    res.status(500).json({ error: message });
  }
});

app.delete("/api/history", (_req: Request, res: Response) => {
  try {
    res.json({ deleted: deleteAllRuns() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete history";
    res.status(500).json({ error: message });
  }
});

app.delete("/api/history/:id", (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);

    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid run id" });
      return;
    }

    const deleted = deleteRunById(id);
    if (deleted === 0) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete run";
    res.status(500).json({ error: message });
  }
});

app.get("/api/history/:id", (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);

    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid run id" });
      return;
    }

    const run = getRunById(id);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    res.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load run";
    res.status(500).json({ error: message });
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`LLM Prompt Playground API listening on http://localhost:${port}`);
});

function parsePlaygroundRequest(req: Request): PlaygroundRequest {
  if (req.is("multipart/form-data")) {
    const body = req.body as Record<string, string | string[] | undefined>;
    return {
      prompt: stringValue(body.prompt),
      providers: parseStringArray(body.providers) as ProviderId[],
      keywords: parseStringArray(body.keywords),
      contextDocument: stringValue(body.contextDocument) || undefined,
      ragEnabled: stringValue(body.ragEnabled) === "true",
      variables: parseVariables(body.variables),
      brandName: stringValue(body.brandName) || undefined,
      industry: stringValue(body.industry) || undefined,
      localEndpoint: stringValue(body.localEndpoint) || undefined,
      localModel: stringValue(body.localModel) || undefined,
      openRouterModel: stringValue(body.openRouterModel) || undefined
    };
  }

  return req.body as PlaygroundRequest;
}

function stringValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function parseStringArray(value: string | string[] | undefined): string[] {
  const raw = stringValue(value);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function parseVariables(value: string | string[] | undefined): Record<string, string> {
  const raw = stringValue(value);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed).map(([key, entry]) => [key, String(entry)]))
      : {};
  } catch {
    return {};
  }
}

void databaseUrl;
void path;
