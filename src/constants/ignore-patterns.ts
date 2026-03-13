// Ignore pattern type: string or regex
export type IgnorePattern = string | RegExp;

export const DEFAULT_IGNORE_PATTERNS: IgnorePattern[] = [
  // Version Control
  ".git",
  ".svn",
  ".hg",
  ".gitignore",

  // Node.js
  "node_modules",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".npm",
  ".yarn",
  ".pnpm-store",

  // Python
  "__pycache__",
  "*.py[cod]",
  "*$py.class",
  ".pytest_cache",
  ".coverage",
  "htmlcov",
  ".tox",
  "venv",
  ".venv",
  "env",
  ".env",
  "Pipfile.lock",
  "poetry.lock",
  "requirements.txt",
  "Pipfile",

  // Go
  "go.sum",
  "go.mod",
  "vendor",

  // Rust
  "Cargo.lock",
  "Cargo.toml",
  "target",
  ".cargo",

  // Ruby
  "vendor/bundle",
  ".bundle",
  "Gemfile.lock",
  "Gemfile",
  ".ruby-version",

  // Java
  "*.class",
  "*.jar",
  "*.war",
  ".gradle",
  "build",
  "target",
  ".idea",
  "*.iml",

  // Kotlin
  "*.kt",
  "build.gradle.kts",
  "settings.gradle.kts",

  // C/C++
  "*.o",
  "*.a",
  "*.so",
  "*.dll",
  "*.dylib",
  "CMakeLists.txt",
  "CMakeCache.txt",
  "Makefile",
  "cmake-build-*",

  // C#
  "*.dll",
  "*.exe",
  "*.pdb",
  "bin",
  "obj",
  "*.user",
  "*.suo",
  ".vs",

  // PHP
  "vendor",
  "composer.lock",
  "composer.json",
  "*.phar",

  // Swift/Objective-C
  "Pods",
  "*.xcodeproj",
  "*.xcworkspace",
  ".build",
  "DerivedData",

  // Dart/Flutter
  "pubspec.lock",
  ".dart_tool",
  ".flutter-plugins",
  ".packages",
  "build",

  // Elixir/Erlang
  "_build",
  "deps",
  "*.beam",
  "mix.lock",
  ".elixir_ls",

  // Haskell
  "dist",
  "dist-newstyle",
  "cabal-files",
  "*.hs-textual",

  // .NET
  "bin",
  "obj",
  "*.nupkg",

  // JavaScript/TypeScript (additional)
  "*.lock",
  ".cache",

  // Build outputs
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",

  // Package managers & lock files
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "go.sum",
  "Gemfile.lock",
  "composer.lock",
  "poetry.lock",
  "Pipfile.lock",
  "pubspec.lock",
  "mix.lock",

  // OS files
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",

  // IDE & Editor
  ".vscode",
  ".idea",
  "*.swp",
  "*.swo",
  "*~",
  ".settings",
  ".project",
  ".classpath",

  // Environment
  ".env",
  ".env.local",
  ".env.*.local",
  ".envrc",

  // Cache directories
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".nuxt",
  ".next",

  // Test coverage
  "coverage",
  ".nyc_output",
  ".coverage.*",

  // Misc
  ".gitignore",
  ".dockerignore",
  ".editorconfig",
  ".prettierrc*",
  ".eslintrc*",
  ".babelrc*",
  "tsconfig*.json",
  "*.tsbuildinfo",
];
