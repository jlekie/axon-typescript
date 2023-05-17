export interface IEndpoint {

}
export interface IServerEndpoint extends IEndpoint {

}
export interface IClientEndpoint extends IEndpoint {

}

export abstract class AServerEndpoint implements IServerEndpoint {

}
export abstract class AClientEndpoint implements IClientEndpoint {

}

export interface IEndpointDecoder<TEndpoint extends IEndpoint> {
    decode(payload: ArrayBuffer): TEndpoint;
}

export abstract class AEndpointDecoder<TEndpoint extends IEndpoint> implements IEndpointDecoder<TEndpoint> {
    abstract decode(payload: ArrayBuffer): TEndpoint;
}

export interface IEncodableEndpoint extends IEndpoint {
    encode(): ArrayBuffer;
}
