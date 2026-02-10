import type { TiktokenEncoding } from 'js-tiktoken';
export interface FileResult {
    path: string;
    tokens: number;
    overLimit: boolean;
}
export interface ProcessResult {
    files: FileResult[];
    totalTokens: number;
    filesOverLimit: string[];
    limitExceeded: boolean;
}
export interface ProcessorOptions {
    patterns: string[];
    maxTokens: number;
    mode: 'total' | 'per_file';
    encoding: TiktokenEncoding;
}
export declare function processFiles(options: ProcessorOptions): Promise<ProcessResult>;
