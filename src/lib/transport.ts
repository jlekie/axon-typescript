export interface IReceivedData {
    readonly data: Buffer;
    readonly metadata: Map<string, Buffer>;
}
export class ReceivedData implements IReceivedData {
    public readonly data: Buffer;
    public readonly metadata: Map<string, Buffer>;

    public constructor(data: Buffer, metadata?: Map<string, Buffer>) {
        this.data = data;

        this.metadata = new Map();
        if (metadata) {
            for (const kv of metadata)
                this.metadata.set(kv[0], kv[1]);
        }
    }
}

export interface ITransport {
    send(data: Buffer, metadata: Map<string, Buffer>): Promise<void>;
    receive(): Promise<IReceivedData>;

    sendAndReceive(data: Buffer, metadata: Map<string, Buffer>): Promise<() => Promise<IReceivedData>>;
}
export interface IServerTransport extends ITransport {
    listen(): Promise<void>;
    close(): Promise<void>;
}
export interface IClientTransport extends ITransport {
    connect(timeout?: number): Promise<void>;
    close(): Promise<void>;
}

export abstract class ATransport implements ITransport {
    public abstract send(data: Buffer, metadata: Map<string, Buffer>): Promise<void>;
    public abstract receive(): Promise<IReceivedData>;
    public abstract sendAndReceive(data: Buffer, metadata: Map<string, Buffer>): Promise<() => Promise<IReceivedData>>;
}
export abstract class AServerTransport extends ATransport implements IServerTransport {
    public abstract listen(): Promise<void>;
    public abstract close(): Promise<void>;
}
export abstract class AClientTransport extends ATransport implements IClientTransport {
    public abstract connect(timeout?: number): Promise<void>;
    public abstract close(): Promise<void>;
}