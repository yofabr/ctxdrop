# ctxdrop

Pack your codebase into a single context file, ready for any AI agent.

## Installation

```bash
bun install
bun run build
```

## Usage

```bash
# Run with default settings (markdown output, current directory)
bun run ctxdrop

# Specify output format
ctxdrop --output md    # markdown (default)
ctxdrop --output xml   # XML
ctxdrop --output txt   # plain text

# Output raw file paths with content (no formatting wrapper)
ctxdrop --raw

# Target specific directory
ctxdrop --dir ./src

# Combine flags
ctxdrop --raw --dir ./src --output xml
```

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--raw` | `-r` | Output raw file paths with content | `false` |
| `--output` | `-o` | Output format: `md` \| `xml` \| `txt` | `md` |
| `--dir` | `-d` | Target directory | `.` |

## Development

```bash
# Run without building
bun run dev

# Type check
bun run typecheck

# Build for production
bun run build
```

## Project Structure

```
ctxdrop/
├── src/
│   ├── cli.ts              # Entry point
│   ├── commands/
│   │   └── run.ts          # Run command
│   ├── core/
│   │   ├── scanner.ts      # Directory walker
│   │   ├── filter.ts       # Ignore patterns
│   │   └── formatter.ts    # Output formatters
│   └── utils/
│       └── logger.ts       # CLI logger
├── package.json
└── tsconfig.json
```
