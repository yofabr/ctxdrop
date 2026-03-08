import type { FileInfo } from "./scanner";

export type OutputFormat = "md" | "xml" | "txt";

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
