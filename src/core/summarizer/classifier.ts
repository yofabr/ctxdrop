import type { FileClassification, FileType } from "./types.js";

const ENTRY_PATTERNS = [
  /^index\.(ts|js|tsx|jsx|mjs|cjs)$/,
  /^main\.(ts|js|tsx|jsx|mjs|cjs)$/,
  /^app\.(ts|js|tsx|jsx|mjs|cjs)$/,
  /^server\.(ts|js)$/,
  /^src\/index\.(ts|js|tsx|jsx)$/,
  /^src\/main\.(ts|js|tsx|jsx)$/,
  /^src\/app\.(ts|js|tsx|jsx)$/,
  /^entry\.(ts|js|tsx|jsx)$/,
  /^run\.(ts|js)$/,
  /^bootstrap\.(ts|js)$/,
  /^start\.(ts|js)$/,
];

const CONFIG_PATTERNS = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "webpack.config.js",
  "webpack.config.ts",
  "next.config.js",
  "next.config.mjs",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "eslint.config.js",
  "eslint.config.mjs",
  ".eslintrc.json",
  ".eslintrc.js",
  "prettier.config.js",
  "prettier.config.mjs",
  ".prettierrc",
  "biome.json",
  ".biome.json",
  "Cargo.toml",
  "go.mod",
  "go.sum",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "requirements.txt",
  "Pipfile",
  "composer.json",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "CMakeLists.txt",
  "Makefile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.example",
  ".envrc",
];

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".scala",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
];

const TEST_EXTENSIONS = [
  ".test.ts",
  ".test.js",
  ".test.tsx",
  ".test.jsx",
  ".spec.ts",
  ".spec.js",
  ".spec.tsx",
  ".spec.jsx",
  ".test.py",
  ".spec.py",
  "_test.go",
  "_test.py",
  ".test.rs",
];

const TEST_PATTERNS = ["__tests__", "test/", "tests/", ".test", ".spec"];

const ASSET_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".styl",
];

const DOC_EXTENSIONS = [".md", ".txt", ".rst", ".adoc"];

export function classifyFile(
  relativePath: string,
  fileName: string,
  extension: string,
): FileClassification {
  const lowerPath = relativePath.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (isEntryPoint(lowerName, relativePath)) {
    return {
      type: "entry",
      priority: 1,
      reason: "Entry point file",
    };
  }

  if (isConfigFile(lowerName)) {
    return {
      type: "config",
      priority: 2,
      reason: "Configuration file",
    };
  }

  if (isTestFile(lowerName, lowerPath, extension)) {
    return {
      type: "test",
      priority: 4,
      reason: "Test file",
    };
  }

  if (isAssetFile(extension)) {
    return {
      type: "asset",
      priority: 5,
      reason: "Asset file",
    };
  }

  if (isDocumentationFile(extension, lowerName)) {
    return {
      type: "documentation",
      priority: 3,
      reason: "Documentation file",
    };
  }

  if (isSourceFile(extension)) {
    return {
      type: "source",
      priority: 3,
      reason: "Source code file",
    };
  }

  return {
    type: "other",
    priority: 6,
    reason: "Other file type",
  };
}

function isEntryPoint(fileName: string, relativePath: string): boolean {
  for (const pattern of ENTRY_PATTERNS) {
    if (pattern.test(fileName) || pattern.test(relativePath)) {
      return true;
    }
  }
  return false;
}

function isConfigFile(fileName: string): boolean {
  return CONFIG_PATTERNS.some((config) => config.toLowerCase() === fileName);
}

function isTestFile(fileName: string, relativePath: string, _extension: string): boolean {
  if (TEST_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    return true;
  }

  return TEST_PATTERNS.some(
    (pattern) =>
      relativePath.includes(`/${pattern}/`) ||
      relativePath.includes(`/${pattern}.`) ||
      fileName.startsWith(pattern),
  );
}

function isAssetFile(extension: string): boolean {
  return ASSET_EXTENSIONS.includes(extension.toLowerCase());
}

function isDocumentationFile(extension: string, fileName: string): boolean {
  if (DOC_EXTENSIONS.includes(extension.toLowerCase())) {
    if (
      fileName.startsWith("readme") ||
      fileName.startsWith("changelog") ||
      fileName.startsWith("contributing") ||
      fileName.startsWith("license")
    ) {
      return true;
    }
    return fileName !== "readme.md" || DOC_EXTENSIONS.includes(extension);
  }
  return false;
}

function isSourceFile(extension: string): boolean {
  return SOURCE_EXTENSIONS.includes(extension.toLowerCase());
}

export function getFileTypeFromExtension(extension: string): FileType {
  if (SOURCE_EXTENSIONS.includes(extension.toLowerCase())) return "source";
  if (CONFIG_PATTERNS.some((c) => c.includes(extension))) return "config";
  if (TEST_EXTENSIONS.some((t) => extension.includes(t))) return "test";
  if (ASSET_EXTENSIONS.includes(extension.toLowerCase())) return "asset";
  if (DOC_EXTENSIONS.includes(extension.toLowerCase())) return "documentation";
  return "other";
}

export function sortByPriority<T extends { classification: FileClassification }>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const priorityDiff = a.classification.priority - b.classification.priority;
    if (priorityDiff !== 0) return priorityDiff;
    return a.classification.type.localeCompare(b.classification.type);
  });
}
