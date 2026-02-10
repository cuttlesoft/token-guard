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
const tokenCounter_1 = require("../src/tokenCounter");
const fixtures_1 = require("./helpers/fixtures");
jest.mock('@actions/core', () => ({
    warning: jest.fn(),
    info: jest.fn(),
}));
const core = __importStar(require("@actions/core"));
describe('TokenCounter', () => {
    let fixture;
    beforeAll(async () => {
        fixture = await (0, fixtures_1.createTempFixture)();
    });
    afterAll(async () => {
        await fixture.cleanup();
    });
    it('counts tokens in a plain text file', async () => {
        const filePath = await fixture.createFile('plain.txt', 'Hello world, this is a test of token counting.');
        const counter = new tokenCounter_1.TokenCounter('cl100k_base');
        try {
            const tokens = await counter.countFile(filePath);
            expect(tokens).toBeGreaterThan(0);
        }
        finally {
            counter.free();
        }
    });
    it('returns 0 for an empty file', async () => {
        const filePath = await fixture.createFile('empty.txt', '');
        const counter = new tokenCounter_1.TokenCounter('cl100k_base');
        try {
            const tokens = await counter.countFile(filePath);
            expect(tokens).toBe(0);
        }
        finally {
            counter.free();
        }
    });
    it('returns 0 for a binary file and emits warning', async () => {
        const filePath = await fixture.createBinaryFile('image.png');
        const counter = new tokenCounter_1.TokenCounter('cl100k_base');
        try {
            const tokens = await counter.countFile(filePath);
            expect(tokens).toBe(0);
            expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Skipping binary file'));
        }
        finally {
            counter.free();
        }
    });
    it('counts tokens with different encodings', async () => {
        const content = 'The quick brown fox jumps over the lazy dog.';
        const filePath = await fixture.createFile('encodings.txt', content);
        const counterCl100k = new tokenCounter_1.TokenCounter('cl100k_base');
        const counterO200k = new tokenCounter_1.TokenCounter('o200k_base');
        try {
            const tokensCl100k = await counterCl100k.countFile(filePath);
            const tokensO200k = await counterO200k.countFile(filePath);
            expect(tokensCl100k).toBeGreaterThan(0);
            expect(tokensO200k).toBeGreaterThan(0);
        }
        finally {
            counterCl100k.free();
            counterO200k.free();
        }
    });
    it('handles unicode and multi-byte content', async () => {
        const content = '你好世界 🌍 こんにちは emoji: 🚀🎉';
        const filePath = await fixture.createFile('unicode.txt', content);
        const counter = new tokenCounter_1.TokenCounter('cl100k_base');
        try {
            const tokens = await counter.countFile(filePath);
            expect(tokens).toBeGreaterThan(0);
        }
        finally {
            counter.free();
        }
    });
    it('handles large files', async () => {
        const line = 'This is a line of text for testing token counts in large files.\n';
        const content = line.repeat(500);
        const filePath = await fixture.createFile('large.txt', content);
        const counter = new tokenCounter_1.TokenCounter('cl100k_base');
        try {
            const tokens = await counter.countFile(filePath);
            expect(tokens).toBeGreaterThan(100);
        }
        finally {
            counter.free();
        }
    });
    it('free() does not throw', () => {
        const counter = new tokenCounter_1.TokenCounter('cl100k_base');
        expect(() => counter.free()).not.toThrow();
    });
});
