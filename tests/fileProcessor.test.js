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
const fileProcessor_1 = require("../src/fileProcessor");
const fixtures_1 = require("./helpers/fixtures");
jest.mock('@actions/glob');
jest.mock('@actions/core', () => ({
    warning: jest.fn(),
    info: jest.fn(),
}));
const mockGlob = glob;
function setupGlobMock(files) {
    mockGlob.create.mockResolvedValue({
        glob: jest.fn().mockResolvedValue(files),
        globGenerator: jest.fn(),
        getSearchPaths: jest.fn().mockReturnValue([]),
    });
}
describe('processFiles', () => {
    let fixture;
    beforeAll(async () => {
        fixture = await (0, fixtures_1.createTempFixture)();
    });
    afterAll(async () => {
        await fixture.cleanup();
    });
    const baseOptions = (overrides = {}) => ({
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
        const result = await (0, fileProcessor_1.processFiles)(baseOptions({ maxTokens: 50000 }));
        expect(result.limitExceeded).toBe(false);
        expect(result.totalTokens).toBeGreaterThan(0);
        expect(result.files).toHaveLength(2);
        expect(result.filesOverLimit).toHaveLength(0);
    });
    it('total mode: over limit fails', async () => {
        const file1 = await fixture.createFile('c.md', 'Hello world');
        setupGlobMock([file1]);
        const result = await (0, fileProcessor_1.processFiles)(baseOptions({ maxTokens: 1 }));
        expect(result.limitExceeded).toBe(true);
        expect(result.totalTokens).toBeGreaterThan(1);
    });
    it('per_file mode: all under limit passes', async () => {
        const file1 = await fixture.createFile('d.md', 'Short');
        const file2 = await fixture.createFile('e.md', 'Also short');
        setupGlobMock([file1, file2]);
        const result = await (0, fileProcessor_1.processFiles)(baseOptions({ mode: 'per_file', maxTokens: 50000 }));
        expect(result.limitExceeded).toBe(false);
        expect(result.files.every(f => !f.overLimit)).toBe(true);
    });
    it('per_file mode: one file over limit', async () => {
        const small = await fixture.createFile('small.md', 'Hi');
        const large = await fixture.createFile('large.md', 'word '.repeat(500));
        setupGlobMock([small, large]);
        const result = await (0, fileProcessor_1.processFiles)(baseOptions({ mode: 'per_file', maxTokens: 10 }));
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
        const result = await (0, fileProcessor_1.processFiles)(baseOptions());
        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toBe(file);
    });
    it('returns 0 tokens for binary files', async () => {
        const binary = await fixture.createBinaryFile('data.bin');
        setupGlobMock([binary]);
        const result = await (0, fileProcessor_1.processFiles)(baseOptions({ maxTokens: 50000 }));
        expect(result.files).toHaveLength(1);
        expect(result.files[0].tokens).toBe(0);
        expect(result.limitExceeded).toBe(false);
    });
    it('handles empty file list', async () => {
        setupGlobMock([]);
        const result = await (0, fileProcessor_1.processFiles)(baseOptions());
        expect(result.files).toHaveLength(0);
        expect(result.totalTokens).toBe(0);
        expect(result.limitExceeded).toBe(false);
    });
    it('rejects on nonexistent file', async () => {
        setupGlobMock(['/nonexistent/path/file.md']);
        await expect((0, fileProcessor_1.processFiles)(baseOptions())).rejects.toThrow();
    });
    it('uses specified encoding', async () => {
        const file = await fixture.createFile('enc.md', 'Testing with o200k_base encoding');
        setupGlobMock([file]);
        const result = await (0, fileProcessor_1.processFiles)(baseOptions({ encoding: 'o200k_base' }));
        expect(result.totalTokens).toBeGreaterThan(0);
    });
});
