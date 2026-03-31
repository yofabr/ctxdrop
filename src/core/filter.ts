// Default patterns for files/dirs to skip

import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_IGNORE_PATTERNS, type IgnorePattern } from "../constants/ignore-patterns";

export interface IgnoreOptions {
  loadGitignore?: boolean;
  loadClaudeignore?: boolean;
}

export async function loadIgnorePatterns(
  rootPath: string,
  options: IgnoreOptions = {},
): Promise<IgnorePattern[]> {
  const patterns: IgnorePattern[] = [...DEFAULT_IGNORE_PATTERNS];

  if (options.loadGitignore !== false) {
    const gitignorePatterns = await loadIgnoreFile(rootPath, ".gitignore");
    patterns.push(...gitignorePatterns);
  }

  if (options.loadClaudeignore) {
    const claudeignorePatterns = await loadIgnoreFile(rootPath, ".claudeignore");
    patterns.push(...claudeignorePatterns);
  }

  return patterns;
}

async function loadIgnoreFile(rootPath: string, fileName: string): Promise<IgnorePattern[]> {
  const patterns: IgnorePattern[] = [];
  const filePath = path.join(rootPath, fileName);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      let pattern = trimmed;

      if (pattern.startsWith("!")) {
        continue;
      }

      if (pattern.startsWith("/")) {
        pattern = pattern.slice(1);
      }

      if (pattern.endsWith("/")) {
        pattern = pattern.slice(0, -1);
      }

      if (pattern.includes("*")) {
        try {
          const regex = patternToRegex(pattern);
          patterns.push(regex);
        } catch {
          patterns.push(pattern);
        }
      } else {
        patterns.push(pattern);
      }
    }
  } catch {
    // File doesn't exist - silently ignore
  }

  return patterns;
}

function patternToRegex(pattern: string): RegExp {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*");

  return new RegExp(`^${regexStr}$`);
}

// Check if a file should be ignored
export function shouldIgnore(
  filePath: string,
  patterns: IgnorePattern[] = DEFAULT_IGNORE_PATTERNS,
): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");

  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      if (normalizedPath.includes(pattern)) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(normalizedPath)) {
        return true;
      }
    }
  }

  return false;
}

// Export defaults for external use
export function getDefaultIgnorePatterns(): IgnorePattern[] {
  return [...DEFAULT_IGNORE_PATTERNS];
}
