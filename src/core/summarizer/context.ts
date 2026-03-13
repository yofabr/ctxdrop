import type { ChatMessage } from "../../agents/types.js";
import type { AnalyzedFile, DirectoryAnalysis, ProjectAnalysis, SummaryStrategy } from "./types.js";

export function createSystemPrompt(): string {
  return `You are an expert software architect and code analyst. Your role is to analyze and summarize codebases for other AI agents and developers.

When analyzing code:
1. Identify the project's purpose and architecture
2. Recognize key entry points and configuration files
3. Understand the directory structure and module organization
4. Note important dependencies and how they're used
5. Identify patterns, frameworks, and technologies used

Provide clear, concise summaries that help others understand the project quickly.`;
}

export function createProjectSummaryPrompt(analysis: ProjectAnalysis): string {
  const { totalFiles, totalDirectories, size, tree, allImportantFiles } = analysis;

  let prompt = "# Project Analysis\n\n";

  prompt += "## Project Overview\n";
  prompt += `- Total Files: ${totalFiles}\n`;
  prompt += `- Total Directories: ${totalDirectories}\n`;
  prompt += `- Project Size: ${size}\n\n`;

  prompt += "## Project Structure\n";
  prompt += "```\n";
  prompt += tree;
  prompt += "\n```\n\n";

  if (allImportantFiles.length > 0) {
    prompt += "## Key Files\n";
    for (const file of allImportantFiles.slice(0, 20)) {
      prompt += `- \`${file.relativePath}\` (${file.classification.type})\n`;
    }
    prompt += "\n";
  }

  return prompt;
}

export function createDirectorySummaryPrompt(dir: DirectoryAnalysis): string {
  let prompt = `### Directory: ${dir.relativePath || "root"}\n`;

  prompt += `**Files:** ${dir.fileCount}\n`;

  if (Object.keys(dir.fileTypes).length > 0) {
    prompt += `**File Types:** ${Object.entries(dir.fileTypes)
      .map(([ext, count]) => `${ext}: ${count}`)
      .join(", ")}\n`;
  }

  if (dir.subdirectories.length > 0) {
    prompt += `**Subdirectories:** ${dir.subdirectories.join(", ")}\n`;
  }

  if (dir.importantFiles.length > 0) {
    prompt += "**Important Files:**\n";
    for (const file of dir.importantFiles.slice(0, 5)) {
      prompt += `  - ${file.name} (${file.classification.type})\n`;
    }
  }

  return prompt;
}

export function createDirectoriesPrompt(directories: DirectoryAnalysis[]): string {
  if (directories.length === 0) {
    return "";
  }

  let prompt = "## Directory Breakdown\n\n";

  for (const dir of directories) {
    prompt += createDirectorySummaryPrompt(dir);
    prompt += "\n";
  }

  return prompt;
}

export function createFileContentsPrompt(files: AnalyzedFile[], maxFiles: number): string {
  if (files.length === 0 || maxFiles <= 0) {
    return "";
  }

  const importantFiles = files
    .filter((f) => f.classification.priority <= 3 && f.content)
    .slice(0, maxFiles);

  if (importantFiles.length === 0) {
    return "";
  }

  let prompt = "## Key File Contents\n\n";

  for (const file of importantFiles) {
    if (!file.content) continue;

    const maxContentLength = 15000;
    const truncatedContent =
      file.content.length > maxContentLength
        ? `${file.content.slice(0, maxContentLength)}\n... [truncated]`
        : file.content;

    prompt += `### ${file.relativePath}\n`;
    prompt += `\`\`\`${getLanguageFromExt(file.extension)}\n`;
    prompt += truncatedContent;
    prompt += "\n```\n\n";
  }

  return prompt;
}

export function generateContextMessages(
  analysis: ProjectAnalysis,
  strategy: SummaryStrategy,
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  const systemPrompt = createSystemPrompt();
  messages.push({ role: "system", content: systemPrompt });

  const projectSummary = createProjectSummaryPrompt(analysis);
  messages.push({ role: "user", content: projectSummary });

  if (strategy.includeDirectoryDescriptions) {
    const directoriesPrompt = createDirectoriesPrompt(analysis.directories);
    if (directoriesPrompt) {
      messages.push({ role: "user", content: directoriesPrompt });
    }
  }

  if (strategy.includeFileContents) {
    const filesPrompt = createFileContentsPrompt(
      analysis.allImportantFiles,
      strategy.maxFilesForAI,
    );
    if (filesPrompt) {
      messages.push({ role: "user", content: filesPrompt });
    }
  }

  const instructionPrompt = createInstructionPrompt(analysis, strategy);
  messages.push({ role: "user", content: instructionPrompt });

  return messages;
}

function createInstructionPrompt(_analysis: ProjectAnalysis, strategy: SummaryStrategy): string {
  let prompt = "\n## Your Task\n";

  if (strategy.aiSummaryStyle === "structure-only") {
    prompt += "Based on the project structure above, provide a brief summary of:\n";
    prompt += "1. What this project appears to do\n";
    prompt += "2. The main technologies/frameworks used\n";
    prompt += "3. The key entry points and configuration files\n\n";
    prompt += "Keep your response concise - maximum 3 paragraphs. Do not include file contents.";
  } else if (strategy.aiSummaryStyle === "brief") {
    prompt +=
      "Based on the project structure and key files above, provide a comprehensive summary:\n";
    prompt += "1. Project purpose and functionality\n";
    prompt += "2. Architecture and code organization\n";
    prompt += "3. Key technologies, frameworks, and dependencies\n";
    prompt += "4. Entry points and main modules\n";
    prompt += "5. Configuration and important files\n\n";
    prompt += "Keep your response informative but focused - maximum 5 paragraphs.";
  } else {
    prompt += "Based on the complete project analysis above, provide a detailed summary:\n";
    prompt += "1. Project purpose and functionality\n";
    prompt += "2. Architecture pattern and code organization\n";
    prompt += "3. All technologies, frameworks, and key dependencies\n";
    prompt += "4. Entry points and main modules\n";
    prompt += "5. Configuration files and their purposes\n";
    prompt += "6. Directory structure explanation\n";
    prompt += "7. Build/development commands and scripts\n\n";
    prompt +=
      "Provide a thorough analysis that would help another developer understand this codebase quickly.";
  }

  return prompt;
}

function getLanguageFromExt(extension: string): string {
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".md": "markdown",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".css": "css",
    ".scss": "scss",
    ".html": "html",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".sh": "bash",
    ".sql": "sql",
  };

  return map[extension.toLowerCase()] || "text";
}

export function generateBriefContext(analysis: ProjectAnalysis, strategy: SummaryStrategy): string {
  const messages = generateContextMessages(analysis, strategy);

  const briefMessages = messages.slice(0, -1);

  return briefMessages.map((m) => m.content).join("\n\n");
}
