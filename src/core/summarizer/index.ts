import { createAgent } from "../../agents/index.js";
import type { ModelConfig } from "../../agents/types.js";
import { analyzeProject, quickScan } from "./analyzer.js";
import {
  createDirectorySummaryPrompt,
  createProjectSummaryPrompt,
  generateBriefContext,
  generateContextMessages,
} from "./context.js";
import { SIZE_THRESHOLDS, determineProjectSize, getStrategy } from "./strategy.js";
import type {
  AnalyzedFile,
  DirectoryAnalysis,
  ProjectAnalysis,
  ProjectSize,
  SummarizeOptions,
  SummarizerResult,
  SummaryStrategy,
} from "./types.js";

export async function summarizeProject(
  rootPath: string,
  options?: SummarizeOptions,
): Promise<SummarizerResult> {
  const { analysis, strategy } = await analyzeProject(rootPath, options);

  let summary = "";

  if (options?.style && options.style !== "minimal") {
    summary = generateBriefContext(analysis, strategy);
  }

  return {
    analysis,
    strategy,
    summary,
  };
}

export async function summarizeWithAI(
  rootPath: string,
  modelConfig: ModelConfig,
  options?: SummarizeOptions,
): Promise<{ summary: string; context: string }> {
  const { analysis, strategy } = await analyzeProject(rootPath, options);

  const agent = createAgent(modelConfig);

  const messages = generateContextMessages(analysis, strategy);

  const response = await agent.chat({
    messages,
    max_tokens: options?.maxTokens ?? 8192,
  });

  return {
    summary: response.content,
    context: generateBriefContext(analysis, strategy),
  };
}

export async function* streamSummaryWithAI(
  rootPath: string,
  modelConfig: ModelConfig,
  options?: SummarizeOptions,
): AsyncGenerator<{ type: "context" | "summary"; content: string }> {
  const { analysis, strategy } = await analyzeProject(rootPath, options);

  yield {
    type: "context",
    content: generateBriefContext(analysis, strategy),
  };

  const agent = createAgent(modelConfig);

  const messages = generateContextMessages(analysis, strategy);

  let fullContent = "";
  await agent.chatStream({ messages }, (chunk: string) => {
    fullContent += chunk;
  });

  yield {
    type: "summary",
    content: fullContent,
  };
}

export {
  analyzeProject,
  quickScan,
  createProjectSummaryPrompt,
  createDirectorySummaryPrompt,
  generateContextMessages,
  generateBriefContext,
  determineProjectSize,
  getStrategy,
  SIZE_THRESHOLDS,
};

export type {
  AnalyzedFile,
  DirectoryAnalysis,
  ProjectAnalysis,
  ProjectSize,
  SummarizeOptions,
  SummarizerResult,
  SummaryStrategy,
};
