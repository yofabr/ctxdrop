import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  determineProjectSize,
  getStrategy,
  SIZE_THRESHOLDS,
  quickScan,
} from "../core/summarizer";

const TEST_DIR = join(import.meta.dir, "test-project-summarizer");

async function setupTestProject() {
  await mkdir(join(TEST_DIR, "src"), { recursive: true });
  await mkdir(join(TEST_DIR, "lib"), { recursive: true });
  await writeFile(join(TEST_DIR, "src/index.ts"), "export const foo = 'bar';");
  await writeFile(join(TEST_DIR, "src/app.ts"), "function main() { return true; }");
  await writeFile(join(TEST_DIR, "lib/utils.ts"), "export function helper() {}");
  await writeFile(join(TEST_DIR, "package.json"), '{"name": "test"}');
  await writeFile(join(TEST_DIR, "README.md"), "# Test Project");
}

async function cleanupTestProject() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe("summarizer", () => {
  beforeAll(async () => {
    await setupTestProject();
  });

  afterAll(async () => {
    await cleanupTestProject();
  });

  test("determineProjectSize returns correct size", () => {
    expect(determineProjectSize(5)).toBe("small");
    expect(determineProjectSize(50)).toBe("medium");
    expect(determineProjectSize(500)).toBe("large");
  });

  test("getStrategy returns valid strategy", () => {
    const strategy = getStrategy("small");
    expect(strategy.name).toBe("small-project");
    expect(strategy.maxFilesToRead).toBe(SIZE_THRESHOLDS.small.maxFiles);
  });

  test("getStrategy returns different strategies for different sizes", () => {
    const smallStrategy = getStrategy("small");
    const largeStrategy = getStrategy("large");
    expect(smallStrategy.name).not.toBe(largeStrategy.name);
  });

  test("quickScan returns project analysis", async () => {
    const result = await quickScan(TEST_DIR);
    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.size).toBeDefined();
    expect(result.tree).toBeDefined();
    expect(result.allFiles.length).toBe(result.totalFiles);
  });

  test("quickScan identifies file types", async () => {
    const result = await quickScan(TEST_DIR);
    const sourceFiles = result.allFiles.filter(
      (f) => f.classification.type === "source",
    );
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  test("SIZE_THRESHOLDS has correct structure", () => {
    expect(SIZE_THRESHOLDS.small.maxFiles).toBeDefined();
    expect(SIZE_THRESHOLDS.medium.maxFiles).toBeDefined();
    expect(SIZE_THRESHOLDS.large.maxFiles).toBeDefined();
  });
});