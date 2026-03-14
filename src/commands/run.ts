import fs from "node:fs/promises";
import path from "node:path";
import { defineCommand } from "citty";
import { summarizeProject, summarizeWithAI } from "../core/summarizer";
import { GetConfig, validateConfig } from "../utils/config";
import { error, info, success } from "../utils/logger";
import { formatMarkdownContent } from "../utils/markdown";

export interface RunArgs {
  config: string;
  output?: string;
  style?: "detailed" | "brief" | "minimal";
  noai?: boolean;
}

export async function run(args: RunArgs): Promise<void> {
  const { config, isNew } = await GetConfig(args.config);

  if (!isNew) {
    const validation = validateConfig(config);
    if (!validation.valid) {
      error("Invalid config:");
      for (const err of validation.errors) {
        error(`  - ${err.field}: ${err.message}`);
      }
      process.exit(1);
    }
  }

  const srcPath = path.resolve(config.src);
  info(`Analyzing project: ${srcPath}`);

  const style = args.style ?? "brief";
  const options = { style };

  const result = await summarizeProject(srcPath, options);

  const { analysis, strategy, summary } = result;

  info(
    `Project size: ${analysis.size} (${analysis.totalFiles} files, ${analysis.totalDirectories} directories)`,
  );
  info(`Strategy: ${strategy.name}`);

  if (args.noai) {
    const context = summary || generateBriefContext(analysis, strategy);
    await writeOutput(context, config.output);
    return;
  }

  info("Generating AI summary...");

  try {
    const aiResult = await summarizeWithAI(srcPath, config.model, options);

    await writeOutput(aiResult.summary, config.output);

    success(`Summary generated and saved to ${config.output}context.md`);
  } catch (err) {
    error(`AI summary failed: ${err}`);
    const context = summary || generateBriefContext(analysis, strategy);
    await writeOutput(context, config.output);
    info(`Saved structure summary instead to ${config.output}context.md`);
  }
}

function generateBriefContext(
  analysis: ReturnType<typeof summarizeProject> extends Promise<infer R>
    ? R extends { analysis: infer A }
      ? A
      : never
    : never,
  _strategy: ReturnType<typeof summarizeProject> extends Promise<infer R>
    ? R extends { strategy: infer S }
      ? S
      : never
    : never,
): string {
  const lines: string[] = [];

  lines.push("# Project Summary");
  lines.push("");
  lines.push(`**Total Files:** ${analysis.totalFiles}`);
  lines.push(`**Total Directories:** ${analysis.totalDirectories}`);
  lines.push(`**Project Size:** ${analysis.size}`);
  lines.push("");
  lines.push("## Project Structure");
  lines.push("```");
  lines.push(analysis.tree);
  lines.push("```");
  lines.push("");

  if (analysis.allImportantFiles.length > 0) {
    lines.push("## Key Files");
    lines.push("");
    for (const file of analysis.allImportantFiles.slice(0, 15)) {
      lines.push(`- \`${file.relativePath}\` (${file.classification.type})`);
    }
  }

  return lines.join("\n");
}

async function writeOutput(content: string, outputDir?: string): Promise<void> {
  const outputPath = path.resolve(outputDir || "./", "context.md");

  const formattedContent = await formatMarkdownContent(content);

  await fs.writeFile(outputPath, formattedContent, "utf-8");

  success(`Output written to: ${outputPath}`);
}

const runCommand = defineCommand({
  meta: {
    name: "run",
    description: "Pack codebase into context file with AI summary",
  },
  args: {
    config: {
      type: "string",
      short: "c",
      description: "Config.json file path",
      default: "ctxdrop.json",
    },
    output: {
      type: "string",
      short: "o",
      description: "Output directory",
      default: "./",
    },
    style: {
      type: "string",
      short: "s",
      description: "Summarization style (detailed, brief, minimal)",
      default: "brief",
    },
    noai: {
      type: "boolean",
      description: "Skip AI summary, only generate structure",
      default: false,
    },
  },
  async run(context) {
    await run(context.args as unknown as RunArgs);
  },
});

export default runCommand;
