import { IEncodableEndpoint, IEndpoint, IEndpointDecoder } from './endpoint';

export interface IAnnouncer {
    readonly identifier: string;

    register(endpoint: IEncodableEndpoint): Promise<void>;
}

export interface IDiscoverer<TEndpoint extends IEndpoint> {
    readonly identifier: string;
    readonly endpointDecoder: IEndpointDecoder<TEndpoint>;

    discover(timeout?: number): Promise<TEndpoint>;
    discoverAll(timeout?: number): Promise<ReadonlyArray<TEndpoint>>;
}

export abstract class AAnnouncer implements IAnnouncer {
    public readonly identifier: string;

    public constructor(identifier: string) {
        this.identifier = identifier;
    }

    public abstract register(endpoint: IEncodableEndpoint): Promise<void>;
}

export abstract class ADiscoverer<TEndpoint extends IEndpoint> implements IDiscoverer<TEndpoint> {
    public readonly identifier: string;
    public readonly endpointDecoder: IEndpointDecoder<TEndpoint>;

    public constructor(identifier: string, endpointDecoder: IEndpointDecoder<TEndpoint>) {
        this.identifier = identifier;
        this.endpointDecoder = endpointDecoder;
    }

    public abstract discover(timeout?: number): Promise<TEndpoint>;
    public abstract discoverAll(timeout?: number): Promise<ReadonlyArray<TEndpoint>>;
}