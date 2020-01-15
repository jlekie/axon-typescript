import * as UuidV4 from 'uuid/v4';

export interface ITransportMetadataFrame {
    readonly id: string;
    readonly data: Buffer;
}
export interface ITransportMetadata {
    readonly frames: readonly ITransportMetadataFrame[];

    has(id: string): boolean;
    find(id: string): Buffer | undefined;
    get(id: string): Buffer;
}

export class TransportMetadataFrame implements ITransportMetadataFrame {
    public static fromMetadataFrame(frame: ITransportMetadataFrame) {
        return new this(frame.id, frame.data);
    }

    public readonly id: string;
    public readonly data: Buffer;

    public constructor(id: string, data: Buffer) {
        this.id = id;
        this.data = data;
    }
}
export class TransportMetadata implements ITransportMetadata {
    public static fromMetadata(metadata: ITransportMetadata) {
        return new this(metadata.frames.map(f => TransportMetadataFrame.fromMetadataFrame(f)));
    }

    public readonly frames: readonly TransportMetadataFrame[];

    public constructor(frames?: TransportMetadataFrame[]) {
        this.frames = frames || [];
    }

    public has(id: string) {
        return this.frames.some(f => f.id === id);
    }
    public find(id: string) {
        const frame = this.frames.find(f => f.id === id);
        if (frame)
            return frame.data;
    }
    public get(id: string) {
        const frame = this.frames.find(f => f.id === id);
        if (!frame)
            throw new Error(`Frame ${id} not defined`);

        return frame.data;
    }
}

export class VolatileTransportMetadataFrame implements ITransportMetadataFrame {
    public static fromMetadataFrame(frame: ITransportMetadataFrame) {
        return new this(frame.id, frame.data);
    }

    public id: string;
    public data: Buffer;

    public constructor(id: string, data: Buffer) {
        this.id = id;
        this.data = data;
    }
}
export class VolatileTransportMetadata implements ITransportMetadata {
    public static fromMetadata(metadata: ITransportMetadata) {
        return new this(metadata.frames.map(f => VolatileTransportMetadataFrame.fromMetadataFrame(f)));
    }

    public readonly frames: VolatileTransportMetadataFrame[];

    public constructor(frames?: VolatileTransportMetadataFrame[]) {
        this.frames = frames || [];
    }

    public has(id: string) {
        return this.frames.some(f => f.id === id);
    }
    public find(id: string) {
        const frame = this.frames.find(f => f.id === id);
        if (frame)
            return frame.data;
    }
    public get(id: string) {
        const frame = this.frames.find(f => f.id === id);
        if (!frame)
            throw new Error(`Frame ${id} not defined`);

        return frame.data;
    }

    public add(id: string, data: Buffer) {
        this.frames.push(new VolatileTransportMetadataFrame(id, data));
    }

    public pluck(id: string) {
        const idx = this.frames.findIndex(f => f.id === id);
        if (idx >= 0)
            throw new Error(`Frame ${id} not defined`);

        const [ frame ] = this.frames.splice(idx, 1);

        return frame.data;
    }
}

export class TransportMessage {
    public static fromMessage(message: TransportMessage) {
        return new this(message.payload, VolatileTransportMetadata.fromMetadata(message.metadata));
    }

    public readonly payload: Buffer;
    public readonly metadata: VolatileTransportMetadata;

    public constructor(payload: Buffer, metadata?: VolatileTransportMetadata) {
        this.payload = payload;
        this.metadata = metadata || new VolatileTransportMetadata();
    }
}

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

export type TransportEventHandler = () => void | Promise<void>;
export interface ITransportEvent {
    on(handler: TransportEventHandler): void;
    off(handler: TransportEventHandler): void;

    emit(): void;
}
export class TransportEvent implements ITransportEvent {
    private readonly handlers: TransportEventHandler[] = [];

    public on(handler: TransportEventHandler) {
        this.handlers.push(handler);
    }
    public off(handler: TransportEventHandler) {
        const index = this.handlers.indexOf(handler);
        if (index >= 0)
            this.handlers.splice(index, 1);
    }

    public emit() {
        for (const handler of this.handlers)
            handler();
    }
}

export type TransportEventHandlerWithPayload<T> = (data: T) => void | Promise<void>;
export interface ITransportEventWithPayload<T> {
    on(handler: TransportEventHandlerWithPayload<T>): void;
    off(handler: TransportEventHandlerWithPayload<T>): void;

    emit(data: T): void;
}
export class TransportEventWithPayload<T> implements ITransportEventWithPayload<T> {
    private readonly handlers: TransportEventHandlerWithPayload<T>[] = [];

    public on(handler: TransportEventHandlerWithPayload<T>) {
        this.handlers.push(handler);
    }
    public off(handler: TransportEventHandlerWithPayload<T>) {
        const index = this.handlers.indexOf(handler);
        if (index >= 0)
            this.handlers.splice(index, 1);
    }

    public emit(data: T) {
        for (const handler of this.handlers)
            handler(data);
    }
}

export interface ITransport {
    readonly identity: string;

    onMessageReceived(handler: TransportEventHandlerWithPayload<TransportMessage>): void;
    onMessageSent(handler: TransportEventHandlerWithPayload<TransportMessage>): void;

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
    public readonly identity: string;

    protected readonly messageReceivedEvent = new TransportEventWithPayload<TransportMessage>();
    protected readonly messageSentEvent = new TransportEventWithPayload<TransportMessage>();

    public constructor(identity?: string) {
        this.identity = identity || UuidV4().replace(/-/g, '');
    }

    public onMessageReceived(handler: TransportEventHandlerWithPayload<TransportMessage>) {
        this.messageReceivedEvent.on(handler);
    }
    public onMessageSent(handler: TransportEventHandlerWithPayload<TransportMessage>) {
        this.messageSentEvent.on(handler);
    }

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