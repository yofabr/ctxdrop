import type { ChatMessage } from "../../agents/types.js";
import type { AnalyzedFile, DirectoryAnalysis, ProjectAnalysis, SummaryStrategy } from "./types.js";

interface TechStack {
  runtime: string[];
  packageManager: string[];
  frameworks: string[];
  languages: string[];
}

function detectTechStack(analysis: ProjectAnalysis): TechStack {
  const tech: TechStack = {
    runtime: [],
    packageManager: [],
    frameworks: [],
    languages: [],
  };

  const allFiles = analysis.allFiles;

  for (const file of allFiles) {
    const name = file.name.toLowerCase();

    if (name === "bun.lockb" || name === "bun.lock") {
      tech.packageManager.push("Bun");
      tech.runtime.push("Bun");
    } else if (name === "pnpm-lock.yaml") {
      tech.packageManager.push("pnpm");
    } else if (name === "yarn.lock") {
      tech.packageManager.push("Yarn");
    } else if (name === "package-lock.json") {
      tech.packageManager.push("npm");
    }

    if (name === "deno.json" || name === "deno.jsonc") {
      tech.runtime.push("Deno");
    }

    if (name === "next.config.js" || name === "next.config.mjs" || name === "next.config.ts") {
      tech.frameworks.push("Next.js");
    } else if (name === "nuxt.config.js" || name === "nuxt.config.ts") {
      tech.frameworks.push("Nuxt");
    } else if (
      name === "astro.config.mjs" ||
      name === "astro.config.js" ||
      name === "astro.config.ts"
    ) {
      tech.frameworks.push("Astro");
    } else if (
      name === "vite.config.ts" ||
      name === "vite.config.js" ||
      name === "vite.config.mts"
    ) {
      tech.frameworks.push("Vite");
    } else if (name === "webpack.config.js" || name === "webpack.config.ts") {
      tech.frameworks.push("Webpack");
    } else if (name === "express" || name === "express.ts" || name.includes("express")) {
      tech.frameworks.push("Express");
    } else if (name === "fastify" || name.includes("fastify")) {
      tech.frameworks.push("Fastify");
    } else if (name === "hono" || name.includes("hono")) {
      tech.frameworks.push("Hono");
    } else if (name === "react" || name.includes("react")) {
      tech.frameworks.push("React");
    } else if (name === "vue" || name.includes("vue")) {
      tech.frameworks.push("Vue");
    } else if (name === "svelte" || name.includes("svelte")) {
      tech.frameworks.push("Svelte");
    } else if (name === "tsconfig.json") {
      if (!tech.languages.includes("TypeScript")) {
        tech.languages.push("TypeScript");
      }
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      if (!tech.languages.includes("TypeScript")) {
        tech.languages.push("TypeScript");
      }
    } else if (name.endsWith(".js") || name.endsWith(".jsx")) {
      if (!tech.languages.includes("JavaScript")) {
        tech.languages.push("JavaScript");
      }
    } else if (name.endsWith(".py")) {
      if (!tech.languages.includes("Python")) {
        tech.languages.push("Python");
      }
    } else if (name.endsWith(".go")) {
      if (!tech.languages.includes("Go")) {
        tech.languages.push("Go");
      }
    } else if (name.endsWith(".rs")) {
      if (!tech.languages.includes("Rust")) {
        tech.languages.push("Rust");
      }
    }
  }

  if (tech.runtime.length === 0 && tech.languages.includes("TypeScript")) {
    tech.runtime.push("Node.js");
  }

  return tech;
}

