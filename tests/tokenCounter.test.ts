import { TokenCounter } from '../src/tokenCounter';
import { createTempFixture, type TempFixture } from './helpers/fixtures';

jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  info: jest.fn(),
}));

import * as core from '@actions/core';

describe('TokenCounter', () => {
  let fixture: TempFixture;

  beforeAll(async () => {
    fixture = await createTempFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('counts tokens in a plain text file', async () => {
    const filePath = await fixture.createFile('plain.txt', 'Hello world, this is a test of token counting.');
    const counter = new TokenCounter('cl100k_base');
    try {
      const tokens = await counter.countFile(filePath);
      expect(tokens).toBeGreaterThan(0);
    } finally {
      counter.free();
    }
  });

  it('returns 0 for an empty file', async () => {
    const filePath = await fixture.createFile('empty.txt', '');
    const counter = new TokenCounter('cl100k_base');
    try {
      const tokens = await counter.countFile(filePath);
      expect(tokens).toBe(0);
    } finally {
      counter.free();
    }
  });

  it('returns 0 for a binary file and emits warning', async () => {
    const filePath = await fixture.createBinaryFile('image.png');
    const counter = new TokenCounter('cl100k_base');
    try {
      const tokens = await counter.countFile(filePath);
      expect(tokens).toBe(0);
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Skipping binary file'));
    } finally {
      counter.free();
    }
  });

  it('counts tokens with different encodings', async () => {
    const content = 'The quick brown fox jumps over the lazy dog.';
    const filePath = await fixture.createFile('encodings.txt', content);

    const counterCl100k = new TokenCounter('cl100k_base');
    const counterO200k = new TokenCounter('o200k_base');
    try {
      const tokensCl100k = await counterCl100k.countFile(filePath);
      const tokensO200k = await counterO200k.countFile(filePath);
      expect(tokensCl100k).toBeGreaterThan(0);
      expect(tokensO200k).toBeGreaterThan(0);
    } finally {
      counterCl100k.free();
      counterO200k.free();
    }
  });

  it('handles unicode and multi-byte content', async () => {
    const content = '你好世界 🌍 こんにちは emoji: 🚀🎉';
    const filePath = await fixture.createFile('unicode.txt', content);
    const counter = new TokenCounter('cl100k_base');
    try {
      const tokens = await counter.countFile(filePath);
      expect(tokens).toBeGreaterThan(0);
    } finally {
      counter.free();
    }
  });

  it('handles large files', async () => {
    const line = 'This is a line of text for testing token counts in large files.\n';
    const content = line.repeat(500);
    const filePath = await fixture.createFile('large.txt', content);
    const counter = new TokenCounter('cl100k_base');
    try {
      const tokens = await counter.countFile(filePath);
      expect(tokens).toBeGreaterThan(100);
    } finally {
      counter.free();
    }
  });

  it('free() does not throw', () => {
    const counter = new TokenCounter('cl100k_base');
    expect(() => counter.free()).not.toThrow();
  });
});
