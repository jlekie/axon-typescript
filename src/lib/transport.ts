export interface IReceivedData {
    readonly data: Buffer;
    readonly metadata: Record<string, Buffer>;
}
export class ReceivedData implements IReceivedData {
    public readonly data: Buffer;
    public readonly metadata: Record<string, Buffer>;

    public constructor(data: Buffer, metadata?: Record<string, Buffer>) {
        this.data = data;

        if (metadata)
            this.metadata = { ...metadata };
        else
            this.metadata = {};
    }
}

export interface IReceivedTaggedData {
    readonly tag: string;
    readonly data: Buffer;
    readonly metadata: Record<string, Buffer>;
}

export class ReceivedTaggedData implements IReceivedTaggedData {
    public readonly tag: string;
    public readonly data: Buffer;
    public readonly metadata: Record<string, Buffer>;

    public constructor(tag: string, data: Buffer, metadata?: Record<string, Buffer>) {
        this.tag = tag;
        this.data = data;

        if (metadata)
            this.metadata = { ...metadata };
        else
            this.metadata = {};
    }
}

export interface ITransport {
    send(data: Buffer, metadata: Record<string, Buffer>): Promise<void>;
    sendTagged(messageId: string, data: Buffer, metadata: Record<string, Buffer>): Promise<void>;

    receive(): Promise<IReceivedData>;
    receiveTagged(messageId: string): Promise<IReceivedData>;

    receiveBufferedTagged(): Promise<IReceivedTaggedData>;

    sendAndReceive(data: Buffer, metadata: Record<string, Buffer>): Promise<() => Promise<IReceivedData>>;
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
    public abstract send(data: Buffer, metadata: Record<string, Buffer>): Promise<void>;
    public abstract sendTagged(messageId: string, data: Buffer, metadata: Record<string, Buffer>): Promise<void>;

    public abstract receive(): Promise<IReceivedData>;
    public abstract receiveTagged(messageId: string): Promise<IReceivedData>;

    public abstract receiveBufferedTagged(): Promise<IReceivedTaggedData>;

    public abstract sendAndReceive(data: Buffer, metadata: Record<string, Buffer>): Promise<() => Promise<IReceivedData>>;
}
export abstract class AServerTransport extends ATransport implements IServerTransport {
    public abstract listen(): Promise<void>;
    public abstract close(): Promise<void>;
}
export abstract class AClientTransport extends ATransport implements IClientTransport {
    public abstract connect(timeout?: number): Promise<void>;
    public abstract close(): Promise<void>;
}