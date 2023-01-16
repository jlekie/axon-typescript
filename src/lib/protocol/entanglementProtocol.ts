import * as Crypto from 'crypto';
import sha256 from 'fast-sha256';
import * as Uuid from 'uuid'

import { AProtocol, AProtocolReader, AProtocolWriter, ITransport, IProtocol, IProtocolReader, IProtocolWriter, ITransportMetadata, TransportMessage, VolatileTransportMetadata } from '../..';

// import * as Zlib from 'zlib';
// import * as Brotli from 'brotli-wasm';
import { zlibSync, unzlibSync } from 'fflate';
// import * as LZ4 from '../../../lz4.js';

// const { compress, decompress } = new LZ4Codec().codec();

export interface EntanglementProtocolOptions {
    compress?: boolean;
}
export class EntanglementProtocol extends AProtocol {
    public static readonly identifier = 'entanglement';
    public get identifier() {
        return EntanglementProtocol.identifier;
    }

    public readonly compress: boolean;

    public constructor(options: EntanglementProtocolOptions = {}) {
        super();

        this.compress = options.compress ?? false;
    }

    public read<T>(data: ArrayBuffer, handler: (reader: IProtocolReader) => T): T {
        const reader = new EntanglementProtocolReader(this, data);

        return handler(reader);
    }
    public write(handler: (writer: IProtocolWriter) => void): ArrayBuffer {
        const writer = new EntanglementProtocolWriter(this);
        handler(writer);

        return writer.getContents();
    }

    public async readAsync<T>(data: ArrayBuffer, handler: (reader: IProtocolReader) => T): Promise<T> {
        const reader = new EntanglementProtocolReader(this, await this.decompressData(data));

        return handler(reader);
    }
    public async writeAsync(handler: (writer: IProtocolWriter) => void): Promise<ArrayBuffer> {
        const writer = new EntanglementProtocolWriter(this);
        handler(writer);

        return await this.compressData(writer.getContents());
    }