export function createSystemPrompt(): string {
  return `You are an expert software architect and code analyst. Your role is to analyze and summarize codebases for OTHER AI AGENTS that will use this summary to understand and work with the codebase.

CRITICAL: Your output will be used by another AI, so be thorough and specific!

When analyzing code:
1. Identify the project's purpose and architecture
2. Recognize key entry points and configuration files
3. Understand the directory structure and module organization
4. Note important dependencies and how they're used
5. Identify patterns, frameworks, and technologies used
6. DETERMINE THE EXACT RUNTIME (Bun, Node.js, Deno) - check for bun.lockb, bun.lock, deno.json, package-lock.json, pnpm-lock.yaml, yarn.lock
7. DETERMINE THE PACKAGE MANAGER (Bun, pnpm, Yarn, npm) - this is critical for reproduction
8. Identify the primary language(s) used

Tech Stack Detection Rules:
- If you see "bun.lockb" or "bun.lock" → Runtime is Bun, Package Manager is Bun
- If you see "pnpm-lock.yaml" → Package Manager is pnpm
- If you see "yarn.lock" → Package Manager is Yarn
- If you see "package-lock.json" → Package Manager is npm
- If you see "deno.json" or "deno.jsonc" → Runtime is Deno
- Check package.json "packageManager" field and "engines" field if available

Output Format for OTHER AIs:
- Use proper markdown headings (##, ###)
- Use bullet points for lists
- Use tables for structured data comparisons
- Use code blocks for file paths and code snippets
- Keep formatting clean and consistent

Your summary must enable another AI to:
- Run the project (know exact install/dev/build commands)
- Understand the architecture to make informed changes
- Find the right files to modify for specific features
- Understand dependencies and their purposes

ALWAYS include:
- Exact runtime (Bun/Node.js/Deno) - NEVER say "Node.js" when Bun is used!
- Exact package manager (Bun/pnpm/Yarn/npm)
- Available CLI commands (from package.json scripts)
- Entry points and main modules
- Key configuration files and what they control

Provide clear, concise summaries that help others understand the project quickly.`;
}

