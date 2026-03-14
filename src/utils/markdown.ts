import { formatMarkdownTable } from "@tpmjs/markdown-formatter";

export async function formatMarkdownContent(content: string): Promise<string> {
  const tableRegex = /\|[\s\S]*?\|[\s\S]*?\n/gs;
  const tables = content.match(tableRegex) || [];

  let formattedContent = content;

  for (const table of tables) {
    try {
      const executor = formatMarkdownTable.execute;
      if (!executor) continue;

      const result = await (executor as (input: unknown, options?: unknown) => Promise<unknown>)(
        {
          table: table.trim(),
          alignment: "left",
        },
        { toolCallId: "format", messages: [] },
      );

      if (result && typeof result === "object" && "formattedTable" in result) {
        const r = result as { success?: boolean; formattedTable: string };
        if (r.success && r.formattedTable) {
          formattedContent = formattedContent.replace(table, r.formattedTable + "\n");
        }
      }
    } catch {
      // Keep original if formatting fails
    }
  }

  return formattedContent;
}
