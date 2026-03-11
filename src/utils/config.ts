import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface Config {
  model: {
    model_name: string;
    api_key: string;
    api_base: string;
  };
  src: string;
  output: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, "../../config/config.json");

export const DEFAULT_CONFIG: Config = {
  model: {
    model_name: "gpt-4",
    api_key: "",
    api_base: "https://api.openai.com/v1",
  },
  src: "./src/",
  output: "./",
};

export function getDefaultConfig(): Config {
  return { ...DEFAULT_CONFIG };
}

export function validateConfig(config: Config): ConfigValidationResult {
  const errors: ValidationError[] = [];

  if (!config.model.api_key || config.model.api_key.trim() === "") {
    errors.push({
      field: "model.api_key",
      message: "API key is required. Run 'ctxdrop config' to set it up.",
    });
  }

  if (!config.model.model_name || config.model.model_name.trim() === "") {
    errors.push({
      field: "model.model_name",
      message: "Model name is required.",
    });
  }

  if (!config.src || config.src.trim() === "") {
    errors.push({
      field: "src",
      message: "Source directory is required.",
    });
  }

  if (!config.output || config.output.trim() === "") {
    errors.push({
      field: "output",
      message: "Output directory is required.",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function findConfigFile(providedPath?: string): Promise<string | null> {
  const searchPaths = providedPath
    ? [providedPath]
    : ["ctxdrop.json", "config/config.json", "./ctxdrop.json"];

  for (const searchPath of searchPaths) {
    const resolvedPath = path.resolve(searchPath);
    if (await fileExists(resolvedPath)) {
      return resolvedPath;
    }
  }

  return null;
}

export async function GetConfig(configPath?: string): Promise<Config> {
  const filePath = await findConfigFile(configPath);

  if (!filePath) {
    throw new Error(
      `No config file found. Please create one with 'ctxdrop config' or specify with -c flag.`,
    );
  }

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as Partial<Config>;

    return {
      model: {
        model_name: parsed.model?.model_name ?? DEFAULT_CONFIG.model.model_name,
        api_key: parsed.model?.api_key ?? DEFAULT_CONFIG.model.api_key,
        api_base: parsed.model?.api_base ?? DEFAULT_CONFIG.model.api_base,
      },
      src: parsed.src ?? DEFAULT_CONFIG.src,
      output: parsed.output ?? DEFAULT_CONFIG.output,
    };
  } catch (error) {
    throw new Error(`Failed to load config from ${filePath}: ${error}`);
  }
}

export async function createConfigFile(filePath?: string): Promise<string> {
  let targetPath = filePath || DEFAULT_CONFIG_PATH;

  if (!targetPath.endsWith(".json")) {
    if (await isDirectory(targetPath)) {
      targetPath = path.join(targetPath, "config.json");
    } else if (!path.extname(targetPath)) {
      targetPath = targetPath + ".json";
    }
  }

  if (await fileExists(targetPath)) {
    throw new Error(`Config file already exists at: ${targetPath}`);
  }

  const dir = path.dirname(targetPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n", "utf-8");

  return targetPath;
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
