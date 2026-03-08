import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { shouldIgnore, type IgnorePattern } from "./filter";

// File metadata structure
export interface FileInfo {
  path: string;
  relativePath: string;
  content?: string;
}

// Scanner options
export interface ScanOptions {
  ignorePatterns?: IgnorePattern[];
  includeContent?: boolean;
}

// Main entry: recursively scan directory
export async function scanDirectory(
  dirPath: string,
  options: ScanOptions = {}
): Promise<FileInfo[]> {
  const { ignorePatterns, includeContent = false } = options;
  const files: FileInfo[] = [];

  await walkDirectory(dirPath, dirPath, files, ignorePatterns, includeContent);

  return files;
}

// Internal: recursive directory walker
async function walkDirectory(
  rootPath: string,
  currentPath: string,
  files: FileInfo[],
  ignorePatterns?: IgnorePattern[],
  includeContent?: boolean
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
