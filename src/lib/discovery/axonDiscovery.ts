// import { IAnnouncer, IDiscoverer, IEndpoint, IEndpointDecoder, AAnnouncer, ADiscoverer, IEncodableEndpoint } from '../../axon';
import { IAnnouncer, IDiscoverer, AAnnouncer, ADiscoverer } from '../discovery';
import { IEndpoint, IEncodableEndpoint, IEndpointDecoder } from '../endpoint';
import { IAxonDiscoveryServiceClient, IAxonDiscoveryHandler } from '../axonDiscoveryService';

export class AxonDiscoveryService implements IAxonDiscoveryHandler {
    private readonly registeredServices: { [key: string]: Array<string> };

    public constructor() {
        this.registeredServices = {};
    }

    public async registerService(serviceName: string, endpoint: string) {
        if (!this.registeredServices[serviceName])
            this.registeredServices[serviceName] = [];

        this.registeredServices[serviceName].push(endpoint);
    }

    public async resolveRegisteredService(serviceName: string) {
        if (!this.registeredServices[serviceName])
            throw new Error(`No endpoints registered for service ${serviceName}`);

        const endpoint = this.registeredServices[serviceName].shift();
        if (!endpoint)
            throw new Error(`No endpoints registered for service ${serviceName}`);
        this.registeredServices[serviceName].push(endpoint);

        return endpoint;
    }

    public async resolveRegisteredServices(serviceName: string) {
        if (!this.registeredServices[serviceName])
            throw new Error(`No endpoints registered for service ${serviceName}`);

        return this.registeredServices[serviceName] as ReadonlyArray<string>;
    }
}

export interface IAxonAnnouncer extends IAnnouncer {
    readonly serviceClient: IAxonDiscoveryServiceClient;
}
export class AxonAnnouncer extends AAnnouncer implements IAxonAnnouncer {
    public readonly serviceClient: IAxonDiscoveryServiceClient;

    public constructor(identifier: string, serviceClient: IAxonDiscoveryServiceClient) {
        super(identifier);

        this.serviceClient = serviceClient;
    }

    public async register(endpoint: IEncodableEndpoint) {
        await this.serviceClient.registerService(this.identifier, endpoint.encode().toString('utf8'));
    }
}

export interface IAxonDiscoverer<TEndpoint extends IEndpoint> extends IDiscoverer<TEndpoint> {
    readonly serviceClient: IAxonDiscoveryServiceClient;
}
export class AxonDiscoverer<TEndpoint extends IEndpoint> extends ADiscoverer<TEndpoint> implements IAxonDiscoverer<TEndpoint> {
    public readonly serviceClient: IAxonDiscoveryServiceClient;

    public constructor(identifier: string, endpointDecoder: IEndpointDecoder<TEndpoint>, serviceClient: IAxonDiscoveryServiceClient) {
        super(identifier, endpointDecoder);

        this.serviceClient = serviceClient;
    }

    public async discover(timeout: number = 0) {
        const encodedEndpoint = Buffer.from(await this.serviceClient.resolveRegisteredService(this.identifier, timeout), 'utf8');
        const endpoint = this.endpointDecoder.decode(encodedEndpoint);

        return endpoint;
    }
    public async discoverAll(timeout: number = 0) {
        const endpoints = (await this.serviceClient.resolveRegisteredServices(this.identifier, timeout))
            .map(s => Buffer.from(s, 'utf8'))
            .map(s => this.endpointDecoder.decode(s));

        return endpoints;
    }
}