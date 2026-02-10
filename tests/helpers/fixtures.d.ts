export interface TempFixture {
    dir: string;
    createFile(relPath: string, content: string): Promise<string>;
    createBinaryFile(relPath: string): Promise<string>;
    cleanup(): Promise<void>;
}
export declare function createTempFixture(): Promise<TempFixture>;
