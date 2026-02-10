import { type TiktokenEncoding } from 'js-tiktoken';
export declare class TokenCounter {
    private encoder;
    constructor(encoding?: TiktokenEncoding);
    countFile(filePath: string): Promise<number>;
    free(): void;
}
