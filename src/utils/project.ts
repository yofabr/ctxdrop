import fs from "node:fs/promises";
import path from "node:path";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export async function scanDirectory(
  dirPath: string,
  ignorePatterns: string[] = [],
): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (shouldIgnore(entry.name, ignorePatterns)) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const children = await scanDirectory(fullPath, ignorePatterns);
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: "directory",
        children,
      });
    } else {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: "file",
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "directory" ? -1 : 1;
  });
}

function shouldIgnore(name: string, patterns: string[]): boolean {
  const defaultIgnore = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".DS_Store",
    "*.lock",
    "bun.lock",
    "package-lock.json",
    "yarn.lock",
  ];

  const allPatterns = [...defaultIgnore, ...patterns];

  for (const pattern of allPatterns) {
    if (pattern.startsWith("*.")) {
      const ext = pattern.slice(1);
      if (name.endsWith(ext)) return true;
    }
    if (name === pattern || name.startsWith(`${pattern}/`)) return true;
  }

  return false;
}

export function formatFileTree(nodes: FileNode[], indent = 0): string {
  let output = "";
  const prefix = "  ".repeat(indent);

  for (const node of nodes) {
    if (node.type === "directory") {
      output += `${prefix}📁 ${node.name}/\n`;
      if (node.children) {
        output += formatFileTree(node.children, indent + 1);
      }
    } else {
      output += `${prefix}📄 ${node.name}\n`;
    }
  }

  return output;
}

export async function readFileContent(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch {
    return "";
  }
}

export interface FileContent {
  path: string;
  name: string;
  content: string;
  language: string;
}

const extensionMap: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".json": "json",
  ".md": "markdown",
  ".txt": "text",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".sql": "sql",
  ".graphql": "graphql",
  ".gql": "graphql",
};

export function getLanguage(filename: string): string {
  const ext = path.extname(filename);
  return extensionMap[ext.toLowerCase()] || "text";
}

export async function collectFileContents(
  nodes: FileNode[],
  basePath: string,
): Promise<FileContent[]> {
  const files: FileContent[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      const content = await readFileContent(node.path);
      files.push({
        path: path.relative(basePath, node.path),
        name: node.name,
        content,
        language: getLanguage(node.name),
      });
    } else if (node.children) {
      const childFiles = await collectFileContents(node.children, basePath);
      files.push(...childFiles);
    }
  }

  return files;
}

export function generateProjectPrompt(
  config: { src: string; output: string },
  tree: string,
  files: FileContent[],
): string {
  let prompt = "# Project Context\n\n";
  prompt += "## Configuration\n";
  prompt += `- Source Directory: ${config.src}\n`;
  prompt += `- Output Directory: ${config.output}\n\n`;
  prompt += "## Project Structure\n";
  prompt += "```\n";
  prompt += tree;
  prompt += "```\n\n";
  prompt += "## File Contents\n";
  prompt += `Total Files: ${files.length}\n\n`;

  for (const file of files) {
    prompt += `### ${file.path}\n`;
    prompt += `\`\`\`${file.language}\n`;
    prompt += `${file.content}\n`;
    prompt += "```\n\n";
  }

  return prompt;
}
