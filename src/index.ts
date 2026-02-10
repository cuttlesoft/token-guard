import * as core from '@actions/core';
import * as path from 'path';
import { processFiles, type ProcessorOptions } from './fileProcessor';
import type { TiktokenEncoding } from 'js-tiktoken';

const VALID_ENCODINGS: TiktokenEncoding[] = [
  'cl100k_base',
  'o200k_base',
  'p50k_base',
  'p50k_edit',
  'r50k_base',
];

async function run(): Promise<void> {
  try {
    const patterns = core.getMultilineInput('patterns', { required: true });
    const maxTokens = parseInt(core.getInput('max_tokens') || '2500', 10);
    const mode = core.getInput('token_limit_mode') || 'total';
    const encoding = (core.getInput('encoding') || 'cl100k_base') as TiktokenEncoding;

    if (isNaN(maxTokens) || maxTokens < 0) {
      core.setFailed(`Invalid max_tokens value: must be a non-negative integer`);
      return;
    }

    if (mode !== 'total' && mode !== 'per_file') {
      core.setFailed(`Invalid token_limit_mode: "${mode}". Must be "total" or "per_file"`);
      return;
    }

    if (!VALID_ENCODINGS.includes(encoding)) {
      core.setFailed(`Invalid encoding: "${encoding}". Must be one of: ${VALID_ENCODINGS.join(', ')}`);
      return;
    }

    const options: ProcessorOptions = { patterns, maxTokens, mode, encoding };
    const result = await processFiles(options);

    const cwd = process.cwd();

    // Log per-file table
    core.info('');
    core.info('File Token Counts');
    core.info('─'.repeat(60));
    for (const file of result.files) {
      const rel = path.relative(cwd, file.path);
      const status = file.overLimit ? ' [OVER LIMIT]' : '';
      core.info(`  ${rel}: ${file.tokens.toLocaleString()} tokens${status}`);
    }
    core.info('─'.repeat(60));
    core.info(`  Total: ${result.totalTokens.toLocaleString()} tokens across ${result.files.length} file(s)`);
    core.info(`  Mode: ${mode} | Limit: ${maxTokens.toLocaleString()} | Encoding: ${encoding}`);
    core.info('');

    // Write GitHub Job Summary
    await core.summary
      .addHeading('Token Check Results', 2)
      .addTable([
        [
          { data: 'File', header: true },
          { data: 'Tokens', header: true },
          { data: 'Status', header: true },
        ],
        ...result.files.map(file => {
          const rel = path.relative(cwd, file.path);
          const status = file.overLimit ? '⛔ Over limit' : '✅ Pass';
          return [rel, file.tokens.toLocaleString(), status];
        }),
        [
          `**Total (${result.files.length} files)**`,
          `**${result.totalTokens.toLocaleString()}**`,
          result.limitExceeded ? '⛔ Over limit' : '✅ Pass',
        ],
      ])
      .addRaw(`\n**Mode:** ${mode} | **Limit:** ${maxTokens.toLocaleString()} | **Encoding:** ${encoding}`)
      .write();

    // Set outputs
    core.setOutput('total_tokens', result.totalTokens.toString());
    core.setOutput('file_count', result.files.length.toString());
    core.setOutput('files_over_limit', result.filesOverLimit.map(f => path.relative(cwd, f)).join(','));

    // Fail if limit exceeded
    if (result.limitExceeded) {
      if (mode === 'total') {
        core.setFailed(
          `Total token count (${result.totalTokens.toLocaleString()}) exceeds limit of ${maxTokens.toLocaleString()}`
        );
      } else {
        core.setFailed(
          `${result.filesOverLimit.length} file(s) exceed the per-file limit of ${maxTokens.toLocaleString()} tokens`
        );
      }
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
