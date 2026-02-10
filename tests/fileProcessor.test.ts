import * as glob from '@actions/glob';
import { processFiles, type ProcessorOptions } from '../src/fileProcessor';
import { createTempFixture, type TempFixture } from './helpers/fixtures';

jest.mock('@actions/glob');
jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  info: jest.fn(),
}));

const mockGlob = glob as jest.Mocked<typeof glob>;

function setupGlobMock(files: string[]) {
  mockGlob.create.mockResolvedValue({
    glob: jest.fn().mockResolvedValue(files),
    globGenerator: jest.fn(),
    getSearchPaths: jest.fn().mockReturnValue([]),
  } as unknown as glob.Globber);
}

describe('processFiles', () => {
  let fixture: TempFixture;

  beforeAll(async () => {
    fixture = await createTempFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  const baseOptions = (overrides: Partial<ProcessorOptions> = {}): ProcessorOptions => ({
    patterns: ['**/*.md'],
    maxTokens: 50000,
    mode: 'total',
    encoding: 'cl100k_base',
    ...overrides,
  });

  it('total mode: under limit passes', async () => {
    const file1 = await fixture.createFile('a.md', 'Hello world');
    const file2 = await fixture.createFile('b.md', 'Goodbye world');
    setupGlobMock([file1, file2]);

    const result = await processFiles(baseOptions({ maxTokens: 50000 }));

    expect(result.limitExceeded).toBe(false);
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.files).toHaveLength(2);
    expect(result.filesOverLimit).toHaveLength(0);
  });

  it('total mode: over limit fails', async () => {
    const file1 = await fixture.createFile('c.md', 'Hello world');
    setupGlobMock([file1]);

    const result = await processFiles(baseOptions({ maxTokens: 1 }));

    expect(result.limitExceeded).toBe(true);
    expect(result.totalTokens).toBeGreaterThan(1);
  });

  it('per_file mode: all under limit passes', async () => {
    const file1 = await fixture.createFile('d.md', 'Short');
    const file2 = await fixture.createFile('e.md', 'Also short');
    setupGlobMock([file1, file2]);

    const result = await processFiles(baseOptions({ mode: 'per_file', maxTokens: 50000 }));

    expect(result.limitExceeded).toBe(false);
    expect(result.files.every(f => !f.overLimit)).toBe(true);
  });

  it('per_file mode: one file over limit', async () => {
    const small = await fixture.createFile('small.md', 'Hi');
    const large = await fixture.createFile('large.md', 'word '.repeat(500));
    setupGlobMock([small, large]);

    const result = await processFiles(baseOptions({ mode: 'per_file', maxTokens: 10 }));

    expect(result.limitExceeded).toBe(true);
    expect(result.filesOverLimit).toHaveLength(1);
    expect(result.filesOverLimit[0]).toBe(large);
    expect(result.files.find(f => f.path === small)?.overLimit).toBe(false);
    expect(result.files.find(f => f.path === large)?.overLimit).toBe(true);
  });

  it('skips directories in glob results', async () => {
    const file = await fixture.createFile('sub/file.md', 'Content');
    const dirPath = fixture.dir; // a directory path
    setupGlobMock([dirPath, file]);

    const result = await processFiles(baseOptions());

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe(file);
  });

  it('returns 0 tokens for binary files', async () => {
    const binary = await fixture.createBinaryFile('data.bin');
    setupGlobMock([binary]);

    const result = await processFiles(baseOptions({ maxTokens: 50000 }));

    expect(result.files).toHaveLength(1);
    expect(result.files[0].tokens).toBe(0);
    expect(result.limitExceeded).toBe(false);
  });

  it('handles empty file list', async () => {
    setupGlobMock([]);

    const result = await processFiles(baseOptions());

    expect(result.files).toHaveLength(0);
    expect(result.totalTokens).toBe(0);
    expect(result.limitExceeded).toBe(false);
  });

  it('rejects on nonexistent file', async () => {
    setupGlobMock(['/nonexistent/path/file.md']);

    await expect(processFiles(baseOptions())).rejects.toThrow();
  });

  it('uses specified encoding', async () => {
    const file = await fixture.createFile('enc.md', 'Testing with o200k_base encoding');
    setupGlobMock([file]);

    const result = await processFiles(baseOptions({ encoding: 'o200k_base' }));

    expect(result.totalTokens).toBeGreaterThan(0);
  });
});
