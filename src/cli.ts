#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { type RunArgs, run } from "./commands/run";

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

// Main entry command
const main = defineCommand({
  meta: {
    name: "ctxdrop",
    version: "0.1.0",
    description: "Pack your codebase into a single context file, ready for any AI agent.",
  },
  subCommands: {
    run: runCommand,
  },
});

runMain(main);
