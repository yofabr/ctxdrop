// import { formatAsTree, listFilesByDirectory, scanDirectory } from "../core/scanner";
// import { getDefaultIgnorePatterns } from "../core/filter";
// import { formatOutput, type OutputFormat } from "../core/formatter";
import { success } from "../utils/logger";

// CLI argument types
export interface RunArgs {
  raw: boolean;
  output: string;
  dir: string;
}
// Main orchestration: scan -> format -> output
export async function run(__args: RunArgs): Promise<void> {
  // const targetDir = args.dir || ".";
  // const outputFormat = (args.output || "md") as OutputFormat;
  // const isRaw = args.raw ?? false;
  success(
    "Welcome! ctxdrop packs your codebase into a single context file, ready for any AI agent.",
  );

  // try {
  // } catch (error) {
  //   stopSpinner();
  //   const message = error instanceof Error ? error.message : "Unknown error";
  //   logError(`Error: ${message}`);
  //   process.exit(1);
  // }
}
