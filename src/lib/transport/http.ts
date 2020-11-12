import * as Http from 'http';
import * as Https from 'https';
import Axios, { AxiosInstance, AxiosResponse } from 'axios';

import * as Stream from 'stream';
import { ReadableStreamBuffer, WritableStreamBuffer } from 'stream-buffers';

import { AClientTransport, TransportMessage, TaggedTransportMessage, VolatileTransportMetadata, VolatileTransportMetadataFrame } from '../transport';

export class HttpClientTransport extends AClientTransport {
    public readonly client: AxiosInstance;

    private pendingRequests: Map<string, Promise<AxiosResponse<Buffer>>[]> = new Map();

    public constructor(url: string) {
        super();

        this.client = Axios.create({
            baseURL: url,
            auth: {
                username: 'test',
                password: '123abc'
            },
            httpsAgent: new Https.Agent({
                rejectUnauthorized: false
            })
        });
    }

    public connect(timeout?: number | undefined): Promise<void> {
        return Promise.resolve();
    }
    public close(): Promise<void> {
        return Promise.resolve();
    }

    public async send(message: TransportMessage): Promise<void> {
        const writer = new WritableStreamBuffer();
        writeTransportMessage(writer, message);

        var data = writer.getContents();
        if (data)
            await this.client.post('axon/send', data.toString('base64'));
        else
            await this.client.post('axon/send');
    }
    public async sendTagged(messageId: string, message: TransportMessage): Promise<void> {
        const writer = new WritableStreamBuffer();
        writeTransportMessage(writer, message);

        var data = writer.getContents();

        const pendingRequests = this.pendingRequests.get(messageId) || [];
        if (data) {
            this.pendingRequests.set(messageId, pendingRequests.concat(this.client.post<Buffer>(`axon/req?tag=${messageId}`, data.toString('base64'), {
                headers: {
                    'Content-Type': 'text/plain'
                }
            })));
        }
        else {
            this.pendingRequests.set(messageId, pendingRequests.concat(this.client.post<Buffer>(`axon/req?tag=${messageId}`)));
        }
    }

    public async receive(): Promise<TransportMessage> {
        const response = await this.client.get<Buffer>('axon/receive');

        const reader = new ReadableStreamBuffer({ chunkSize: response.data.length });
        const message = await new Promise<TransportMessage>((resolve, reject) => {
            reader.once('readable', () => {
                try {
                    const message = readTransportMessage(reader);
                    resolve(message);
                }
                catch (err) {
                    reject(err);
                }
            });

            reader.put(Buffer.from(response.data.toString('utf8'), 'base64'));
            reader.stop();
        });

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

        const reader = new ReadableStreamBuffer({ chunkSize: response.data.length });
        const message = await new Promise<TransportMessage>((resolve, reject) => {
            reader.once('readable', () => {
                try {
                    const message = readTransportMessage(reader);
                    resolve(message);
                }
                catch (err) {
                    reject(err);
                }
            });

            reader.put(Buffer.from(response.data.toString('utf8'), 'base64'));
            reader.stop();
        });

        return message;
    }

    public receiveBufferedTagged(): Promise<TaggedTransportMessage> {
        throw new Error("Method not implemented.");
    }
    public sendAndReceive(message: TransportMessage): Promise<() => Promise<TransportMessage>> {
        throw new Error("Method not implemented.");
    }
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