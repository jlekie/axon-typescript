import { IClientTransport, IServerTransport } from './transport';
import { IProtocol } from './protocol';
import { IAnnouncer } from './discovery';
import { IEncodableEndpoint, IEndpoint } from './endpoint';

export interface IServiceClient {
    readonly transport: IClientTransport;
    readonly protocol: IProtocol;

    connect(timeout?: number): Promise<void>;
    close(): Promise<void>;
}

export interface IServiceServer {
    readonly transport: IServerTransport;
    readonly protocol: IProtocol;
    readonly announcer: IAnnouncer | undefined;
    readonly endpoint: IEncodableEndpoint | undefined;

    start(): Promise<void>;
    run(): Promise<void>;
    stop(): Promise<void>;
}

export abstract class AServiceClient implements IServiceClient {
    public readonly transport: IClientTransport;
    public readonly protocol: IProtocol;

    public constructor(transport: IClientTransport, protocol: IProtocol) {
        this.transport = transport;
        this.protocol = protocol;
    }

    public async connect(timeout?: number) {
        await this.transport.connect(timeout);
    }
    public async close() {
        await this.transport.close();
    }
}

export abstract class AServiceServer implements IServiceServer {
    public readonly transport: IServerTransport;
    public readonly protocol: IProtocol;
    public readonly announcer: IAnnouncer | undefined;
    public readonly endpoint: IEncodableEndpoint | undefined;

    private isRunning: boolean;
    private runningTask: Promise<void> | null;
    private announcerTask: Promise<void> | null;

    public constructor(transport: IServerTransport, protocol: IProtocol, announcer?: IAnnouncer, endpoint?: IEncodableEndpoint) {
        this.transport = transport;
        this.protocol = protocol;
        this.announcer = announcer;
        this.endpoint = endpoint;

        this.isRunning = false;
        this.runningTask = null;
        this.announcerTask = null;
    }

    public async start() {
        await this.transport.listen();

        this.isRunning = true;
        this.runningTask = this.serverHandler();

        if (this.announcer && this.endpoint) {
            await this.announcer.register(this.endpoint);

            this.announcerTask = this.announcerHandler();
        }
    }
    public async run() {
        await this.start();
        await this.runningTask;
    }
    public async stop() {
        this.isRunning = false;

        await this.transport.close();
        await this.runningTask;
    }

    protected abstract handleRequest(): Promise<void>;

    private async serverHandler() {
        while (this.isRunning) {
            try {
                await this.handleRequest();
            }
            catch (err) {
                console.error(err.toString());
            }
        }
    }

    private async announcerHandler() {
        if (!this.announcer)
            return;
        if (!this.endpoint)
            return;

        while (this.isRunning) {
            try {
                await delay(10000);

                await this.announcer.register(this.endpoint);
            }
            catch (err) {
                console.error(err.toString());
            }
        }
    }
}

function delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}