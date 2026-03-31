export type { IgnorePattern } from "../constants/ignore-patterns";

export type {
  FileInfo,
  DirectoryFiles,
  ScanOptions,
} from "../core/scanner";

export type {
  ModelConfig,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
  AgentRequest,
  AgentResponse,
  ProviderType,
  Provider,
} from "../agents/types";

export type {
  ProjectSize,
  FileType,
  FileClassification,
  AnalyzedFile,
  DirectoryAnalysis,
  ProjectAnalysis,
  SummaryStrategy,
  SummarizeOptions,
  SummarizerResult,
  DirectoryContext,
} from "../core/summarizer/types";

export type { ValidationError, ConfigValidationResult } from "../utils/config";

export { DEFAULT_IGNORE_PATTERNS } from "../constants/ignore-patterns";

export { shouldIgnore, loadIgnorePatterns, getDefaultIgnorePatterns } from "../core/filter";

export { scanDirectory, listFilesByDirectory, formatAsTree } from "../core/scanner";

export { createAgent } from "../agents/agent";

export {
  summarizeProject,
  summarizeWithAI,
  streamSummaryWithAI,
  analyzeProject,
  quickScan,
  detectCodeStructure,
  createProjectSummaryPrompt,
  createDirectorySummaryPrompt,
  generateContextMessages,
  generateBriefContext,
  determineProjectSize,
  getStrategy,
  SIZE_THRESHOLDS,
} from "../core/summarizer";
