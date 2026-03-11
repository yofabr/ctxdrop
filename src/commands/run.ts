import { defineCommand } from "citty";
import { success } from "../utils/logger";

// CLI argument types
export interface RunArgs {
  config: string;
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
