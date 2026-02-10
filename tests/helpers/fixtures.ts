import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface TempFixture {
  dir: string;
  createFile(relPath: string, content: string): Promise<string>;
  createBinaryFile(relPath: string): Promise<string>;
  cleanup(): Promise<void>;
}

export async function createTempFixture(): Promise<TempFixture> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'token-guard-test-'));

  return {
    dir,

    async createFile(relPath: string, content: string): Promise<string> {
      const abs = path.join(dir, relPath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, 'utf-8');
      return abs;
    },

    async createBinaryFile(relPath: string): Promise<string> {
      const abs = path.join(dir, relPath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      const buf = Buffer.alloc(256);
      buf[0] = 0x89;
      buf[1] = 0x50;
      buf[10] = 0x00; // null byte triggers binary detection
      await fs.writeFile(abs, buf);
      return abs;
    },

    async cleanup(): Promise<void> {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
