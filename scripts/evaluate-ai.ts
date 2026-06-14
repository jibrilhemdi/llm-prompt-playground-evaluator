import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import { buildGroundedPrompt, replaceVariables } from "../backend/src/evaluation.js";

dotenv.config();
dotenv.config({ path: ".env.keys" });
import { runProvider } from "../backend/src/llm/index.js";
import { ProviderId } from "../backend/src/types.js";

interface TestPrompt {
  name: string;
  prompt: string;
  variables?: Record<string, string>;
  keywords: string[];
  contextDocument?: string;
  ragEnabled?: boolean;
  expectedMinimumScore: number;
  providers: ProviderId[];
}

async function main(): Promise<void> {
  const prompts = JSON.parse(readFileSync(new URL("../test-prompts.json", import.meta.url), "utf8")) as TestPrompt[];
  const failures: string[] = [];

  for (const testPrompt of prompts) {
    const originalPrompt = replaceVariables(testPrompt.prompt, testPrompt.variables);
    const groundedPrompt = testPrompt.ragEnabled
      ? buildGroundedPrompt(originalPrompt, testPrompt.contextDocument)
      : originalPrompt;

    const results = await Promise.all(
      testPrompt.providers.map((provider) =>
        runProvider(provider, groundedPrompt, testPrompt.keywords, testPrompt.contextDocument)
      )
    );

    for (const result of results) {
      const passed = result.keywordScore >= testPrompt.expectedMinimumScore;
      const status = passed ? "PASS" : "FAIL";
      console.log(
        `[${status}] ${testPrompt.name} / ${result.provider}: keyword score ${result.keywordScore}% (threshold ${testPrompt.expectedMinimumScore}%)`
      );

      if (!passed) {
        failures.push(`${testPrompt.name} / ${result.provider} scored ${result.keywordScore}%`);
      }

      if (result.error) {
        failures.push(`${testPrompt.name} / ${result.provider} error: ${result.error}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error("\nAI evaluation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("\nAll AI evaluation checks passed.");
}

void main().catch((error) => {
  console.error("AI evaluation failed unexpectedly:");
  console.error(error);
  process.exit(1);
});
