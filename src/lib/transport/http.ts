// import * as Http from 'http';
// import * as Https from 'https';
import Axios, { AxiosInstance, AxiosRequestHeaders, AxiosResponse } from 'axios';

import * as Stream from 'stream';
// import { ReadableStreamBuffer, WritableStreamBuffer } from 'stream-buffers';

import { AClientTransport, TransportMessage, TaggedTransportMessage, VolatileTransportMetadata, VolatileTransportMetadataFrame } from '../transport';

import { IProtocolReader, IProtocolWriter } from '../protocol';
import { EntanglementProtocol } from '../protocol/entanglementProtocol';

export class HttpClientTransport extends AClientTransport {
    public readonly client: AxiosInstance;
    public readonly tagRequests: boolean;

    private pendingRequests: Map<string, Promise<AxiosResponse<Buffer>>[]> = new Map();

    private protocol: EntanglementProtocol;

    public constructor(url: string, options: Partial<Pick<HttpClientTransport, 'tagRequests'>> = {}) {
        super();

        this.tagRequests = options.tagRequests ?? true;

        this.client = Axios.create({
            baseURL: url,
            auth: {
                username: 'test',
                password: '123abc'
            },
            // httpsAgent: Https.Agent && new Https.Agent({
            //     rejectUnauthorized: false
            // })
        });

        this.protocol = new EntanglementProtocol();
    }

    public connect(timeout?: number | undefined): Promise<void> {
        return Promise.resolve();
    }
    public close(): Promise<void> {
        return Promise.resolve();
    }

    public async send(message: TransportMessage): Promise<void> {
        const data = this.protocol.write(writer => altWriteTransportMessage(writer, message));

        if (data)
            await this.client.post('axon/send', data.toString('base64'));
        else
            await this.client.post('axon/send');
    }
    public async sendTagged(messageId: string, message: TransportMessage): Promise<void> {
        const data = this.protocol.write(writer => altWriteTransportMessage(writer, message));

        const aid = message.metadata.find('aid')?.toString('utf8');

        const pendingRequests = this.pendingRequests.get(messageId) || [];
        if (data) {
            const headers: AxiosRequestHeaders = {
                'Content-Type': 'text/plain'
            };

            if (aid)
                headers['Request-Id'] = aid;

            this.pendingRequests.set(messageId, pendingRequests.concat(this.client.post<Buffer, AxiosResponse<Buffer, any>>(this.tagRequests ? `axon/req?tag=${messageId}` : 'axon/req', data.toString('base64'), {
                headers
            })));
        }
        else {
            this.pendingRequests.set(messageId, pendingRequests.concat(this.client.post<Buffer>(this.tagRequests ? `axon/req?tag=${messageId}` : 'axon/req')));
        }
    }

    public async receive(): Promise<TransportMessage> {
        const response = await this.client.get<Buffer>('axon/receive');

        const message = this.protocol.read(Buffer.from(response.data.toString('utf8'), 'base64'), reader => altReadTransportMessage(reader));

        return message;
    }
    public async receiveTagged(messageId: string): Promise<TransportMessage> {
        const pendingRequests = this.pendingRequests.get(messageId) || [];

        const response = await (async () => {
            let pendingRequest = pendingRequests.pop();
            while (pendingRequest === null) {
                await delay(50);
                pendingRequest = pendingRequests.pop();
            }

            if (!pendingRequest)
                throw new Error();

            return pendingRequest;
        })();

        const message = this.protocol.read(Buffer.from(response.data.toString('utf8'), 'base64'), reader => altReadTransportMessage(reader));

        return message;
    }

    public receiveBufferedTagged(): Promise<TaggedTransportMessage> {
        throw new Error("Method not implemented.");
    }
    public sendAndReceive(message: TransportMessage): Promise<() => Promise<TransportMessage>> {
        throw new Error("Method not implemented.");
    }
}

function altWriteTransportMessage(writer: IProtocolWriter, message: TransportMessage) {
    writer.writeIntegerValue(0);
    writer.writeIntegerValue(message.metadata.frames.length);

    for (const frame of message.metadata.frames) {
        writer.writeStringValue(frame.id);
        writer.writeData(frame.data);
    }

    writer.writeData(message.payload);
}
function altReadTransportMessage(reader: IProtocolReader): TransportMessage {
    const metadata = new VolatileTransportMetadata();

    const signal = reader.readIntegerValue();
    if (signal !== 0)
        throw new Error(`Message received with signal code ${signal}`);

    const frameCount = reader.readIntegerValue();
    for (var a = 0; a < frameCount; a++) {
        const id = reader.readStringValue();
        const data = reader.readData();

        metadata.frames.push(new VolatileTransportMetadataFrame(id, data));
    }

    const payloadData = reader.readData();

    return new TransportMessage(payloadData, metadata);
}

function writeTransportMessage(writer: Stream.Writable, message: TransportMessage) {
    writeInt(writer, 0);

    writeInt(writer, message.metadata.frames.length);

    for (const frame of message.metadata.frames) {
        writeString(writer, frame.id);

        writeInt(writer, frame.data.length);
        writer.write(frame.data);
    }

    writeInt(writer, message.payload.length);
    writer.write(message.payload);
}
function writeInt(writer: Stream.Writable, value: number) {
    const codeBuffer = Buffer.alloc(4);
    codeBuffer.writeInt32LE(value, 0);
    writer.write(codeBuffer);
}
function writeString(writer: Stream.Writable, value: string) {
    const encodedValue = Buffer.from(value, 'utf8');

    writeInt(writer, encodedValue.length)
    writer.write(encodedValue);
}

function readTransportMessage(reader: Stream.Readable): TransportMessage {
    const metadata = new VolatileTransportMetadata();

    const signal = readInt(reader);
    if (signal !== 0)
        throw new Error(`Message received with signal code ${signal}`);

    const frameCount = readInt(reader);
    for (var a = 0; a < frameCount; a++) {
        const id = readString(reader);

        const dataLength = readInt(reader);
        const data = readBuffer(reader, dataLength);

        metadata.frames.push(new VolatileTransportMetadataFrame(id, data));
    }

    const payloadLength = readInt(reader);
    const payloadData = readBuffer(reader, payloadLength);

    return new TransportMessage(payloadData, metadata);
}
function readInt(reader: Stream.Readable): number {
    const buffer = readBuffer(reader, 4);

    return buffer.readInt32LE(0);
}
function readString(reader: Stream.Readable): string {
    const length = readInt(reader);

    const buffer = readBuffer(reader, length);
    return buffer.toString('utf8');
}
function readBuffer(reader: Stream.Readable, size: number): Buffer {
    const buffer = reader.read(size);

    return buffer;
}

function delay(duration: number): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(), duration))
}
