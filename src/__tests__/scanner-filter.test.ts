import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { scanDirectory, listFilesByDirectory, formatAsTree } from "../core/scanner";
import { shouldIgnore } from "../core/filter";

const TEST_DIR = join(import.meta.dir, "test-project");

async function setupTestProject() {
  await mkdir(join(TEST_DIR, "src"), { recursive: true });
  await mkdir(join(TEST_DIR, "node_modules", "some-package"), { recursive: true });
  await mkdir(join(TEST_DIR, "dist"), { recursive: true });
  await writeFile(join(TEST_DIR, "src/index.ts"), "export const foo = 'bar';");
  await writeFile(join(TEST_DIR, "src/utils.ts"), "export function helper() {}");
  await writeFile(join(TEST_DIR, "package.json"), '{}');
  await writeFile(join(TEST_DIR, "node_modules/some-package/index.js"), "module.exports = {};");
  await writeFile(join(TEST_DIR, "dist/bundle.js"), "console.log('hello');");
}

async function cleanupTestProject() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe("scanner", () => {
  beforeAll(async () => {
    await setupTestProject();
  });

  afterAll(async () => {
    await cleanupTestProject();
  });

  test("scanDirectory returns file list", async () => {
    const files = await scanDirectory(TEST_DIR, { includeContent: false });
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.relativePath.includes("src/index.ts"))).toBe(true);
  });

  test("scanDirectory includes content when requested", async () => {
    const files = await scanDirectory(TEST_DIR, { includeContent: true });
    const indexFile = files.find((f) => f.relativePath.includes("src/index.ts"));
    expect(indexFile?.content).toBe("export const foo = 'bar';");
  });

  test("scanDirectory respects ignore patterns", async () => {
    const files = await scanDirectory(TEST_DIR, {
      ignorePatterns: ["node_modules", "dist"],
    });
    const paths = files.map((f) => f.relativePath);
    expect(paths.some((p) => p.includes("node_modules"))).toBe(false);
    expect(paths.some((p) => p.includes("dist"))).toBe(false);
    expect(paths.some((p) => p.includes("src"))).toBe(true);
  });

  test("listFilesByDirectory groups files by directory", async () => {
    const grouped = await listFilesByDirectory(TEST_DIR);
    expect(grouped["src"]).toBeDefined();
    expect(grouped["src"]?.length).toBe(2);
  });

  test("formatAsTree generates tree string", async () => {
    const grouped = await listFilesByDirectory(TEST_DIR);
    const tree = formatAsTree(grouped);
    expect(tree).toContain("Project/");
    expect(tree).toContain("src/");
  });
});

describe("filter", () => {
  test("shouldIgnore returns true for ignored patterns", () => {
    expect(shouldIgnore("node_modules/package/index.js")).toBe(true);
    expect(shouldIgnore(".git/config")).toBe(true);
    expect(shouldIgnore("dist/bundle.js")).toBe(true);
  });

  test("shouldIgnore returns false for non-ignored paths", () => {
    expect(shouldIgnore("src/index.ts")).toBe(false);
    expect(shouldIgnore("src/utils/helper.ts")).toBe(false);
  });

  test("shouldIgnore works with custom patterns", () => {
    const customPatterns = ["*.test.ts", "coverage"];
    expect(shouldIgnore("foo.test.ts", customPatterns)).toBe(true);
    expect(shouldIgnore("coverage/report.txt", customPatterns)).toBe(true);
    expect(shouldIgnore("src/app.ts", customPatterns)).toBe(false);
  });

  test("shouldIgnore works with RegExp patterns", () => {
    const regexPatterns: (string | RegExp)[] = [/\.test\.(ts|js)$/, /^dist\//];
    expect(shouldIgnore("foo.test.ts", regexPatterns)).toBe(true);
    expect(shouldIgnore("dist/index.js", regexPatterns)).toBe(true);
    expect(shouldIgnore("src/main.ts", regexPatterns)).toBe(false);
  });
});