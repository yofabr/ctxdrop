#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import configCommand from "./commands/config";
import runCommand from "./commands/run";

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
