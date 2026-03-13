import { readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { IgnorePattern } from "../constants/ignore-patterns";
import { shouldIgnore } from "./filter";

// File metadata structure
export interface FileInfo {
  path: string;
  relativePath: string;
  content?: string;
}

// File grouped by directory
export interface DirectoryFiles {
  [directory: string]: Omit<FileInfo, "directory">[];
}

// Scanner options
export interface ScanOptions {
  ignorePatterns?: IgnorePattern[];
  includeContent?: boolean;
}

// Main entry: recursively scan directory
export async function scanDirectory(
  dirPath: string,
  options: ScanOptions = {},
): Promise<FileInfo[]> {
  const { ignorePatterns, includeContent = false } = options;
  const files: FileInfo[] = [];

  await walkDirectory(dirPath, dirPath, files, ignorePatterns, includeContent);

  return files;
}

// Helper: list files grouped by directory
export async function listFilesByDirectory(
  dirPath: string,
  options: ScanOptions = {},
): Promise<DirectoryFiles> {
  const files = await scanDirectory(dirPath, options);
  const grouped: DirectoryFiles = {};

  for (const file of files) {
    const directory = dirname(file.relativePath) || ".";
    if (!grouped[directory]) {
      grouped[directory] = [];
    }
    grouped[directory].push({
      path: file.path,
      relativePath: file.relativePath,
      content: file.content,
    });
  }

  return grouped;
}

// Convert directory files structure to tree string
export function formatAsTree(directoryFiles: DirectoryFiles): string {
  const rootNameStr = "Project/";

  const directories = Object.keys(directoryFiles)
    .filter((d) => d !== ".")
    .sort();
  const rootFiles = directoryFiles["."] || [];

  const dirContents: Record<string, { dirs: Set<string>; files: Set<string> }> = {};

  for (const dir of directories) {
    const parts = dir.split("/");
    for (let i = 0; i < parts.length; i++) {
      const currentPath = parts.slice(0, i + 1).join("/");
      if (!dirContents[currentPath]) {
        dirContents[currentPath] = { dirs: new Set(), files: new Set() };
      }
      if (i < parts.length - 1) {
        dirContents[currentPath].dirs.add(parts[i + 1]);
      }
    }
    for (const file of directoryFiles[dir]) {
      const fileName = file.relativePath.split("/").pop() || "";
      if (!dirContents[dir]) {
        dirContents[dir] = { dirs: new Set(), files: new Set() };
      }
      dirContents[dir].files.add(fileName);
    }
  }

  if (!dirContents["."]) {
    dirContents["."] = { dirs: new Set(), files: new Set() };
  }
  for (const file of rootFiles) {
    const fileName = file.relativePath.split("/").pop() || "";
    dirContents["."].files.add(fileName);
  }
  for (const dir of directories) {
    const parts = dir.split("/");
    if (parts.length === 1) {
      dirContents["."].dirs.add(parts[0]);
    }
  }

  function buildTree(currentPath: string, prefix = "", isLast = true, isRoot = true): string[] {
    const lines: string[] = [];
    const contents = dirContents[currentPath];
    let prefixForChildren = prefix;

    if (!isRoot && currentPath) {
      const dirName = currentPath.split("/").pop() || currentPath;
      lines.push(`${prefix}${isLast ? "└── " : "├── "}${dirName}/`);
      prefixForChildren = prefix + (isLast ? "    " : "│   ");
    }

    if (!contents) {
      return lines;
    }

    const sortedDirs = Array.from(contents.dirs).sort();
    const sortedFiles = Array.from(contents.files).sort();

    for (let i = 0; i < sortedDirs.length; i++) {
      const isLastDir = i === sortedDirs.length - 1 && sortedFiles.length === 0;
      const nextPath = currentPath === "." ? sortedDirs[i] : `${currentPath}/${sortedDirs[i]}`;
      lines.push(...buildTree(nextPath, prefixForChildren, isLastDir, false));
    }

    for (let i = 0; i < sortedFiles.length; i++) {
      const isLastFile = i === sortedFiles.length - 1;
      lines.push(`${prefixForChildren}${isLastFile ? "└── " : "├── "}${sortedFiles[i]}`);
    }

    return lines;
  }

  return [rootNameStr, ...buildTree(".")].join("\n");
}

// Internal: recursive directory walker
async function walkDirectory(
  rootPath: string,
  currentPath: string,
  files: FileInfo[],
  ignorePatterns?: IgnorePattern[],
  includeContent?: boolean,
): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);
    const relativePath = relative(rootPath, fullPath);

    // Skip ignored files/directories
    if (shouldIgnore(relativePath, ignorePatterns)) {
      continue;
    }

    // Recurse into directories
    if (entry.isDirectory()) {
      await walkDirectory(rootPath, fullPath, files, ignorePatterns, includeContent);
    } else if (entry.isFile()) {
      const fileInfo: FileInfo = {
        path: fullPath,
        relativePath,
      };

      // Optionally read file content
      if (includeContent) {
        const { readFile } = await import("node:fs/promises");
        fileInfo.content = await readFile(fullPath, "utf-8");
      }

      files.push(fileInfo);
    }
  }
}
