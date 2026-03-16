# ctxdrop

Pack your codebase into a single context file, ready for any AI agent.

## Installation

```bash
bun install
bun run build
```

## Usage

```bash
# Run with default settings
bun run ctxdrop

# Specify output format
ctxdrop run --format md    # markdown (default)
ctxdrop run --format xml   # XML
ctxdrop run --format txt   # plain text
ctxdrop run --format manifest   # JSON manifest for AI tools
ctxdrop run --format structured # structured markdown with structure map

# Include code structure (functions/classes with line ranges)
ctxdrop run --structure

# Skip AI summarization, only generate structure
ctxdrop run --noai

# Skip loading AGENTS.md/CLAUDE.md rules
ctxdrop run --no-rules

# Load .claudeignore patterns
ctxdrop run --claudeignore

# Target specific directory via config
ctxdrop run --config ./my-config.json
```

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--config` | `-c` | Config.json file path | `ctxdrop.json` |
| `--output` | `-o` | Output directory | `./context` |
| `--format` | `-f` | Output format: `md` \| `xml` \| `txt` \| `manifest` \| `structured` | `md` |
| `--style` | `-s` | Summarization style: `detailed` \| `brief` \| `minimal` | `brief` |
| `--noai` | - | Skip AI summary, only generate structure | `false` |
| `--rules` | - | Load AGENTS.md/CLAUDE.md rules (use `--no-rules` to disable) | `true` |
| `--claudeignore` | - | Load .claudeignore patterns | `false` |
| `--structure` | `-S` | Include code structure map (functions, classes with line ranges) | `false` |

## Output Formats

- **md** - Standard markdown with file contents
- **xml** - XML format with CDATA sections
- **txt** - Plain text format
- **manifest** - JSON format with file structures for programmatic access
- **structured** - Enhanced markdown with structure map and on-demand loading guide

## Configuration

Create a `ctxdrop.json` file:

```json
{
  "model": {
    "model_name": "gpt-4",
    "api_key": "your-api-key",
    "api_base": "https://api.openai.com/v1"
  },
  "src": "./src/",
  "output": "./context",
  "rules": {
    "enabled": true,
    "files": ["AGENTS.md", "CLAUDE.md"],
    "loadFromParents": true
  },
  "ignoreFiles": [".gitignore"]
}
```

## Features

- **Two-pass AI summarization** - Selects important files before generating summary
- **Project rules** - Automatically loads AGENTS.md/CLAUDE.md for AI context
- **Code structure detection** - Identifies functions, classes, interfaces with line ranges
- **On-demand loading** - Structure map helps AI tools read specific code sections
- **Custom ignore patterns** - Supports .gitignore and .claudeignore

## Development

```bash
# Run without building
bun run dev

# Type check
bun run typecheck

# Build for production
bun run build
```
