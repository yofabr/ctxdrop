import { text } from "@clack/prompts";
import { defineCommand } from "citty";
import { DEFAULT_CONFIG, createConfigFile } from "../utils/config";
import { error, info, success, warning } from "../utils/logger";

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
    let configPath = context.args.path as string;

    while (true) {
      try {
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
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("already exists")) {
          error(message);
          const newPath = await text({
            message: "Enter a different path:",
            placeholder: "config/my-config.json",
            validate: (value) => {
              if (!value || value.trim() === "") {
                return "Please enter a valid path";
              }
            },
          });
          if (typeof newPath === "symbol") {
            process.exit(1);
          }
          configPath = newPath;
        } else {
          throw err;
        }
      }
    }
  },
});

export default configCommand;
