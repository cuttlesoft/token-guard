import * as fs from 'fs/promises';
import * as glob from '@actions/glob';
import * as core from '@actions/core';
import { TokenCounter } from './tokenCounter';
import type { TiktokenEncoding } from 'js-tiktoken';

export interface FileResult {
  path: string;
  tokens: number;
  overLimit: boolean;
}

export interface ProcessResult {
  files: FileResult[];
  totalTokens: number;
  filesOverLimit: string[];
  limitExceeded: boolean;
}

export interface ProcessorOptions {
  patterns: string[];
  maxTokens: number;
  mode: 'total' | 'per_file';
  encoding: TiktokenEncoding;
}

export async function processFiles(options: ProcessorOptions): Promise<ProcessResult> {
  const { patterns, maxTokens, mode, encoding } = options;

  const globber = await glob.create(patterns.join('\n'));
  const matchedPaths = await globber.glob();

  const counter = new TokenCounter(encoding);
  const files: FileResult[] = [];
  let totalTokens = 0;
  const filesOverLimit: string[] = [];

  try {
    for (const filePath of matchedPaths) {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) continue;

      const tokens = await counter.countFile(filePath);
      const overLimit = mode === 'per_file' && tokens > maxTokens;

      if (overLimit) {
        filesOverLimit.push(filePath);
      }

      files.push({ path: filePath, tokens, overLimit });
      totalTokens += tokens;
    }
  } finally {
    counter.free();
  }

  const limitExceeded =
    mode === 'total'
      ? totalTokens > maxTokens
      : filesOverLimit.length > 0;

  return { files, totalTokens, filesOverLimit, limitExceeded };
}
