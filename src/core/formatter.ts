import type { FileInfo } from "./scanner";

export type OutputFormat = "md" | "xml" | "txt" | "structure" | "manifest";

export interface FormatterOptions {
  format: OutputFormat;
}

// Main entry: format files into selected output format
export function formatOutput(files: FileInfo[], options: FormatterOptions): string {
  const { format } = options;

  switch (format) {
    case "md":
      return formatMarkdown(files);
    case "xml":
      return formatXml(files);
    case "txt":
      return formatText(files);
    case "structure":
      return formatStructureOnly(files);
    case "manifest":
      return formatManifest(files);
    default:
      return formatMarkdown(files);
  }
}

// Format as Markdown: ## filename\n```\ncontent\n```
function formatMarkdown(files: FileInfo[]): string {
  const parts: string[] = ["# Codebase Context\n"];

  for (const file of files) {
    parts.push(`## ${file.relativePath}\n`);
    parts.push("```\n");
    parts.push(file.content ?? "");
    parts.push("\n```\n");
  }

  return parts.join("");
}

// Format as XML: <file path="..."><![CDATA[content]]></file>
function formatXml(files: FileInfo[]): string {
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n'];
  parts.push("<context>\n");

  for (const file of files) {
    parts.push(`  <file path="${escapeXml(file.relativePath)}">\n`);
    parts.push(`    <![CDATA[${file.content ?? ""}]]>\n`);
    parts.push("  </file>\n");
  }

  parts.push("</context>");
  return parts.join("");
}

// Format as plain text: === filename ===\ncontent\n
function formatText(files: FileInfo[]): string {
  const parts: string[] = [];

  for (const file of files) {
    parts.push(`=== ${file.relativePath} ===\n`);
    parts.push(file.content ?? "");
    parts.push("\n");
  }

  return parts.join("");
}

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Format structure-only output with on-demand loading guide
function formatStructureOnly(files: FileInfo[]): string {
  const parts: string[] = ["# Project Context\n"];
  parts.push("\n## Structure Map\n");
  parts.push("\n| File | Functions/Classes | Lines |\n");
  parts.push("|------|-------------------|-------|\n");

  for (const file of files) {
    if (!file.content) continue;

    const structures = extractStructures(file.content);
    if (structures.length === 0) continue;

    const structureNames = structures
      .slice(0, 5)
      .map((s) => `${s.type}: ${s.name}`)
      .join(", ");
    const more = structures.length > 5 ? ` (+${structures.length - 5} more)` : "";
    const lines = `${structures[0].start}-${structures[structures.length - 1].end}`;

    parts.push(`| ${file.relativePath} | ${structureNames}${more} | ${lines} |\n`);
  }

  parts.push("\n## On-Demand Loading Guide\n");
  parts.push("```\n");
  parts.push("# Read specific function by line range:\n");
  parts.push("# src/file.ts:10-25  (reads lines 10-25)\n");
  parts.push("```\n");

  return parts.join("");
}

interface SimpleStructure {
  type: string;
  name: string;
  start: number;
  end: number;
}

function extractStructures(content: string): SimpleStructure[] {
  const structures: SimpleStructure[] = [];
  const lines = content.split("\n");

  const patterns = [
    { type: "function", regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
    { type: "class", regex: /^(?:export\s+)?class\s+(\w+)/ },
    { type: "interface", regex: /^(?:export\s+)?interface\s+(\w+)/ },
    { type: "type", regex: /^(?:export\s+)?type\s+(\w+)/ },
    { type: "const", regex: /^(?:export\s+)?const\s+(\w+)/ },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { type, regex } of patterns) {
      const match = line.match(regex);
      if (match) {
        structures.push({
          type,
          name: match[1],
          start: i + 1,
          end: i + 1,
        });
      }
    }
  }

  return structures;
}

interface ManifestFile {
  priority: number;
  lines: string;
  size: number;
  structures: SimpleStructure[];
}

interface Manifest {
  version: string;
  generated: string;
  project: {
    totalFiles: number;
  };
  files: Record<string, ManifestFile>;
  onDemand: {
    description: string;
    example: string;
  };
}

function formatManifest(files: FileInfo[]): string {
  const manifest: Manifest = {
    version: "1.0",
    generated: new Date().toISOString(),
    project: {
      totalFiles: files.length,
    },
    files: {},
    onDemand: {
      description: "Use line ranges to load specific functions",
      example: "Read src/file.ts:10-25 for specific function",
    },
  };

  for (const file of files) {
    const structures = file.content ? extractStructures(file.content) : [];
    const contentLength = file.content?.length || 0;

    manifest.files[file.relativePath] = {
      priority: contentLength > 0 ? 1 : 2,
      lines:
        structures.length > 0
          ? `${structures[0].start}-${structures[structures.length - 1].end}`
          : "N/A",
      size: contentLength,
      structures: structures.slice(0, 10),
    };
  }

  return JSON.stringify(manifest, null, 2);
}
