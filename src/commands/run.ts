import { scanDirectory } from "../core/scanner";
import { getDefaultIgnorePatterns } from "../core/filter";
import { formatOutput, type OutputFormat } from "../core/formatter";
import { startSpinner, stopSpinner, logInfo, logError } from "../utils/logger";

export interface RunArgs {
  raw: boolean;
  output: string;
  dir: string;
}

export async function run(args: RunArgs): Promise<void> {
  const targetDir = args.dir || ".";
  const outputFormat = (args.output || "md") as OutputFormat;
  const isRaw = args.raw ?? false;

  try {
    startSpinner(`Scanning ${targetDir}...`);

    const files = await scanDirectory(targetDir, {
      ignorePatterns: getDefaultIgnorePatterns(),
      includeContent: true,
    });

    stopSpinner(`Found ${files.length} files`);

    if (isRaw) {
      for (const file of files) {
        logInfo(`${file.relativePath}`);
        if (file.content) {
          logInfo(file.content);
          logInfo("");
        }
      }
    } else {
      const output = formatOutput(files, { format: outputFormat });
      console.log(output);
    }
  } catch (error) {
    stopSpinner();
    const message = error instanceof Error ? error.message : "Unknown error";
    logError(`Error: ${message}`);
    process.exit(1);
  }
}
