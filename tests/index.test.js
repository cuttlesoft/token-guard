"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const glob = __importStar(require("@actions/glob"));
const fixtures_1 = require("./helpers/fixtures");
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
const mockGlob = glob;
function setupGlobMock(files) {
    mockGlob.create.mockResolvedValue({
        glob: jest.fn().mockResolvedValue(files),
        globGenerator: jest.fn(),
        getSearchPaths: jest.fn().mockReturnValue([]),
    });
}
function setInputs(inputs) {
    mockGetMultilineInput.mockImplementation((name) => {
        const val = inputs[name];
        if (Array.isArray(val))
            return val;
        if (typeof val === 'string')
            return val.split('\n').filter(x => x.trim() !== '').map(x => x.trim());
        return [];
    });
    mockGetInput.mockImplementation((name) => {
        const val = inputs[name];
        if (Array.isArray(val))
            return val.join('\n');
        return val || '';
    });
}
const index_1 = require("../src/index");
describe('action entry point', () => {
    let fixture;
    beforeAll(async () => {
        fixture = await (0, fixtures_1.createTempFixture)();
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
        await (0, index_1.run)();
        expect(mockSetFailed).not.toHaveBeenCalled();
        expect(mockSetOutput).toHaveBeenCalledWith('total_tokens', expect.any(String));
        expect(mockSetOutput).toHaveBeenCalledWith('file_count', '1');
    });
    it('fails when total tokens exceed limit', async () => {
        const file = await fixture.createFile('fail-total.md', 'This has more than one token for sure');
        setInputs({ patterns: [file], max_tokens: '1', token_limit_mode: 'total', encoding: 'cl100k_base' });
        setupGlobMock([file]);
        await (0, index_1.run)();
        expect(mockSetFailed).toHaveBeenCalledWith(expect.stringMatching(/exceeds limit/));
    });
    it('fails when per-file tokens exceed limit', async () => {
        const file = await fixture.createFile('fail-perfile.md', 'word '.repeat(100));
        setInputs({ patterns: [file], max_tokens: '5', token_limit_mode: 'per_file', encoding: 'cl100k_base' });
        setupGlobMock([file]);
        await (0, index_1.run)();
        expect(mockSetFailed).toHaveBeenCalledWith(expect.stringMatching(/file\(s\) exceed/));
    });
    it('passes in per_file mode when all under limit', async () => {
        const file = await fixture.createFile('pass-perfile.md', 'Short');
        setInputs({ patterns: [file], max_tokens: '50000', token_limit_mode: 'per_file', encoding: 'cl100k_base' });
        setupGlobMock([file]);
        await (0, index_1.run)();
        expect(mockSetFailed).not.toHaveBeenCalled();
    });
    it('fails on NaN max_tokens', async () => {
        setInputs({ patterns: ['*.md'], max_tokens: 'abc', token_limit_mode: 'total', encoding: 'cl100k_base' });
        await (0, index_1.run)();
        expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid max_tokens'));
    });
    it('fails on negative max_tokens', async () => {
        setInputs({ patterns: ['*.md'], max_tokens: '-5', token_limit_mode: 'total', encoding: 'cl100k_base' });
        await (0, index_1.run)();
        expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid max_tokens'));
    });
    it('fails on invalid mode', async () => {
        setInputs({ patterns: ['*.md'], max_tokens: '2500', token_limit_mode: 'invalid', encoding: 'cl100k_base' });
        await (0, index_1.run)();
        expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid token_limit_mode'));
    });
    it('fails on invalid encoding', async () => {
        setInputs({ patterns: ['*.md'], max_tokens: '2500', token_limit_mode: 'total', encoding: 'fake_encoding' });
        await (0, index_1.run)();
        expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid encoding'));
    });
    it('sets correct outputs', async () => {
        const file1 = await fixture.createFile('out1.md', 'Hello');
        const file2 = await fixture.createFile('out2.md', 'World');
        setInputs({ patterns: ['*.md'], max_tokens: '50000', token_limit_mode: 'total', encoding: 'cl100k_base' });
        setupGlobMock([file1, file2]);
        await (0, index_1.run)();
        expect(mockSetOutput).toHaveBeenCalledWith('total_tokens', expect.any(String));
        expect(mockSetOutput).toHaveBeenCalledWith('file_count', '2');
        expect(mockSetOutput).toHaveBeenCalledWith('files_over_limit', '');
    });
    it('writes job summary', async () => {
        const file = await fixture.createFile('summary.md', 'Summary test content');
        setInputs({ patterns: [file], max_tokens: '50000', token_limit_mode: 'total', encoding: 'cl100k_base' });
        setupGlobMock([file]);
        await (0, index_1.run)();
        expect(mockSummary.addHeading).toHaveBeenCalled();
        expect(mockSummary.addTable).toHaveBeenCalled();
        expect(mockSummary.write).toHaveBeenCalled();
    });
    it('handles processFiles error gracefully', async () => {
        setInputs({ patterns: ['*.md'], max_tokens: '2500', token_limit_mode: 'total', encoding: 'cl100k_base' });
        mockGlob.create.mockRejectedValue(new Error('glob exploded'));
        await (0, index_1.run)();
        expect(mockSetFailed).toHaveBeenCalledWith('glob exploded');
    });
});
