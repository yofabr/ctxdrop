import process from "node:process";

type LogLevel = "info" | "success" | "warning" | "error" | "debug" | "verbose";

type LogColor = "reset" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "gray";

const colors: Record<LogColor, string> = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const symbols: Record<LogLevel, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
  debug: "⚙",
  verbose: "◌",
};

const levelColors: Record<LogLevel, LogColor> = {
  info: "blue",
  success: "green",
  warning: "yellow",
  error: "red",
  debug: "cyan",
  verbose: "gray",
};

function colorize(text: string, color: LogColor): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function format(level: LogLevel, message: string, prefix?: string): string {
  const symbol = symbols[level];
  const color = levelColors[level];
  const prefixStr = prefix ? `${colorize(prefix, "cyan")} ` : "";
  return `${prefixStr}${colorize(symbol, color)} ${message}`;
}

export interface LoggerOptions {
  prefix?: string;
  timestamp?: boolean;
  silent?: boolean;
}

export class Logger {
  private prefix: string;
  private timestamp: boolean;
  private silent: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || "";
    this.timestamp = options.timestamp ?? false;
    this.silent = options.silent ?? false;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (this.silent) return;

    const msg = args.length > 0 ? `${message} ${args.map(a => String(a)).join(" ")}` : message;
    const timestamp = this.timestamp ? `${colorize(new Date().toISOString(), "gray")} ` : "";
    const formatted = format(level, msg, this.prefix);

    if (level === "error") {
      console.error(timestamp + formatted);
    } else {
      console.log(timestamp + formatted);
    }
  }

  info(message: string, ...args: unknown[]): void {
    this.log("info", message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    this.log("success", message, ...args);
  }

  warning(message: string, ...args: unknown[]): void {
    this.log("warning", message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log("error", message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log("debug", message, ...args);
  }

  verbose(message: string, ...args: unknown[]): void {
    this.log("verbose", message, ...args);
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  setTimestamp(enabled: boolean): void {
    this.timestamp = enabled;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }
}

export const logger = new Logger();

export function info(message: string, ...args: unknown[]): void {
  logger.info(message, ...args);
}

export function success(message: string, ...args: unknown[]): void {
  logger.success(message, ...args);
}

export function warning(message: string, ...args: unknown[]): void {
  logger.warning(message, ...args);
}

export function error(message: string, ...args: unknown[]): void {
  logger.error(message, ...args);
}

export function debug(message: string, ...args: unknown[]): void {
  logger.debug(message, ...args);
}

export function verbose(message: string, ...args: unknown[]): void {
  logger.verbose(message, ...args);
}

export interface SpinnerOptions {
  message?: string;
  color?: LogColor;
}

class InteractiveSpinner {
  private currentMessage: string = "";
  private frames: string[] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private interval: NodeJS.Timeout | null = null;
  private active: boolean = false;
  private color: LogColor = "cyan";

  start(message: string = "Loading..."): void {
    this.currentMessage = message;
    this.active = true;
    let frameIndex = 0;

    this.interval = setInterval(() => {
      const frame = this.frames[frameIndex];
      process.stdout.write(`\r${colorize(frame, this.color)} ${this.currentMessage}`);
      frameIndex = (frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(message?: string): void {
    if (!this.active) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    process.stdout.write("\r" + " ".repeat(this.currentMessage.length + 3) + "\r");
    if (message) {
      console.log(format("success", message));
    }
    this.active = false;
  }

  fail(message?: string): void {
    if (!this.active) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    process.stdout.write("\r" + " ".repeat(this.currentMessage.length + 3) + "\r");
    if (message) {
      console.log(format("error", message));
    }
    this.active = false;
  }

  setMessage(message: string): void {
    this.currentMessage = message;
  }

  setColor(color: LogColor): void {
    this.color = color;
  }
}

export const spinner = new InteractiveSpinner();

export function startSpinner(message?: string): void {
  spinner.start(message);
}

export function stopSpinner(message?: string): void {
  spinner.stop(message);
}

export function failSpinner(message?: string): void {
  spinner.fail(message);
}

const progressChars = ["█", "▓", "▒", "░"];
const progressWidth = 20;

export function renderProgress(percent: number, message?: string): string {
  const filled = Math.round((percent / 100) * progressWidth);
  const empty = progressWidth - filled;
  const bar = colorize(progressChars[0].repeat(filled), "green") + 
              colorize(progressChars[3].repeat(empty), "gray");
  const pct = colorize(`${percent.toFixed(0)}%`, "cyan");
  const msg = message ? ` ${message}` : "";
  return `[${bar}] ${pct}${msg}`;
}

export function updateProgress(percent: number, message?: string): void {
  process.stdout.write("\r" + renderProgress(percent, message));
}

export function clearProgress(): void {
  process.stdout.write("\r" + " ".repeat(80) + "\r");
}

export interface TableColumn {
  key: string;
  header: string;
  width?: number;
}

export interface TableRow {
  [key: string]: string;
}

export function renderTable(columns: TableColumn[], rows: TableRow[]): void {
  const widths = columns.map(col => {
    const contentWidth = Math.max(
      col.width || 0,
      col.header.length,
      ...rows.map(row => (row[col.key] || "").length)
    );
    return contentWidth;
  });

  const headerLine = columns.map((col, i) => {
    return col.header.padEnd(widths[i]);
  }).join(" | ");

  console.log(colorize(headerLine, "cyan"));
  console.log(colorize(widths.map(w => "─".repeat(w)).join("-+-"), "gray"));

  for (const row of rows) {
    const rowLine = columns.map((col, i) => {
      return (row[col.key] || "").padEnd(widths[i]);
    }).join(" | ");
    console.log(rowLine);
  }
}

export function box(text: string, options: { title?: string; color?: LogColor } = {}): void {
  const { title, color = "cyan" } = options;
  const lines = text.split("\n");
  const maxWidth = Math.max(...lines.map(l => l.length), title?.length || 0);
  const border = colorize("─".repeat(maxWidth + 2), color);

  if (title) {
    const titleLine = colorize(`│ ${title.padEnd(maxWidth)} │`, color);
    console.log(colorize("┌" + border + "┐", color));
    console.log(titleLine);
    console.log(colorize("├" + border + "┤", color));
  } else {
    console.log(colorize("┌" + border + "┐", color));
  }

  for (const line of lines) {
    console.log(colorize(`│ ${line.padEnd(maxWidth)} │`, color));
  }

  console.log(colorize("└" + border + "┘", color));
}

export function bulletList(items: string[], ordered: boolean = false): void {
  items.forEach((item, index) => {
    const prefix = ordered ? `${colorize(index + 1 + ".", "cyan")}` : colorize("•", "cyan");
    console.log(`  ${prefix} ${item}`);
  });
}

export function keyValue(key: string, value: string, indent: number = 0): void {
  const spaces = " ".repeat(indent);
  console.log(`${spaces}${colorize(key + ":", "yellow")} ${value}`);
}

export interface DividerOptions {
  char?: string;
  color?: LogColor;
  width?: number;
}

export function divider(options: DividerOptions = {}): void {
  const { char = "─", color = "gray", width = 40 } = options;
  console.log(colorize(char.repeat(width), color));
}

export function indent(text: string, spaces: number = 2): string {
  const indentStr = " ".repeat(spaces);
  return text.split("\n").map(line => indentStr + line).join("\n");
}

export function truncate(text: string, maxLength: number, suffix: string = "..."): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}
