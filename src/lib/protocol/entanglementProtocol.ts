import { AProtocol, AProtocolReader, AProtocolWriter, ITransport, IProtocol, IProtocolReader, IProtocolWriter, ITransportMetadata, TransportMessage, VolatileTransportMetadata } from '../..';

export class EntanglementProtocol extends AProtocol {
    public constructor() {
        super();
    }

    public read<T>(data: Buffer, handler: (reader: IProtocolReader) => T): T {
        const reader = new EntanglementProtocolReader(data);

        return handler(reader);
    }
    public write(handler: (writer: IProtocolWriter) => void): Buffer {
        const writer = new EntanglementProtocolWriter();
        handler(writer);

        return writer.getContents();
    }

    public async writeData(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void> {
        const writer = new EntanglementProtocolWriter();
        handler(writer);

        await transport.send(new TransportMessage(writer.getContents(), VolatileTransportMetadata.fromMetadata(metadata)));
    }
    public async writeTaggedData(transport: ITransport, messageId: string, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void> {
        const writer = new EntanglementProtocolWriter();
        handler(writer);

        await transport.sendTagged(messageId, new TransportMessage(writer.getContents(), VolatileTransportMetadata.fromMetadata(metadata)));
    }

    public async readData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult> {
        const receivedData = await transport.receive();
        const reader = new EntanglementProtocolReader(receivedData.payload);

        return handler(reader, receivedData.metadata);
    }
    public async readTaggedData<TResult = void>(transport: ITransport, messageId: string, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult> {
        const receivedData = await transport.receiveTagged(messageId);
        const reader = new EntanglementProtocolReader(receivedData.payload);

        return handler(reader, receivedData.metadata);
    }

    public async readBufferedTaggedData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, messageId: string, metadata: ITransportMetadata) => TResult): Promise<TResult> {
        const { id, message } = await transport.receiveBufferedTagged();

        const reader = new EntanglementProtocolReader(message.payload);

        return handler(reader, id, message.metadata);
    }

    public async writeAndReadData<TResult = void>(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<(readHandler: ((protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult)) => Promise<TResult>> {
        const writer = new EntanglementProtocolWriter();
        handler(writer);

        const receiveHandler = await transport.sendAndReceive(new TransportMessage(writer.getContents(), VolatileTransportMetadata.fromMetadata(metadata)));

        return async (readHandler) => {
            const { payload: data, metadata } = await receiveHandler();

            const reader = new EntanglementProtocolReader(data);

            return readHandler(reader, metadata);
        };
    }
}

export class EntanglementProtocolReader extends AProtocolReader {
    public readonly buffer: Buffer;

    private position: number;

    public constructor(buffer: Buffer) {
        super();

        this.buffer = buffer;
        this.position = 0;
    }

    public readData(): Buffer {
        const dataLength = this.buffer.readInt32LE(this.position);
        this.position += 4;

        return Buffer.from(this.buffer.slice(this.position, this.position += dataLength));
    }

    public readStringValue(): string {
        const contentLength = this.buffer.readInt32LE(this.position);
        this.position += 4

        if (contentLength > 0) {
            return this.buffer.toString('utf8', this.position, this.position += contentLength);
        }
        else {
            return '';
        }
    }
    public readBooleanValue(): boolean {
        const value = this.buffer.readIntLE(this.position, 1) === 1;
        this.position += 1;

        return value;
    }
    public readByteValue(): number {
        const value = this.buffer.readInt8(this.position);
        this.position += 1;

        return value;
    }
    public readShortValue(): number {
        const value = this.buffer.readInt16LE(this.position);
        this.position += 2;

        return value;
    }
    public readIntegerValue(): number {
        const value = this.buffer.readInt32LE(this.position);
        this.position += 4;

        return value;
    }
    public readLongValue(): bigint {
        const reversedBuffer = this.buffer.slice(this.position, this.position + 7).reverse();
        this.position += 8;

        const hex = reversedBuffer.toString('hex');
        if (hex.length === 0)
            return BigInt(0);
        else
            return BigInt(`0x${hex}`);
    }
    public readFloatValue(): number {
        const value = this.buffer.readFloatLE(this.position);
        this.position += 4;

        return value;
    }
    public readDoubleValue(): number {
        const value = this.buffer.readDoubleLE(this.position);
        this.position += 8;

        return value;
    }
    public readEnumValue<T>(): T {
        const value = this.buffer.readInt32LE(this.position);
        this.position += 4;

        return <T><any>value;
    }
}

export class EntanglementProtocolWriter extends AProtocolWriter {
    private buffer: Buffer;

    private position: number;

    public constructor() {
        super();

        this.buffer = Buffer.allocUnsafe(10 * 1024);
        this.position = 0;
    }

    public getContents() {
        const trimmedBuffer = Buffer.allocUnsafe(this.position + 1);
        this.buffer.copy(trimmedBuffer, 0, 0, this.position);

        return trimmedBuffer;
    }
    private checkPosition(length: number) {
        while (this.position + length > this.buffer.length) {
            // console.log('BUFFER OVERRUN', this.position + length, this.buffer.length, this.buffer.length * 2)
            const oldBuffer = this.buffer;
            this.buffer = Buffer.allocUnsafe(this.buffer.length * 2);
            oldBuffer.copy(this.buffer, 0, 0, oldBuffer.length);
            // this.buffer = Buffer.concat([ this.buffer ], this.buffer.length * 2);
        }
    }

    public writeData(value: Buffer) {
        this.checkPosition(4);
        this.buffer.writeInt32LE(value.length, this.position);
        this.position += 4;

        this.checkPosition(value.length);
        value.copy(this.buffer, this.position, 0, value.length);
        this.position += value.length;
    }

    public writeStringValue(value: string) {
        const contentLength = Buffer.byteLength(value, 'utf8');

        this.checkPosition(4);
        this.buffer.writeInt32LE(contentLength, this.position);
        this.position += 4;

        this.checkPosition(contentLength);
        this.buffer.write(value, this.position, 'utf8');
        this.position += contentLength;
    }
    public writeBooleanValue(value: boolean) {
        this.checkPosition(1);
        this.buffer.writeIntLE(value ? 1 : 0, this.position, 1);
        this.position += 1;
    }
    public writeByteValue(value: number) {
        this.checkPosition(1);
        this.buffer.writeInt8(value, this.position);
        this.position += 1;
    }
    public writeShortValue(value: number) {
        this.checkPosition(2);
        this.buffer.writeInt16LE(value, this.position);
        this.position += 2;
    }
    public writeIntegerValue(value: number) {
        this.checkPosition(4);
        this.buffer.writeInt32LE(value, this.position);
        this.position += 4;
    }
    public writeLongValue(value: BigInt) {
        const hex = value.toString(16);
        const contentLength = Buffer.byteLength(hex.padStart(8 * 2, '0').slice(0, 8 * 2), 'hex');

        this.checkPosition(contentLength);
        this.buffer.write(hex, this.position, 'hex');
        this.position += contentLength;
    }
    public writeFloatValue(value: number) {
        this.checkPosition(4);
        this.buffer.writeFloatLE(value, this.position);
        this.position += 4;
    }
    public writeDoubleValue(value: number) {
        this.checkPosition(8);
        this.buffer.writeDoubleLE(value, this.position);
        this.position += 8;
    }
    public writeEnumValue<T>(value: T) {
        this.checkPosition(4);
        this.buffer.writeInt32LE(<number><any>value, this.position);
        this.position += 4;
    }
}

// export class EntanglementAltChunckedProtocolWriter extends AProtocolWriter {
//     private buffers: Buffer[];

//     private position: number;

//     public constructor() {
//         super();

//         this.buffers = [];
//         this.position = 0;
//     }

//     public getContents() {
//         return Buffer.concat(this.buffers, this.position + 1);
//     }
//     private getBuffer(length: number) {
//         const totalLength = this.buffers.reduce((a, b) => a + b.length, 0);

//         if (this.position + length > totalLength) {
//             const buffer = Buffer.alloc(10 * 1024);

//             return buffer;
//         }
//         else {
//             return this.buffers[this.buffers.length - 1];
//         }
//     }

//     public writeData(value: Buffer) {
//         this.getBuffer(4).writeInt32LE(value.length, this.position);
//         this.position += 4;

//         value.copy(this.getBuffer(value.length), this.position, 0, value.length);
//         this.position += value.length;
//     }

//     public writeStringValue(value: string) {
//         const contentLength = Buffer.byteLength(value, 'utf8');

//         this.getBuffer(4).writeInt32LE(contentLength, this.position);
//         this.position += 4;

//         this.getBuffer(contentLength).write(value, this.position, 'utf8');
//         this.position += contentLength;
//     }
//     public writeBooleanValue(value: boolean) {
//         this.getBuffer(1).writeIntLE(value ? 1 : 0, this.position, 1);
//         this.position += 1;
//     }
//     public writeByteValue(value: number) {
//         this.getBuffer(1).writeInt8(value, this.position);
//         this.position += 1;
//     }
//     public writeShortValue(value: number) {
//         this.getBuffer(2).writeInt16LE(value, this.position);
//         this.position += 2;
//     }
//     public writeIntegerValue(value: number) {
//         this.getBuffer(4).writeInt32LE(value, this.position);
//         this.position += 4;
//     }
//     public writeLongValue(value: BigInt) {
//         const hex = value.toString(16);
//         const contentLength = Buffer.byteLength(hex.padStart(8 * 2, '0').slice(0, 8 * 2), 'hex');

//         this.getBuffer(contentLength).write(hex, this.position, 'hex');
//         this.position += contentLength;
//     }
//     public writeFloatValue(value: number) {
//         this.getBuffer(4).writeFloatLE(value, this.position);
//         this.position += 4;
//     }
//     public writeDoubleValue(value: number) {
//         this.getBuffer(8).writeDoubleLE(value, this.position);
//         this.position += 8;
//     }
//     public writeEnumValue<T>(value: T) {
//         this.getBuffer(4).writeInt32LE(<number><any>value, this.position);
//         this.position += 4;
//     }
// }

// class EntanglementCounterProtocolWriter extends AProtocolWriter {
//     private length: number;

//     public constructor() {
//         super();

//         this.length = 0;
//     }

//     public getLength() {
//         return this.length;
//     }

//     public writeStringValue(value: string) {
//         const contentLength = Buffer.byteLength(value, 'utf8');
//         this.length += 4 + contentLength;
//     }
//     public writeBooleanValue(value: boolean) {
//         this.length += 1;
//     }
//     public writeByteValue(value: number) {
//         this.length += 1;
//     }
//     public writeShortValue(value: number) {
//         this.length += 2;
//     }
//     public writeIntegerValue(value: number) {
//         this.length += 4;
//     }
//     public writeLongValue(value: BigInt) {
//         const hex = value.toString(16);
//         const contentLength = Buffer.byteLength(hex.padStart(8 * 2, '0').slice(0, 8 * 2), 'hex');

//         this.length += contentLength;
//     }
//     public writeFloatValue(value: number) {
//         this.length += 4;
//     }
//     public writeDoubleValue(value: number) {
//         this.length += 8;
//     }
//     public writeEnumValue<T>(value: T) {
//         this.length += 4;
//     }
// }