    public async writeData(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void> {
        const writer = new EntanglementProtocolWriter(this);
        handler(writer);

        await transport.send(new TransportMessage(await this.compressData(writer.getContents()), this.identifier, VolatileTransportMetadata.fromMetadata(metadata)));
    }
    public async writeTaggedData(transport: ITransport, messageId: string, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void> {
        const writer = new EntanglementProtocolWriter(this);
        handler(writer);

        await transport.sendTagged(messageId, new TransportMessage(await this.compressData(writer.getContents()), this.identifier, VolatileTransportMetadata.fromMetadata(metadata)));
    }

    public async readData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult> {
        const receivedData = await transport.receive();

        if (receivedData.protocolIdentifier !== this.identifier)
            throw new Error(`Protocol mismatch [${this.identifier} / ${receivedData.protocolIdentifier}]`);

        const reader = new EntanglementProtocolReader(this, await this.decompressData(receivedData.payload));

        return handler(reader, receivedData.metadata);
    }
    public async readTaggedData<TResult = void>(transport: ITransport, messageId: string, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult> {
        const receivedData = await transport.receiveTagged(messageId);

        if (receivedData.protocolIdentifier !== this.identifier)
            throw new Error(`Protocol mismatch [${this.identifier} / ${receivedData.protocolIdentifier}]`);

        const reader = new EntanglementProtocolReader(this, await this.decompressData(receivedData.payload));

        return handler(reader, receivedData.metadata);
    }

    public async readBufferedTaggedData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, messageId: string, metadata: ITransportMetadata) => TResult): Promise<TResult> {
        const { id, message } = await transport.receiveBufferedTagged();

        if (message.protocolIdentifier !== this.identifier)
            throw new Error(`Protocol mismatch [${this.identifier} / ${message.protocolIdentifier}]`);

        const reader = new EntanglementProtocolReader(this, await this.decompressData(message.payload));

        return handler(reader, id, message.metadata);
    }

    public async writeAndReadData<TResult = void>(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<(readHandler: ((protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult)) => Promise<TResult>> {
        const writer = new EntanglementProtocolWriter(this);
        handler(writer);

        const receiveHandler = await transport.sendAndReceive(new TransportMessage(await this.compressData(writer.getContents()), this.identifier, VolatileTransportMetadata.fromMetadata(metadata)));

        return async (readHandler) => {
            const { payload: data, protocolIdentifier, metadata } = await receiveHandler();

            if (protocolIdentifier !== this.identifier)
                throw new Error(`Protocol mismatch [${this.identifier} / ${protocolIdentifier}]`);

            const reader = new EntanglementProtocolReader(this, await this.decompressData(data));

            return readHandler(reader, metadata);
        };
    }

    private async compressData(data: ArrayBuffer) {
        if (!this.compress)
            return data;

        const s = Date.now()
        // const result = Buffer.from((await Brotli).compress(data, {
        //     quality: 9
        // }));
        const result = zlibSync(new Uint8Array(data), {
            level: 1
        });
        // const result = LZ4.encode(data);
        console.log('Compress', Date.now() - s)

        return result.buffer;

        // return new Promise<Buffer>((resolve, reject) => {
        //     Zlib.gzip(data, (err, data) => {
        //         err ? reject(err) : resolve(data);
        //     });
        // });
    }
    private async decompressData(data: ArrayBuffer) {
        if (!this.compress)
            return data;

        const s = Date.now()
        // const result = Buffer.from((await Brotli).decompress(data));
        const result = unzlibSync(new Uint8Array(data));
        // const result = LZ4.decode(data);
        console.log('Decompress', Date.now() - s)

        return result.buffer;

        // return new Promise<Buffer>((resolve, reject) => {
        //     Zlib.gunzip(data, (err, data) => {
        //         err ? reject(err) : resolve(data);
        //     });
        // });
    }
}

interface EntanglementProtocolWriterIndexParams {
    dictionary: Record<string, number>;
    buffer: ArrayBuffer;
    position: number;
}
class EntanglementProtocolWriterIndex {
    public readonly dictionary: Record<string, number>;

    private _buffer: ArrayBuffer;
    public get buffer() {
        return this._buffer;
    }

    private _bufferDataView: DataView;
    public get bufferDataView() {
        return this._bufferDataView;
    }

    public position: number;

    public constructor(params?: EntanglementProtocolWriterIndexParams) {
        this.dictionary = params?.dictionary ?? {};
        this._buffer = params?.buffer ?? new ArrayBuffer(1 * 1024);
        this._bufferDataView = new DataView(this._buffer);
        this.position = params?.position ?? 0;
    }

    public checkPosition(length: number) {
        while (this.position + length > this.buffer.byteLength) {
            // console.log('BUFFER OVERRUN', this.position + length, this.buffer.length, this.buffer.length * 2)
            const oldBuffer = this.buffer;
            this._buffer = new ArrayBuffer(oldBuffer.byteLength * 2);
            this._bufferDataView = new DataView(this._buffer);
            new Uint8Array(this._buffer).set(new Uint8Array(oldBuffer, 0, oldBuffer.byteLength));
            // this.buffer = Buffer.concat([ this.buffer ], this.buffer.length * 2);
        }
    }
}

const textDecoder = new TextDecoder('utf-8');
const textEncoder = new TextEncoder();

export class EntanglementProtocolReader extends AProtocolReader {
    public readonly buffer: ArrayBuffer;
    public readonly bufferDataView: DataView;

    private _position: number;
    private get position()
    {
        return 4 + this._position;
    }

    private index: Record<number, string>;

    public constructor(protocol: AProtocol, buffer: ArrayBuffer, position?: number, index?: Record<number, string>) {
        super(protocol);

        this.buffer = buffer;
        this.bufferDataView = new DataView(buffer);
        this._position = position ?? this.bufferDataView.getInt32(0, true);
        this.index = index ?? {};
    }

    public readData(): ArrayBuffer {
        const dataLength = this.bufferDataView.getInt32(this.position, true);
        this._position += 4;

        const data = new Uint8Array(this.buffer, this.position, dataLength);
        this._position += dataLength;

        return data;
        // return this.buffer.slice(this.position, 4 + (this.#position += dataLength));
    }

    public readStringValue(): string {
        const indexPos = 4 + this.bufferDataView.getInt32(this.position, true);
        this._position += 4;

        if (this.index[indexPos] !== undefined) {
            return this.index[indexPos];
        }
        else {
            const contentLength = this.bufferDataView.getInt32(indexPos, true);

            let content: string;
            if (contentLength > 200)
                // content = String.fromCharCode.apply(null, new Uint8Array(this.buffer, indexPos + 4, contentLength));
                content = textDecoder.decode(new Uint8Array(this.buffer, indexPos + 4, contentLength));
                // content = textDecoder.decode(this.buffer.slice(indexPos + 4, indexPos + 4 + contentLength));
            else if (contentLength > 0)
                content = String.fromCharCode.apply(null, new Uint8Array(this.buffer, indexPos + 4, contentLength));
            else
                content = '';

            this.index[indexPos] = content;

            return content;
        }
    }
    public readBooleanValue(): boolean {
        const value = this.bufferDataView.getInt8(this.position) === 1;
        this._position += 1;

        return value;
    }
    public readByteValue(): number {
        const value = this.bufferDataView.getInt8(this.position);
        this._position += 1;

        return value;
    }
    public readShortValue(): number {
        const value = this.bufferDataView.getInt16(this.position, true);
        this._position += 2;

        return value;
    }
    public readIntegerValue(): number {
        const value = this.bufferDataView.getInt32(this.position, true);
        this._position += 4;

        return value;
    }
    public readLongValue(): bigint {
        const value = this.bufferDataView.getBigInt64(this.position, true);
        this._position += 8;

        return value;
    }
    public readFloatValue(): number {
        const value = this.bufferDataView.getFloat32(this.position, true);
        this._position += 4;

        return value;
    }
    public readDoubleValue(): number {
        const value = this.bufferDataView.getFloat64(this.position, true);
        this._position += 8;

        return value;
    }
    public readEnumValue<T>(): T {
        const value = this.bufferDataView.getInt32(this.position, true);
        this._position += 4;

        return <T><any>value;
    }

    public readHashedBlock<T = void>(handler: (reader: IProtocolReader) => T): T {
        const indexPos = this.bufferDataView.getInt32(this.position, true);
        this._position += 4;

        const forkedReader = new EntanglementProtocolReader(this.protocol, this.buffer, indexPos, this.index);
        return handler(forkedReader);
    }
}

export class EntanglementProtocolWriter extends AProtocolWriter {
    private buffer: ArrayBuffer;
    private bufferDataView: DataView;
    private position: number;

    private index: EntanglementProtocolWriterIndex;

    public constructor(protocol: AProtocol, index?: EntanglementProtocolWriterIndex) {
        super(protocol);

        this.buffer = new ArrayBuffer(1 * 1024);
        this.bufferDataView = new DataView(this.buffer);
        this.position = 0;

        this.index = index ?? new EntanglementProtocolWriterIndex();
    }

    public getContents(): ArrayBuffer {
        // const trimmedBuffer = Buffer.allocUnsafe(4 + this.index.position + this.position);

        // trimmedBuffer.writeInt32LE(this.index.position);
        // // this.index.buffer.copy(trimmedBuffer, 4, 0, this.index.position);
        // // this.buffer.copy(trimmedBuffer, 4 + this.index.position, 0, this.position);
        // // console.log(4 + this.index.position + this.position, this.index.position, Uint8Array.prototype.slice.call(this.index.buffer, 0, this.index.position), this.position, Uint8Array.prototype.slice.call(this.buffer, 0, this.position))
        // // console.log(this.index.buffer)
        // // console.log(this.buffer);
        // new Uint8Array(trimmedBuffer.buffer).set(Uint8Array.prototype.slice.call(this.index.buffer, 0, this.index.position), 4);
        // new Uint8Array(trimmedBuffer.buffer).set(Uint8Array.prototype.slice.call(this.buffer, 0, this.position), 4 + this.index.position);
        // console.log('WORKING', trimmedBuffer);

        const trimmedBuffer = new ArrayBuffer(4 + this.index.position + this.position);
        const trimmedBufferDataview = new DataView(trimmedBuffer);

        trimmedBufferDataview.setInt32(0, this.index.position, true);
        new Uint8Array(trimmedBuffer).set(new Uint8Array(this.index.buffer.slice(0, this.index.position)), 4);
        new Uint8Array(trimmedBuffer).set(new Uint8Array(this.buffer.slice(0, this.position)), 4 + this.index.position);

        return trimmedBuffer;




        // const trimmedBuffer = Buffer.allocUnsafe(this.position + 1);
        // this.buffer.copy(trimmedBuffer, 0, 0, this.position);

        // return trimmedBuffer;
    }
    private checkPosition(length: number) {
        while (this.position + length > this.buffer.byteLength) {
            // console.log('BUFFER OVERRUN', this.position + length, this.buffer.length, this.buffer.length * 2)
            const oldBuffer = this.buffer;
            this.buffer = new ArrayBuffer(oldBuffer.byteLength * 2);
            this.bufferDataView = new DataView(this.buffer);
            new Uint8Array(this.buffer).set(new Uint8Array(oldBuffer.slice(0, oldBuffer.byteLength)));
            // this.buffer = Buffer.concat([ this.buffer ], this.buffer.length * 2);
        }
    }

    public fork() {
        return new EntanglementProtocolWriter(this.protocol, this.index);
    }

    public writeData(value: ArrayBuffer) {
        this.checkPosition(4);
        this.bufferDataView.setInt32(this.position, value.byteLength, true);
        this.position += 4;

        this.checkPosition(value.byteLength);
        new Uint8Array(this.buffer).set(new Uint8Array(value, 0, value.byteLength), this.position);
        this.position += value.byteLength;
    }

    public writeStringValue(value: string) {
        if (this.index.dictionary[value] !== undefined) {
            this.checkPosition(4);
            this.bufferDataView.setInt32(this.position, this.index.dictionary[value], true);
            this.position += 4;
        }
        else {
            this.index.dictionary[value] = this.index.position;

            this.checkPosition(4);
            this.bufferDataView.setInt32(this.position, this.index.position, true);
            this.position += 4;

            const contentLength = Buffer.byteLength(value, 'utf8');

            this.index.checkPosition(4);
            this.index.bufferDataView.setInt32(this.index.position, contentLength, true);
            this.index.position += 4;

            // this.index.checkPosition(contentLength);
            // this.index.buffer.write(value, this.index.position, 'utf8');
            // this.index.position += contentLength;
            this.index.checkPosition(contentLength);
            textEncoder.encodeInto(value, new Uint8Array(this.index.buffer, this.index.position));
            this.index.position += contentLength;
        }




        // const contentLength = Buffer.byteLength(value, 'utf8');

        // this.checkPosition(4);
        // this.buffer.writeInt32LE(contentLength, this.position);
        // this.position += 4;

        // this.checkPosition(contentLength);
        // this.buffer.write(value, this.position, 'utf8');
        // this.position += contentLength;
    }
    public writeBooleanValue(value: boolean) {
        this.checkPosition(1);
        this.bufferDataView.setInt8(this.position, value ? 1 : 0);
        this.position += 1;
    }
    public writeByteValue(value: number) {
        this.checkPosition(1);
        this.bufferDataView.setInt8(this.position, value);
        this.position += 1;
    }
    public writeShortValue(value: number) {
        this.checkPosition(2);
        this.bufferDataView.setInt16(this.position, value, true);
        this.position += 2;
    }
    public writeIntegerValue(value: number) {
        this.checkPosition(4);
        this.bufferDataView.setInt32(this.position, value, true);
        this.position += 4;
    }
    public writeLongValue(value: bigint) {
        this.checkPosition(8);
        this.bufferDataView.setBigInt64(this.position, value, true);
        this.position += 8;

        // const hex = value.toString(16);
        // const contentLength = Buffer.byteLength(hex.padStart(8 * 2, '0').slice(0, 8 * 2), 'hex');

        // this.checkPosition(contentLength);
        // this.buffer.write(hex, this.position, 'hex');
        // this.position += contentLength;
    }
    public writeFloatValue(value: number) {
        this.checkPosition(4);
        this.bufferDataView.setFloat32(this.position, value, true);
        this.position += 4;
    }
    public writeDoubleValue(value: number) {
        this.checkPosition(8);
        this.bufferDataView.setFloat64(this.position, value, true);
        this.position += 8;
    }
    public writeEnumValue<T>(value: T) {
        this.checkPosition(4);
        this.bufferDataView.setInt32(this.position, <number><any>value, true);
        this.position += 4;
    }

    public writeHashedBlock(handler: (writer: IProtocolWriter) => void) {
        const forkedWriter = this.fork();
        handler(forkedWriter);

        const data = Buffer.allocUnsafe(forkedWriter.position);
        data.set(new Uint8Array(forkedWriter.buffer.slice(0, forkedWriter.position)));

        // const hash = Crypto.createHash('sha256').update(data).digest('hex');
        const hash = Buffer.from(sha256(data)).toString('hex');
        // console.log(hash)
        // const hash = Uuid.v4();
        if (this.index.dictionary[hash] !== undefined) {
            this.checkPosition(4);
            this.bufferDataView.setInt32(this.position, this.index.dictionary[hash], true);
            this.position += 4;
        }
        else {
            this.index.dictionary[hash] = this.index.position;

            this.checkPosition(4);
            this.bufferDataView.setInt32(this.position, this.index.position, true);
            this.position += 4;

            // this.checkPosition(4);
            // this.buffer.writeInt32LE(data.length, this.position);
            // this.position += 4;

            this.index.checkPosition(forkedWriter.position);
            new Uint8Array(this.index.buffer).set(new Uint8Array(data.buffer.slice(0, forkedWriter.position)), this.index.position);
            // forkedWriter.buffer.copy(this.index.buffer, this.index.position, 0, forkedWriter.position);
            this.index.position += forkedWriter.position;
        }
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
