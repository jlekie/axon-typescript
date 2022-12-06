declare module 'lz4-asm' {
    export function compress(data: Buffer): Buffer;
    export function decompress(data: Buffer): Buffer;
}
