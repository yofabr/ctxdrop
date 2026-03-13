import type { ProjectSize, SummaryStrategy } from "./types.js";

export type { SummaryStrategy } from "./types.js";

export const SIZE_THRESHOLDS = {
  SMALL: 50,
  MEDIUM: 500,
};

export function determineProjectSize(fileCount: number): ProjectSize {
  if (fileCount <= SIZE_THRESHOLDS.SMALL) {
    return "small";
  }
  if (fileCount <= SIZE_THRESHOLDS.MEDIUM) {
    return "medium";
  }
  return "large";
}

export function getStrategy(
  size: ProjectSize,
  options?: { style?: "detailed" | "brief" | "minimal" },
): SummaryStrategy {
  const style = options?.style ?? "detailed";

  switch (size) {
    case "small":
      return getSmallProjectStrategy(style);
    case "medium":
      return getMediumProjectStrategy(style);
    case "large":
      return getLargeProjectStrategy(style);
  }
}

function getSmallProjectStrategy(style: "detailed" | "brief" | "minimal"): SummaryStrategy {
  if (style === "minimal") {
    return {
      name: "small-minimal",
      maxFilesToRead: 20,
      maxFilesForAI: 10,
      includeFileContents: true,
      includeDirectoryDescriptions: false,
      aiSummaryStyle: "brief",
    };
  }

  if (style === "brief") {
    return {
      name: "small-brief",
      maxFilesToRead: 40,
      maxFilesForAI: 15,
      includeFileContents: true,
      includeDirectoryDescriptions: true,
      aiSummaryStyle: "brief",
    };
  }

  return {
    name: "small-detailed",
    maxFilesToRead: SIZE_THRESHOLDS.SMALL,
    maxFilesForAI: 30,
    includeFileContents: true,
    includeDirectoryDescriptions: true,
    aiSummaryStyle: "detailed",
  };
}

function getMediumProjectStrategy(style: "detailed" | "brief" | "minimal"): SummaryStrategy {
  if (style === "minimal") {
    return {
      name: "medium-minimal",
      maxFilesToRead: 30,
      maxFilesForAI: 15,
      includeFileContents: false,
      includeDirectoryDescriptions: false,
      aiSummaryStyle: "structure-only",
    };
  }

  if (style === "brief") {
    return {
      name: "medium-brief",
      maxFilesToRead: 100,
      maxFilesForAI: 25,
      includeFileContents: true,
      includeDirectoryDescriptions: true,
      aiSummaryStyle: "brief",
    };
  }

  return {
    name: "medium-detailed",
    maxFilesToRead: 200,
    maxFilesForAI: 40,
    includeFileContents: true,
    includeDirectoryDescriptions: true,
    aiSummaryStyle: "detailed",
  };
}

function getLargeProjectStrategy(style: "detailed" | "brief" | "minimal"): SummaryStrategy {
  if (style === "minimal") {
    return {
      name: "large-minimal",
      maxFilesToRead: 20,
      maxFilesForAI: 10,
      includeFileContents: false,
      includeDirectoryDescriptions: false,
      aiSummaryStyle: "structure-only",
    };
  }

  if (style === "brief") {
    return {
      name: "large-brief",
      maxFilesToRead: 50,
      maxFilesForAI: 20,
      includeFileContents: false,
      includeDirectoryDescriptions: false,
      aiSummaryStyle: "brief",
    };
  }

  return {
    name: "large-detailed",
    maxFilesToRead: 100,
    maxFilesForAI: 30,
    includeFileContents: true,
    includeDirectoryDescriptions: false,
    aiSummaryStyle: "brief",
  };
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function shouldIncludeFile(
  fileCount: number,
  strategy: SummaryStrategy,
  classificationPriority: number,
): boolean {
  if (fileCount <= strategy.maxFilesToRead) {
    return true;
  }

  return classificationPriority <= 2;
}

export function getFilesToProcess(
  files: { classification: { priority: number } }[],
  strategy: SummaryStrategy,
): number {
  const sorted = [...files].sort((a, b) => a.classification.priority - b.classification.priority);

  return sorted.slice(0, strategy.maxFilesToRead).length;
}
