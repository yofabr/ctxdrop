// Default patterns for files/dirs to skip

import { DEFAULT_IGNORE_PATTERNS, type IgnorePattern } from "../constants/ignore-patters";

// Check if a file should be ignored
export function shouldIgnore(
  filePath: string,
  patterns: IgnorePattern[] = DEFAULT_IGNORE_PATTERNS
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
