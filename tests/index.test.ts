import * as glob from '@actions/glob';
import { createTempFixture, type TempFixture } from './helpers/fixtures';

// Must declare mocks before importing the module under test
const mockSetOutput = jest.fn();
const mockSetFailed = jest.fn();
const mockInfo = jest.fn();
const mockWarning = jest.fn();
const mockGetInput = jest.fn();
const mockGetMultilineInput = jest.fn();
const mockSummary = {
  addHeading: jest.fn().mockReturnThis(),
  addTable: jest.fn().mockReturnThis(),
  addRaw: jest.fn().mockReturnThis(),
  write: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@actions/core', () => ({
  getInput: mockGetInput,
  getMultilineInput: mockGetMultilineInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed,
  info: mockInfo,
  warning: mockWarning,
  summary: mockSummary,
}));

jest.mock('@actions/glob');
const mockGlob = glob as jest.Mocked<typeof glob>;

function setupGlobMock(files: string[]) {
  mockGlob.create.mockResolvedValue({
    glob: jest.fn().mockResolvedValue(files),
    globGenerator: jest.fn(),
    getSearchPaths: jest.fn().mockReturnValue([]),
  } as unknown as glob.Globber);
}

function setInputs(inputs: Record<string, string | string[]>) {
  mockGetMultilineInput.mockImplementation((name: string) => {
    const val = inputs[name];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split('\n').filter(x => x.trim() !== '').map(x => x.trim());
    return [];
  });
  mockGetInput.mockImplementation((name: string) => {
    const val = inputs[name];
    if (Array.isArray(val)) return val.join('\n');
    return val || '';
  });
}

import { run } from '../src/index';

describe('action entry point', () => {
  let fixture: TempFixture;

  beforeAll(async () => {
    fixture = await createTempFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset summary chain mocks
    mockSummary.addHeading.mockReturnThis();
    mockSummary.addTable.mockReturnThis();
    mockSummary.addRaw.mockReturnThis();
    mockSummary.write.mockResolvedValue(undefined);
  });

  it('passes with tokens under total limit', async () => {
    const file = await fixture.createFile('pass.md', 'Hello world');
    setInputs({ patterns: [file], max_tokens: '50000', token_limit_mode: 'total', encoding: 'cl100k_base' });
    setupGlobMock([file]);

    await run();

    expect(mockSetFailed).not.toHaveBeenCalled();
    expect(mockSetOutput).toHaveBeenCalledWith('total_tokens', expect.any(String));
    expect(mockSetOutput).toHaveBeenCalledWith('file_count', '1');
  });

  it('fails when total tokens exceed limit', async () => {
    const file = await fixture.createFile('fail-total.md', 'This has more than one token for sure');
    setInputs({ patterns: [file], max_tokens: '1', token_limit_mode: 'total', encoding: 'cl100k_base' });
    setupGlobMock([file]);

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringMatching(/exceeds limit/));
  });

  it('fails when per-file tokens exceed limit', async () => {
    const file = await fixture.createFile('fail-perfile.md', 'word '.repeat(100));
    setInputs({ patterns: [file], max_tokens: '5', token_limit_mode: 'per_file', encoding: 'cl100k_base' });
    setupGlobMock([file]);

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringMatching(/file\(s\) exceed/));
  });

  it('passes in per_file mode when all under limit', async () => {
    const file = await fixture.createFile('pass-perfile.md', 'Short');
    setInputs({ patterns: [file], max_tokens: '50000', token_limit_mode: 'per_file', encoding: 'cl100k_base' });
    setupGlobMock([file]);

    await run();

    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  it('fails on NaN max_tokens', async () => {
    setInputs({ patterns: ['*.md'], max_tokens: 'abc', token_limit_mode: 'total', encoding: 'cl100k_base' });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid max_tokens'));
  });

  it('fails on negative max_tokens', async () => {
    setInputs({ patterns: ['*.md'], max_tokens: '-5', token_limit_mode: 'total', encoding: 'cl100k_base' });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid max_tokens'));
  });

  it('fails on invalid mode', async () => {
    setInputs({ patterns: ['*.md'], max_tokens: '2500', token_limit_mode: 'invalid', encoding: 'cl100k_base' });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid token_limit_mode'));
  });

  it('fails on invalid encoding', async () => {
    setInputs({ patterns: ['*.md'], max_tokens: '2500', token_limit_mode: 'total', encoding: 'fake_encoding' });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid encoding'));
  });

  it('sets correct outputs', async () => {
    const file1 = await fixture.createFile('out1.md', 'Hello');
    const file2 = await fixture.createFile('out2.md', 'World');
    setInputs({ patterns: ['*.md'], max_tokens: '50000', token_limit_mode: 'total', encoding: 'cl100k_base' });
    setupGlobMock([file1, file2]);

    await run();

    expect(mockSetOutput).toHaveBeenCalledWith('total_tokens', expect.any(String));
    expect(mockSetOutput).toHaveBeenCalledWith('file_count', '2');
    expect(mockSetOutput).toHaveBeenCalledWith('files_over_limit', '');
  });

  it('writes job summary', async () => {
    const file = await fixture.createFile('summary.md', 'Summary test content');
    setInputs({ patterns: [file], max_tokens: '50000', token_limit_mode: 'total', encoding: 'cl100k_base' });
    setupGlobMock([file]);

    await run();

    expect(mockSummary.addHeading).toHaveBeenCalled();
    expect(mockSummary.addTable).toHaveBeenCalled();
    expect(mockSummary.write).toHaveBeenCalled();
  });

  it('handles processFiles error gracefully', async () => {
    setInputs({ patterns: ['*.md'], max_tokens: '2500', token_limit_mode: 'total', encoding: 'cl100k_base' });
    mockGlob.create.mockRejectedValue(new Error('glob exploded'));

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith('glob exploded');
  });
});
