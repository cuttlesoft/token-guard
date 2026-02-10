# token-guard

[![AI and machine learning development and consulting services. Specialized in LLM integration, AI product development, and custom AI solutions. Expert developers building intelligent applications for modern business needs.](https://static.cuttlesoft.com/wp-content/uploads/2026/02/10171038/970x250-banner-variation-23.png)](https://cuttlesoft.com/services/ai-ml-development-and-consulting/)

A GitHub Action that counts tokens in your files using [tiktoken](https://github.com/openai/tiktoken) and enforces configurable limits. Catch context window overflows in CI before they hit production.

## 📦 Install

Add to any workflow — no installation required. Zero-config defaults target known LLM instruction files (Claude, Cursor, Copilot, Windsurf, Cline, etc.) with a 2,500 token limit:

```yaml
- uses: cuttlesoft/token-guard@v1
```

## ✨ Features

- **Glob Pattern Matching**

  Target files with flexible glob patterns, including `!` negation. One pattern per line.

- **Configurable Encoding**

  Supports all major tiktoken encodings: `cl100k_base` (GPT-4/3.5), `o200k_base` (GPT-4o), `p50k_base`, `p50k_edit`, and `r50k_base`.

- **Two Enforcement Modes**

  `total` mode checks the sum across all files. `per_file` mode checks each file individually.

- **GitHub Job Summary**

  Writes a markdown table to the job summary with per-file token counts and pass/fail status.

- **Binary File Detection**

  Automatically skips binary files to avoid false counts.

## Use Cases

1. **Prompt & context management:** Enforce token budgets on prompt templates, system instructions, or RAG documents checked into your repo.

2. **Documentation limits:** Keep markdown docs within context window limits for LLM-powered search and Q&A systems.

3. **CI guardrails:** Fail PRs that introduce files exceeding your token budget before they reach production.

## Quick Start

Create `.github/workflows/token-check.yml`:

```yaml
name: Token Guard

on: [push, pull_request]

jobs:
  check-tokens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cuttlesoft/token-guard@v1
```

### Custom patterns

Override the defaults to target specific files:

```yaml
- uses: cuttlesoft/token-guard@v1
  with:
    patterns: |
      docs/**/*.md
      prompts/**/*.txt
    max_tokens: "4000"
```

### Per-file mode

Enforce limits on each file individually:

```yaml
- uses: cuttlesoft/token-guard@v1
  with:
    patterns: |
      prompts/**/*.md
    max_tokens: "1000"
    token_limit_mode: per_file
```

### Using outputs

```yaml
- uses: cuttlesoft/token-guard@v1
  id: tokens
  with:
    max_tokens: '100000'
- run: echo "Total tokens: ${{ steps.tokens.outputs.total_tokens }}"
```

## Sample Output

### Console log

```
File Token Counts
────────────────────────────────────────────────────────────
  docs/getting-started.md: 1,243 tokens
  docs/api-reference.md: 3,891 tokens [OVER LIMIT]
  docs/faq.md: 487 tokens
────────────────────────────────────────────────────────────
  Total: 5,621 tokens across 3 file(s)
  Mode: per_file | Limit: 2,500 | Encoding: cl100k_base
```

### Job summary

| File                    | Tokens    | Status                  |
| ----------------------- | --------- | ----------------------- |
| docs/getting-started.md | 1,243     | :white_check_mark: Pass |
| docs/api-reference.md   | 3,891     | :no_entry: Over limit   |
| docs/faq.md             | 487       | :white_check_mark: Pass |
| **Total (3 files)**     | **5,621** | :no_entry: Over limit   |

**Mode:** per_file | **Limit:** 2,500 | **Encoding:** cl100k_base

## Inputs

| Name               | Required | Default                                    | Description                                                                                |
| ------------------ | -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `patterns`         | Yes      | [LLM instruction files](#default-patterns) | Glob patterns targeting LLM instruction/config files, one per line. Supports `!` negation. |
| `max_tokens`       | No       | `2500`                                     | Token limit threshold                                                                      |
| `token_limit_mode` | No       | `total`                                    | `total` (sum) or `per_file` (each file)                                                    |
| `encoding`         | No       | `cl100k_base`                              | Tiktoken encoding                                                                          |

### Default Patterns

Out of the box, Token Guard targets known LLM instruction and configuration files:

| Pattern                                                                      | Tool                      |
| ---------------------------------------------------------------------------- | ------------------------- |
| `**/CLAUDE.md`, `.claude/**`                                                 | Claude Code               |
| `**/AGENTS.md`                                                               | OpenAI Codex              |
| `.cursorrules`, `.cursor/rules/**`                                           | Cursor                    |
| `.windsurfrules`                                                             | Windsurf                  |
| `.clinerules`                                                                | Cline                     |
| `.github/copilot-instructions.md`, `.github/prompts/**`, `.github/agents/**` | GitHub Copilot            |
| `prompts/**`, `.prompts/**`                                                  | Common prompt directories |

## Outputs

| Name               | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `total_tokens`     | Sum of tokens across all matched files                    |
| `file_count`       | Number of files processed                                 |
| `files_over_limit` | Comma-separated paths of files over limit (per_file mode) |

## ⚖️ License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## 🤝 Need Help with Your AI/ML Project?

Cuttlesoft specializes in [AI/ML development and consulting](https://cuttlesoft.com/services/ai-ml-development-and-consulting/), including LLM integration, AI product development, and custom AI solutions. Whether you need help building RAG pipelines, fine-tuning models, or shipping AI-powered features to production, our team of expert developers is here to help.

[Contact us](https://cuttlesoft.com/contact/) to discuss how we can bring AI to your project!
