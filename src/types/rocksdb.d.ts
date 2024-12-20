declare module 'rocksdb' {
    export class RocksDB {
        constructor(path: string);
        close(): void;
        putSync(key: string, value: any): void;
        getSync(key: string): string | null;
    }
} 