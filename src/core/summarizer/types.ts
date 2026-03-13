export type ProjectSize = "small" | "medium" | "large";

export type FileType = "entry" | "config" | "source" | "test" | "asset" | "documentation" | "other";

export interface FileClassification {
  type: FileType;
  priority: number;
  reason?: string;
}

export interface AnalyzedFile {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  classification: FileClassification;
  size: number;
  content?: string;
}

export interface DirectoryAnalysis {
  path: string;
  relativePath: string;
  name: string;
  fileCount: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  importantFiles: AnalyzedFile[];
  allFiles: AnalyzedFile[];
  subdirectories: string[];
  description?: string;
}

export interface ProjectAnalysis {
  rootPath: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  size: ProjectSize;
  tree: string;
  directories: DirectoryAnalysis[];
  allImportantFiles: AnalyzedFile[];
}

export interface SummaryStrategy {
  name: string;
  maxFilesToRead: number;
  maxFilesForAI: number;
  includeFileContents: boolean;
  includeDirectoryDescriptions: boolean;
  aiSummaryStyle: "detailed" | "brief" | "structure-only";
}

export interface SummarizeOptions {
  maxTokens?: number;
  style?: "detailed" | "brief" | "minimal";
  includeContents?: boolean;
}

export interface SummarizerResult {
  analysis: ProjectAnalysis;
  strategy: SummaryStrategy;
  summary: string;
}

export interface DirectoryContext {
  directory: DirectoryAnalysis;
  parentContext?: string;
  siblingContext?: string;
}
