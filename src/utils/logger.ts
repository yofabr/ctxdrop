import { spinner } from "@clack/prompts";

const s = spinner();

export function startSpinner(message: string): void {
  s.start(message);
}

export function stopSpinner(message?: string): void {
  s.stop(message ?? "");
}

export function logInfo(message: string): void {
  console.log(message);
}

export function logError(message: string): void {
  console.error(message);
}
