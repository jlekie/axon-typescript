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
                    // buffer.read();

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

        const buffer = new ReadableStreamBuffer({ chunkSize: data.length });

        const result = await new Promise<TResult>((resolve, reject) => {
            buffer.once('readable', async () => {
                try {
                    // buffer.read();

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

    public async readBufferedTaggedData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, messageId: string, metadata: Record<string, Buffer>) => TResult): Promise<TResult> {
        const { tag, data, metadata } = await transport.receiveBufferedTagged();

        const buffer = new ReadableStreamBuffer({ chunkSize: data.length });

        const result = await new Promise<TResult>((resolve, reject) => {
            buffer.once('readable', async () => {
                try {
                    // buffer.read();

                    const reader = new EntanglementProtocolReader(transport, this, buffer);
                    resolve(handler(reader, tag, metadata));
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

    public async writeAndReadData<TResult = void>(transport: ITransport, metadata: Record<string, Buffer>, handler: (protocolWriter: IProtocolWriter) => void): Promise<(readHandler: ((protocolReader: IProtocolReader, metadata: Record<string, Buffer>) => TResult)) => Promise<TResult>> {
        const buffer = new WritableStreamBuffer();

        const writer = new EntanglementProtocolWriter(transport, this, buffer);
        handler(writer);

        const data = buffer.getContents();
        if (!data)
            throw new Error('Buffer empty');

        const receiveHandler = await transport.sendAndReceive(data, metadata);

        return async (readHandler) => {
            const { data, metadata } = await receiveHandler();

            const buffer = new ReadableStreamBuffer({ chunkSize: data.length });

            const result = await new Promise<TResult>((resolve, reject) => {
                buffer.once('readable', async () => {
                    try {
                        // buffer.read();

                        const reader = new EntanglementProtocolReader(transport, this, buffer);
                        resolve(readHandler(reader, metadata));
                    }
                    catch (err) {
                        reject(err);
                    }
                });

                buffer.put(data);
                buffer.stop();
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
        const lengthBuffer = this.read(4);
        const contentLength = lengthBuffer.readInt32LE(0);

        if (contentLength > 0) {
            const contentBuffer = this.read(contentLength);

            return contentBuffer.toString('utf8');
        }
        else {
            return '';
        }
    }
    public readBooleanValue(): boolean {
        const buffer = this.read(1);

        return buffer.readIntLE(0, 1) === 1;
    }
    public readByteValue(): number {
        const buffer = this.read(1);

        return buffer.readInt8(0);
    }
    public readShortValue(): number {
        const buffer = this.read(2);

        return buffer.readInt16LE(0);
    }
    public readIntegerValue(): number {
        const buffer = this.read(4);

        return buffer.readInt32LE(0);
    }
    public readLongValue(): number {
        throw new Error('not implemented');
    }
    public readFloatValue(): number {
        const buffer = this.read(4);

        return buffer.readFloatLE(0);
    }
    public readDoubleValue(): number {
        const buffer = this.read(8);

        return buffer.readDoubleLE(0);
    }
    public readEnumValue<T>(): T {
        const buffer = this.read(4);

        const enumValue = buffer.readInt32LE(0);

        return <T><any>enumValue;
    }

    private read(size: number): Buffer {
        return this.decoderStream.read(size);
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
        lengthBuffer.writeInt32LE(contentBuffer.length, 0);

        this.encoderStream.write(lengthBuffer);
        this.encoderStream.write(contentBuffer);
    }
    public writeBooleanValue(value: boolean) {
        const buffer = Buffer.alloc(1);
        buffer.writeIntLE(value ? 1 : 0, 0, 1);

        this.encoderStream.write(buffer);
    }
    public writeByteValue(value: number) {
        const buffer = Buffer.alloc(1);
        buffer.writeInt8(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeShortValue(value: number) {
        const buffer = Buffer.alloc(2);
        buffer.writeInt16LE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeIntegerValue(value: number) {
        const buffer = Buffer.alloc(4);
        buffer.writeInt32LE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeLongValue(value: number) {
        throw new Error('not implemented');
    }
    public writeFloatValue(value: number) {
        const buffer = Buffer.alloc(4);
        buffer.writeFloatLE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeDoubleValue(value: number) {
        const buffer = Buffer.alloc(8);
        buffer.writeDoubleLE(value, 0);

        this.encoderStream.write(buffer);
    }
    public writeEnumValue<T>(value: T) {
        const buffer = Buffer.alloc(4);
        buffer.writeInt32LE(<number><any>value, 0);

        this.encoderStream.write(buffer);
    }
}