export function createProjectSummaryPrompt(analysis: ProjectAnalysis): string {
  const { totalFiles, totalDirectories, size, tree, allImportantFiles } = analysis;
  const techStack = detectTechStack(analysis);

  let prompt = "# Project Analysis\n\n";

  prompt += "## Project Overview\n";
  prompt += `- Total Files: ${totalFiles}\n`;
  prompt += `- Total Directories: ${totalDirectories}\n`;
  prompt += `- Project Size: ${size}\n\n`;

  if (techStack.languages.length > 0) {
    prompt += "## Technology Stack\n";
    if (techStack.runtime.length > 0) {
      prompt += `- **Runtime:** ${techStack.runtime.join(", ")}\n`;
    }
    if (techStack.packageManager.length > 0) {
      prompt += `- **Package Manager:** ${techStack.packageManager.join(", ")}\n`;
    }
    if (techStack.frameworks.length > 0) {
      prompt += `- **Frameworks:** ${techStack.frameworks.join(", ")}\n`;
    }
    prompt += `- **Languages:** ${techStack.languages.join(", ")}\n`;
    prompt += "\n";
  }

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
    prompt += "Keep your response concise - maximum 3 paragraphs. Do not include file contents.\n";
    prompt += "Use markdown headings (##) for sections and bullet points for lists.";
  } else if (strategy.aiSummaryStyle === "brief") {
    prompt +=
      "Based on the project structure and key files above, provide a comprehensive summary:\n";
    prompt += "1. Project purpose and functionality\n";
    prompt += "2. Architecture and code organization\n";
    prompt += "3. Key technologies, frameworks, and dependencies\n";
    prompt += "4. Entry points and main modules\n";
    prompt += "5. Configuration and important files\n\n";
    prompt += "Keep your response informative but focused - maximum 5 paragraphs.\n";
    prompt +=
      "Use markdown headings (##) for sections, bullet points for lists, and tables for structured data.";
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
      "Provide a thorough analysis that would help another developer understand this codebase quickly.\n";
    prompt +=
      "Use markdown headings (##, ###), bullet points, tables, and code blocks for clear formatting.";
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

export function createFileSelectionPrompt(analysis: ProjectAnalysis, maxFiles = 15): string {
  const { tree, allImportantFiles } = analysis;

  let prompt = "# File Selection\n\n";
  prompt +=
    "Analyze the project structure below and select the most important files that would help you understand this codebase.\n\n";
  prompt += "## Project Structure\n";
  prompt += "```\n";
  prompt += tree;
  prompt += "\n```\n\n";

  if (allImportantFiles.length > 0) {
    prompt += "## Available Important Files\n";
    for (const file of allImportantFiles) {
      prompt += `- ${file.relativePath}\n`;
    }
    prompt += "\n";
  }

  prompt += "## Your Task\n";
  prompt += `Select up to ${maxFiles} files that are most critical for understanding this project. `;
  prompt += "Focus on entry points, main modules, configuration files, and core functionality.\n\n";
  prompt += "Respond ONLY with a list of file paths, one per line. ";
  prompt += "No other text. Example:\n";
  prompt += "src/index.ts\n";
  prompt += "src/config.ts\n";
  prompt += "package.json\n";

  return prompt;
}

export function createFileSelectionMessages(analysis: ProjectAnalysis): ChatMessage[] {
  const messages: ChatMessage[] = [];

  const systemPrompt = createSystemPrompt();
  messages.push({ role: "system", content: systemPrompt });

  const selectionPrompt = createFileSelectionPrompt(analysis);
  messages.push({ role: "user", content: selectionPrompt });

  return messages;
}

export function parseFileSelection(aiResponse: string, availableFiles: string[]): string[] {
  const lines = aiResponse.split("\n");
  const selectedPaths: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cleanPath = trimmed
      .replace(/^[-•*`]\s*/, "")
      .replace(/\s*\(.*?\)\s*$/, "")
      .trim();

    if (
      cleanPath.includes("/") ||
      cleanPath.endsWith(".ts") ||
      cleanPath.endsWith(".js") ||
      cleanPath.endsWith(".json") ||
      cleanPath.endsWith(".md") ||
      cleanPath.endsWith(".yaml") ||
      cleanPath.endsWith(".yml") ||
      cleanPath.endsWith(".toml") ||
      cleanPath.endsWith(".py") ||
      cleanPath.endsWith(".go") ||
      cleanPath.endsWith(".rs") ||
      cleanPath.endsWith(".java")
    ) {
      if (availableFiles.some((f) => f.endsWith(cleanPath) || f.includes(cleanPath))) {
        const matchedFile = availableFiles.find((f) => f.endsWith(cleanPath) || f === cleanPath);
        if (matchedFile && !selectedPaths.includes(matchedFile)) {
          selectedPaths.push(matchedFile);
        }
      }
    }
  }

  return selectedPaths;
}

export function createSelectedFilesPrompt(files: AnalyzedFile[]): string {
  if (files.length === 0) {
    return "";
  }

  let prompt = "## Selected Files for Detailed Analysis\n\n";

  for (const file of files) {
    if (!file.content) continue;

    const maxContentLength = 20000;
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

export function createFinalSummaryPrompt(): string {
  let prompt = "\n## Final Summary\n";
  prompt +=
    "Based on the file contents above, provide a comprehensive summary that OTHER AI AGENTS can use to understand and work with this codebase.\n\n";
  prompt += "Your summary MUST include:\n";
  prompt += "1. **Project purpose** - What does this project do?\n";
  prompt += "2. **Runtime & Package Manager** - Bun, Node.js, Deno? Bun, pnpm, npm, Yarn?\n";
  prompt +=
    "3. **Architecture** - How is the code organized? (MVC, layered, clean architecture, etc.)\n";
  prompt += "4. **Key technologies** - All frameworks, libraries, and tools used\n";
  prompt +=
    "5. **Entry points** - Where does execution start? (main.ts, cli.ts, server.ts, etc.)\n";
  prompt += "6. **Configuration** - Key config files and what they control\n";
  prompt += "7. **Dependencies** - Important dependencies and their purposes\n";
  prompt += "8. **CLI commands** - Available npm/bun scripts (dev, build, start, etc.)\n\n";
  prompt += "Format your response so another AI can:\n";
  prompt += "- Understand the project structure without reading all files\n";
  prompt += "- Know exactly which commands to run (install, dev, build, test)\n";
  prompt += "- Understand the architecture to make informed changes\n";
  prompt += "- Identify the right files to modify for specific features\n\n";
  prompt += "Use markdown headings (##, ###), bullet points, tables, and code blocks.";

  return prompt;
}
