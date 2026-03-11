import { defineCommand } from "citty";
import { success } from "../utils/logger";

// CLI argument types
export interface RunArgs {
  raw: boolean;
  output: string;
  dir: string;
}

export async function run(__args: RunArgs): Promise<void> {
  success(
    "Welcome! ctxdrop packs your codebase into a single context file, ready for any AI agent.",
  );
}

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

export default runCommand;
