import fs from "node:fs/promises";
import path from "node:path";
import { verbose } from "../../utils/logger.js";
import { shouldIgnore } from "../filter.js";
import { classifyFile, sortByPriority } from "./classifier.js";
import { type SummaryStrategy, determineProjectSize, getStrategy } from "./strategy.js";
import type {
  AnalyzedFile,
  CodeStructure,
  DirectoryAnalysis,
  ProjectAnalysis,
  ProjectSize,
  SummarizeOptions,
} from "./types.js";

const STRUCTURE_PATTERNS: { type: CodeStructure["type"]; patterns: RegExp[] }[] = [
  {
    type: "function",
    patterns: [
      /^function\s+(\w+)/gm,
      /^(?:export\s+)?async\s+function\s+(\w+)/gm,
      /^(?:export\s+)?function\s+(\w+)/gm,
    ],
  },
  {
    type: "class",
    patterns: [/^(?:export\s+)?class\s+(\w+)/gm],
  },
  {
    type: "interface",
    patterns: [/^(?:export\s+)?interface\s+(\w+)/gm],
  },
  {
    type: "type",
    patterns: [/^(?:export\s+)?type\s+(\w+)/gm],
  },
  {
    type: "const",
    patterns: [/^(?:export\s+)?const\s+(\w+)\s*=/gm],
  },
  {
    type: "export",
    patterns: [
      /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/gm,
    ],
  },
];

export function detectCodeStructure(content: string): CodeStructure[] {
  const structures: CodeStructure[] = [];

  for (const { type, patterns } of STRUCTURE_PATTERNS) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null = regex.exec(content);
      while (match !== null) {
        const name = match[1];
        if (name) {
          const beforeMatch = content.substring(0, match.index);
          const startLine = beforeMatch.split("\n").length;

          let endLine = startLine;
          const braceStart = content.indexOf("{", match.index);
          if (braceStart !== -1) {
            let braceCount = 0;
            for (let i = braceStart; i < content.length; i++) {
              if (content[i] === "{") braceCount++;
              if (content[i] === "}") braceCount--;
              if (braceCount === 0) {
                endLine = content.substring(0, i).split("\n").length;
                break;
              }
            }
          }

          const existing = structures.find((s) => s.name === name && s.start === startLine);
          if (!existing) {
            structures.push({ type, name, start: startLine, end: endLine });
          }
        }
        match = regex.exec(content);
      }
    }
  }

  return structures.sort((a, b) => a.start - b.start);
}

export async function analyzeProject(
  rootPath: string,
  options?: SummarizeOptions,
): Promise<{ analysis: ProjectAnalysis; strategy: SummaryStrategy }> {
  const resolvedPath = path.resolve(rootPath);

  const { files, directories } = await scanAll(resolvedPath);

  const size = determineProjectSize(files.length);
  const strategy = getStrategy(size, { style: options?.style });

  const analyzedFiles = await analyzeFiles(
    files,
    resolvedPath,
    strategy,
    options?.includeContents ?? false,
  );

  const analyzedDirectories = await analyzeDirectories(directories, resolvedPath, strategy);

  const allImportantFiles = analyzedFiles
    .filter((f) => f.classification.priority <= 2)
    .sort((a, b) => a.classification.priority - b.classification.priority);

  const allFiles = analyzedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const tree = buildFileTree(analyzedDirectories, analyzedFiles);

  const totalSize = analyzedFiles.reduce((sum, f) => sum + f.size, 0);

  const analysis: ProjectAnalysis = {
    rootPath: resolvedPath,
    totalFiles: files.length,
    totalDirectories: directories.length,
    totalSize,
    size,
    tree,
    directories: analyzedDirectories,
    allImportantFiles,
    allFiles,
  };

  return { analysis, strategy };
}

interface ScannedEntry {
  path: string;
  relativePath: string;
  isDirectory: boolean;
}

async function scanAll(rootPath: string): Promise<{
  files: ScannedEntry[];
  directories: ScannedEntry[];
}> {
  const files: ScannedEntry[] = [];
  const directories: ScannedEntry[] = [];

  await walkDirectory(rootPath, rootPath, files, directories);

  return { files, directories };
}

async function walkDirectory(
  rootPath: string,
  currentPath: string,
  files: ScannedEntry[],
  directories: ScannedEntry[],
): Promise<void> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (shouldIgnore(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      directories.push({
        path: fullPath,
        relativePath,
        isDirectory: true,
      });
      await walkDirectory(rootPath, fullPath, files, directories);
    } else if (entry.isFile()) {
      files.push({
        path: fullPath,
        relativePath,
        isDirectory: false,
      });
    }
  }
}

