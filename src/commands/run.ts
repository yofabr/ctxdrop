import { defineCommand } from "citty";
import { GetConfig, validateConfig } from "../utils/config";
import { error, success } from "../utils/logger";

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
