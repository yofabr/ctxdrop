import { spinner } from "@clack/prompts";

const s = spinner();

// Start spinner with message
export function startSpinner(message: string): void {
  s.start(message);
}

// Stop spinner with optional message
export function stopSpinner(message?: string): void {
  s.stop(message ?? "");
}

// Log info to stdout
export function logInfo(message: string): void {
  console.log(message);
}

// Log error to stderr
export function logError(message: string): void {
  console.error(message);
}
