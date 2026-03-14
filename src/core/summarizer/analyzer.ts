import fs from "node:fs/promises";
import path from "node:path";
import { verbose } from "../../utils/logger.js";
import { shouldIgnore } from "../filter.js";
import { classifyFile, sortByPriority } from "./classifier.js";
import { type SummaryStrategy, determineProjectSize, getStrategy } from "./strategy.js";
import type {
  AnalyzedFile,
  DirectoryAnalysis,
  ProjectAnalysis,
  ProjectSize,
  SummarizeOptions,
} from "./types.js";

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
        analyzedFile.content = content.slice(0, 50000);
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
