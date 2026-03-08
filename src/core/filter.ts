// Ignore pattern type: string or regex
export type IgnorePattern = string | RegExp;

// Default patterns for files/dirs to skip
const DEFAULT_IGNORE_PATTERNS: IgnorePattern[] = [
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  ".gitignore",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "*.lock",
  ".DS_Store",
  "Thumbs.db",
  "__pycache__",
  ".pytest_cache",
  ".next",
  ".nuxt",
  ".output",
  "dist",
  "build",
  ".cache",
  "coverage",
  ".env",
  ".env.local",
  ".env.*.local",
];

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
