#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { type RunArgs, run } from "./commands/run";
import { DEFAULT_CONFIG, createConfigFile } from "./utils/config";
import { info, success, warning } from "./utils/logger";

// Define the "run" subcommand with its arguments
const runCommand = defineCommand({
  meta: {
    name: "run",
    description: "Pack codebase into context file",
  },
  args: {
    raw: {
      type: "boolean",
      short: "r",
      description: "Output raw file paths with content",
      default: false,
    },
    output: {
      type: "string",
      short: "o",
      description: "Output format: md|xml|txt",
      default: "md",
    },
    dir: {
      type: "string",
      short: "d",
      description: "Target directory",
      default: ".",
    },
  },
  async run(context) {
    await run(context.args as RunArgs);
  },
});

const configCommand = defineCommand({
  meta: {
    name: "config",
    description: "Create default config file",
  },
  args: {
    path: {
      type: "string",
      short: "p",
      description: "Config file path",
      default: "config/config.json",
    },
  },
  async run(context) {
    const configPath = context.args.path as string;
    const createdPath = await createConfigFile(configPath);

    success(`Config file created at: ${createdPath}`);
    info("\nPlease update the config with your settings:");
    warning("\nmodel:");
    info(`  model_name: "${DEFAULT_CONFIG.model.model_name}" (e.g., gpt-4, gpt-3.5-turbo)`);
    info(`  api_key: "YOUR_API_KEY" (required - your OpenAI API key)`);
    info(`  api_base: "${DEFAULT_CONFIG.model.api_base}" (or your custom endpoint)`);
    warning("\nsrc:");
    info(`  "${DEFAULT_CONFIG.src}" (directory to scan for files)`);
    warning("\noutput:");
    info(`  "${DEFAULT_CONFIG.output}" (where to save the output)`);
  },
});

// Main entry command
const main = defineCommand({
  meta: {
    name: "ctxdrop",
    version: "0.1.0",
    description: "Pack your codebase into a single context file, ready for any AI agent.",
  },
  subCommands: {
    run: runCommand,
    config: configCommand,
  },
});

runMain(main);
