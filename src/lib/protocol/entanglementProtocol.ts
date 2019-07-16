import { AProtocol, AProtocolReader, AProtocolWriter, ITransport, IProtocol, IProtocolReader, IProtocolWriter } from '../..';
import { ReadableStreamBuffer, WritableStreamBuffer } from 'stream-buffers';

export class EntanglementProtocol extends AProtocol {
    public constructor() {
        super();
    }

    public async writeData(transport: ITransport, metadata: Record<string, Buffer>, handler: (protocolWriter: IProtocolWriter) => void): Promise<void> {
        const buffer = new WritableStreamBuffer();

        const writer = new EntanglementProtocolWriter(transport, this, buffer);
        handler(writer);

        const data = buffer.getContents();
        if (!data)
            throw new Error('Buffer empty');

        await transport.send(data, metadata);
    }
    public async writeTaggedData(transport: ITransport, messageId: string, metadata: Record<string, Buffer>, handler: (protocolWriter: IProtocolWriter) => void): Promise<void> {
        const buffer = new WritableStreamBuffer();

        const writer = new EntanglementProtocolWriter(transport, this, buffer);
        handler(writer);

        const data = buffer.getContents();
        if (!data)
            throw new Error('Buffer empty');

        await transport.sendTagged(messageId, data, metadata);
    }

    public async readData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, metadata: Record<string, Buffer>) => TResult): Promise<TResult> {
        const { data, metadata } = await transport.receive();

        const buffer = new ReadableStreamBuffer({ chunkSize: data.length });

        const result = await new Promise<TResult>((resolve, reject) => {
            buffer.once('readable', async () => {
                try {
                    buffer.read();

                    const reader = new EntanglementProtocolReader(transport, this, buffer);
                    resolve(handler(reader, metadata));
                }
                catch (err) {
                    reject(err);
                }
            });

            buffer.put(data);
            buffer.stop();
        });

        return result;
    }
    public async readTaggedData<TResult = void>(transport: ITransport, messageId: string, handler: (protocolReader: IProtocolReader, metadata: Record<string, Buffer>) => TResult): Promise<TResult> {
        const { data, metadata } = await transport.receiveTagged(messageId);

        const buffer = new ReadableStreamBuffer({ chunkSize: data.length || this.decoderChunkSize });
        const decoderStream = MessagePack.createDecodeStream();

        const result = await new Promise<TResult>((resolve, reject) => {
            buffer.once('readable', async () => {
                try {
                    buffer.read();

                    const reader = new EntanglementProtocolReader(transport, this, decoderStream);
                    resolve(handler(reader, metadata));
                }
                catch (err) {
                    reject(err);
                }
            });

            buffer.put(data);
            buffer.stop();

            decoderStream.pause();
            buffer.pipe(decoderStream);
        });

        return result;
    }

    public async readBufferedTaggedData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, messageId: string, metadata: Record<string, Buffer>) => TResult): Promise<TResult> {
        const { tag, data, metadata } = await transport.receiveBufferedTagged();

        const buffer = new ReadableStreamBuffer({ chunkSize: data.length || this.decoderChunkSize });
        const decoderStream = MessagePack.createDecodeStream();

        const result = await new Promise<TResult>((resolve, reject) => {
            buffer.once('readable', async () => {
                try {
                    buffer.read();

                    const reader = new EntanglementProtocolReader(transport, this, decoderStream);
                    resolve(handler(reader, tag, metadata));
                }
                catch (err) {
                    reject(err);
                }
            });

            buffer.put(data);
            buffer.stop();

            decoderStream.pause();
            buffer.pipe(decoderStream);
        });

        return result;
    }

    public async writeAndReadData<TResult = void>(transport: ITransport, metadata: Record<string, Buffer>, handler: (protocolWriter: IProtocolWriter) => void): Promise<(readHandler: ((protocolReader: IProtocolReader, metadata: Record<string, Buffer>) => TResult)) => Promise<TResult>> {
        const buffer = new WritableStreamBuffer();
        const encoderStream = MessagePack.createEncodeStream();

        encoderStream.pipe(buffer);

        const writer = new EntanglementProtocolWriter(transport, this, encoderStream);
        handler(writer);

        encoderStream.end();

        const data = buffer.getContents();
        if (!data)
            throw new Error('Buffer empty');

        const receiveHandler = await transport.sendAndReceive(data, metadata);

        return async (readHandler) => {
            const { data, metadata } = await receiveHandler();

            const buffer = new ReadableStreamBuffer({ chunkSize: data.length || this.decoderChunkSize });
            const decoderStream = MessagePack.createDecodeStream();

            const result = await new Promise<TResult>((resolve, reject) => {
                buffer.once('readable', async () => {
                    try {
                        buffer.read();

                        const reader = new EntanglementProtocolReader(transport, this, decoderStream);
                        resolve(readHandler(reader, metadata));
                    }
                    catch (err) {
                        reject(err);
                    }
                });

                buffer.put(data);
                buffer.stop();

                decoderStream.pause();
                buffer.pipe(decoderStream);
            });

            return result;
        };
    }
}

export class EntanglementProtocolReader extends AProtocolReader {
    public readonly decoderStream: ReadableStreamBuffer;

    public constructor(transport: ITransport, protocol: IProtocol, decoderStream: ReadableStreamBuffer) {
        super(transport, protocol);

        this.decoderStream = decoderStream;
    }

    public readStringValue(): string {
        const lengthBuffer = this.decoderStream.read(4);
    }
    public readBooleanValue(): boolean {
        return this.read<boolean>();
    }
    public readByteValue(): number {
        return this.read<number>();
    }
    public readShortValue(): number {
        return this.read<number>();
    }
    public readIntegerValue(): number {
        return this.read<number>();
    }
    public readLongValue(): number {
        return this.read<number>();
    }
    public readFloatValue(): number {
        return this.read<number>();
    }
    public readDoubleValue(): number {
        return this.read<number>();
    }
    public readEnumValue<T>(): T {
        return this.read<T>();
    }
}

export class EntanglementProtocolWriter extends AProtocolWriter {
    public readonly encoderStream: WritableStreamBuffer;

    public constructor(transport: ITransport, protocol: IProtocol, encoderStream: WritableStreamBuffer) {
        super(transport, protocol);

        this.encoderStream = encoderStream;
    }

    public writeStringValue(value: string) {
        const contentBuffer = Buffer.from(value, 'utf8');

        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeInt32BE(contentBuffer.length, 0);

        this.encoderStream.write(lengthBuffer);
        this.encoderStream.write(contentBuffer);
    }
    public writeBooleanValue(value: boolean) {
        const buffer = Buffer.alloc(1);
        buffer.writeIntBE(value ? 1 : 0, 0, 1);

        this.encoderStream.write(buffer);
    }
    public writeByteValue(value: number) {
        const buffer = Buffer.alloc(1);
        buffer.writeInt8(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeShortValue(value: number) {
        const buffer = Buffer.alloc(2);
        buffer.writeInt16BE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeIntegerValue(value: number) {
        const buffer = Buffer.alloc(4);
        buffer.writeInt32BE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeLongValue(value: number) {
        throw new Error('not implemented');
    }
    public writeFloatValue(value: number) {
        const buffer = Buffer.alloc(4);
        buffer.writeFloatBE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeDoubleValue(value: number) {
        const buffer = Buffer.alloc(8);
        buffer.writeDoubleBE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeEnumValue<T>(value: T) {
        const buffer = Buffer.alloc(4);
        buffer.writeInt32BE(<number><any>value, 0);

        this.encoderStream.write(buffer);
    }
}