async function analyzeFiles(
  scannedFiles: ScannedEntry[],
  _rootPath: string,
  strategy: SummaryStrategy,
  includeContents: boolean,
): Promise<AnalyzedFile[]> {
  const analyzed: AnalyzedFile[] = [];

  const sortedFiles = [...scannedFiles].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath),
  );

  const filesToRead = Math.min(sortedFiles.length, strategy.maxFilesToRead);

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    const fileName = path.basename(file.path);
    const extension = path.extname(file.path);

    const stat = await fs.stat(file.path);
    const size = stat.size;

    const classification = classifyFile(file.relativePath, fileName, extension);

    const analyzedFile: AnalyzedFile = {
      path: file.path,
      relativePath: file.relativePath,
      name: fileName,
      extension,
      classification,
      size,
    };

    if (includeContents && i < filesToRead) {
      try {
        verbose(`Reading file: ${file.relativePath}`);
        const content = await fs.readFile(file.path, "utf-8");
        const truncatedContent = content.slice(0, 50000);
        analyzedFile.content = truncatedContent;
        analyzedFile.structures = detectCodeStructure(truncatedContent);
      } catch {
        analyzedFile.content = undefined;
      }
    }

    analyzed.push(analyzedFile);
  }

  return analyzed;
}

async function analyzeDirectories(
  scannedDirs: ScannedEntry[],
  rootPath: string,
  _strategy: SummaryStrategy,
): Promise<DirectoryAnalysis[]> {
  const analyses: DirectoryAnalysis[] = [];

  for (const dir of scannedDirs) {
    const entries = await fs.readdir(dir.path, { withFileTypes: true });
    const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);

    const fileTypes: Record<string, number> = {};
    for (const name of fileNames) {
      const ext = path.extname(name) || "no-extension";
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    }

    const subdirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    const importantFiles: AnalyzedFile[] = [];
    const allFiles: AnalyzedFile[] = [];

    for (const fileName of fileNames) {
      const filePath = path.join(dir.path, fileName);
      const relativePath = path.relative(rootPath, filePath);
      const extension = path.extname(fileName);
      const stat = await fs.stat(filePath);

      const classification = classifyFile(relativePath, fileName, extension);

      const analyzedFile: AnalyzedFile = {
        path: filePath,
        relativePath,
        name: fileName,
        extension,
        classification,
        size: stat.size,
      };

      allFiles.push(analyzedFile);

      if (classification.priority <= 3) {
        importantFiles.push(analyzedFile);
      }
    }

    analyses.push({
      path: dir.path,
      relativePath: dir.relativePath,
      name: path.basename(dir.path),
      fileCount: fileNames.length,
      totalSize: allFiles.reduce((sum, f) => sum + f.size, 0),
      fileTypes,
      importantFiles: sortByPriority(importantFiles),
      allFiles: sortByPriority(allFiles),
      subdirectories: subdirs,
    });
  }

  return analyses.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function buildFileTree(directories: DirectoryAnalysis[], files: AnalyzedFile[]): string {
  const rootName =
    directories.length > 0
      ? directories[0].relativePath === "."
        ? "Project"
        : path.basename(directories[0].path)
      : "Project";
  const lines: string[] = [`${rootName}/`];

  const rootFiles = files.filter((f) => !f.relativePath.includes("/"));
  const rootDirs = directories.filter((d) => !d.relativePath.includes("/"));

  for (const file of rootFiles.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`  📄 ${file.name}`);
  }

  for (const dir of rootDirs.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`  📁 ${dir.name}/`);
    lines.push(...buildDirectoryTree(dir, directories, files, "    "));
  }

  return lines.join("\n");
}

function buildDirectoryTree(
  parentDir: DirectoryAnalysis,
  allDirs: DirectoryAnalysis[],
  allFiles: AnalyzedFile[],
  indent: string,
): string[] {
  const lines: string[] = [];

  const childDirs = allDirs.filter((d) => path.dirname(d.relativePath) === parentDir.relativePath);

  const childFiles = allFiles.filter(
    (f) => path.dirname(f.relativePath) === parentDir.relativePath,
  );

  for (const file of childFiles.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`${indent}📄 ${file.name}`);
  }

  for (const dir of childDirs.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`${indent}📁 ${dir.name}/`);
    lines.push(...buildDirectoryTree(dir, allDirs, allFiles, `${indent}  `));
  }

  return lines;
}

export async function quickScan(rootPath: string): Promise<{
  totalFiles: number;
  totalDirectories: number;
  size: ProjectSize;
}> {
  const resolvedPath = path.resolve(rootPath);
  const { files, directories } = await scanAll(resolvedPath);

  return {
    totalFiles: files.length,
    totalDirectories: directories.length,
    size: determineProjectSize(files.length),
  };
}
