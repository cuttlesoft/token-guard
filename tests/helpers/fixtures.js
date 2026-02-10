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
exports.createTempFixture = createTempFixture;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
async function createTempFixture() {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'token-guard-test-'));
    return {
        dir,
        async createFile(relPath, content) {
            const abs = path.join(dir, relPath);
            await fs.mkdir(path.dirname(abs), { recursive: true });
            await fs.writeFile(abs, content, 'utf-8');
            return abs;
        },
        async createBinaryFile(relPath) {
            const abs = path.join(dir, relPath);
            await fs.mkdir(path.dirname(abs), { recursive: true });
            const buf = Buffer.alloc(256);
            buf[0] = 0x89;
            buf[1] = 0x50;
            buf[10] = 0x00; // null byte triggers binary detection
            await fs.writeFile(abs, buf);
            return abs;
        },
        async cleanup() {
            await fs.rm(dir, { recursive: true, force: true });
        },
    };
}
