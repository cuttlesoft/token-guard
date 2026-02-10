import * as fs from 'fs/promises';
import * as core from '@actions/core';
import { getEncoding, type TiktokenEncoding } from 'js-tiktoken';

const BINARY_CHECK_SIZE = 8192;

export class TokenCounter {
  private encoder;

  constructor(encoding: TiktokenEncoding = 'cl100k_base') {
    this.encoder = getEncoding(encoding);
  }

  async countFile(filePath: string): Promise<number> {
    const buffer = await fs.readFile(filePath);

    const checkSlice = buffer.subarray(0, BINARY_CHECK_SIZE);
    if (checkSlice.includes(0)) {
      core.warning(`Skipping binary file: ${filePath}`);
      return 0;
    }

    const content = buffer.toString('utf-8');
    return this.encoder.encode(content).length;
  }

  free(): void {
    // js-tiktoken is pure JS, no cleanup needed (unlike wasm tiktoken)
  }
}
