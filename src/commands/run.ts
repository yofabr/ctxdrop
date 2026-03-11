import path from "node:path";
import { defineCommand } from "citty";
import { GetConfig, validateConfig } from "../utils/config";
import { error, info, success } from "../utils/logger";
import {
  type FileNode,
  collectFileContents,
  formatFileTree,
  generateProjectPrompt,
  scanDirectory,
} from "../utils/project";

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") {
      count++;
    } else if (node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
}

export interface RunArgs {
  config: string;
}

export async function run(args: RunArgs): Promise<void> {
  const config = await GetConfig(args.config);

  const validation = validateConfig(config);
  if (!validation.valid) {
    error("Invalid config:");
    for (const err of validation.errors) {
      error(`  - ${err.field}: ${err.message}`);
    }
    process.exit(1);
  }

  const srcPath = path.resolve(config.src);
  info(`Scanning project structure: ${srcPath}`);

  const tree = await scanDirectory(srcPath);
  const treeOutput = formatFileTree(tree);
  const fileCount = countFiles(tree);
  info(`Found ${fileCount} files`);

  info("Reading file contents...");
  const files = await collectFileContents(tree, srcPath);

  const prompt = generateProjectPrompt(
    { src: config.src, output: config.output },
    treeOutput,
    files,
  );

  success(`Prompt generated: ${prompt.length} characters`);
  info(`Output: ${config.output}context.md`);

  console.log(`\n${prompt}`);
}

const runCommand = defineCommand({
  meta: {
    name: "run",
    description: "Pack codebase into context file",
  },
  args: {
    config: {
      type: "string",
      short: "c",
      description: "Config.json file path",
      default: "ctxdrop.json",
    },
  },
  async run(context) {
    await run(context.args as RunArgs);
  },
});

export default runCommand;
