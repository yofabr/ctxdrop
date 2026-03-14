import { createAgent } from "../../agents/index.js";
import type { ModelConfig } from "../../agents/types.js";
import { info, success } from "../../utils/logger.js";
import { analyzeProject, quickScan } from "./analyzer.js";
import {
  createDirectorySummaryPrompt,
  createFileSelectionMessages,
  createFinalSummaryPrompt,
  createProjectSummaryPrompt,
  createSelectedFilesPrompt,
  generateBriefContext,
  generateContextMessages,
  parseFileSelection,
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

  const useTwoPass = options?.twoPass ?? true;

  if (useTwoPass) {
    return summarizeWithTwoPass(rootPath, analysis, modelConfig, options);
  }

  info("Generating AI summary...");
  const agent = createAgent(modelConfig);

  const messages = generateContextMessages(analysis, strategy);

  const response = await agent.chat({
    messages,
    max_tokens: options?.maxTokens ?? 8192,
  });

  success("AI summary complete");

  return {
    summary: response.content,
    context: generateBriefContext(analysis, strategy),
  };
}

async function summarizeWithTwoPass(
  rootPath: string,
  analysis: ProjectAnalysis,
  modelConfig: ModelConfig,
  options?: SummarizeOptions,
): Promise<{ summary: string; context: string }> {
  const { analysis: fullAnalysis, strategy } = await analyzeProject(rootPath, {
    ...options,
    includeContents: true,
  });

  const agent = createAgent(modelConfig);

  const selectionMessages = createFileSelectionMessages(analysis);
  const selectionResponse = await agent.chat({
    messages: selectionMessages,
    max_tokens: 1024,
  });

  const availablePaths = analysis.allImportantFiles.map((f) => f.relativePath);
  const selectedPaths = parseFileSelection(selectionResponse.content, availablePaths);

  const selectedFiles = fullAnalysis.allFiles.filter((f) => selectedPaths.includes(f.relativePath));

  info(`Selected ${selectedPaths.length} important files`);

  const selectedFilesContent = selectedFiles.filter((f) => f.content);

  const projectSummary = createProjectSummaryPrompt(analysis);
  const selectedFilesPrompt = createSelectedFilesPrompt(selectedFilesContent);
  const finalPrompt = createFinalSummaryPrompt();

  const finalMessages: { role: "system" | "user"; content: string }[] = [];

  const { createSystemPrompt } = await import("./context.js");
  finalMessages.push({ role: "system", content: createSystemPrompt() });
  finalMessages.push({ role: "user", content: projectSummary });
  finalMessages.push({ role: "user", content: selectedFilesPrompt });
  finalMessages.push({ role: "user", content: finalPrompt });

  const response = await agent.chat({
    messages: finalMessages,
    max_tokens: options?.maxTokens ?? 8192,
  });

  success("AI summary complete");

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
