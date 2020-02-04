// // Alchemist generated file - DO NOT MODIFY

// // import * as Axon from '../axon';

// import { IServiceClient, IServiceServer, AServiceClient, AServiceServer } from './service';
// import { IClientTransport, IServerTransport, VolatileTransportMetadata } from './transport';
// import { IProtocol } from './protocol';
// import { RequestHeader, RequestArgumentHeader, ResponseHeader, ModelHeader, ArrayHeader, ArrayItemHeader } from './headers';
// import { RequestError } from './requestError';
// import { HandledRequestMessage, SuccessfulHandledRequestMessage, FailedHandledRequestMessage } from './requestMessage';

// export interface IAxonDiscoveryHandler {
//     registerService(serviceName: string, endpoint: string): Promise<void>;

//     resolveRegisteredService(serviceName: string, timeout: number): Promise<string>;

//     resolveRegisteredServices(serviceName: string, timeout: number): Promise<ReadonlyArray<string>>;
// }

// export interface IAxonDiscoveryServiceClient extends IServiceClient {
//     registerService(serviceName: string, endpoint: string): Promise<void>;

//     resolveRegisteredService(serviceName: string, timeout: number): Promise<string>;

//     resolveRegisteredServices(serviceName: string, timeout: number): Promise<ReadonlyArray<string>>;
// }

// export interface IAxonDiscoveryServiceServer extends IServiceServer {
//     readonly handler: IAxonDiscoveryHandler;
// }

// export class AxonDiscoveryServiceClient extends AServiceClient implements IAxonDiscoveryServiceClient {
//     public constructor(transport: IClientTransport, protocol: IProtocol) {
//         super(transport, protocol);
//     }

//     public async registerService(serviceName: string, endpoint: string): Promise<void> {
//         // Implementation Type: axon/clientRequest
//         const readHandler = await this.protocol.writeAndReadData(this.transport, new VolatileTransportMetadata(), (protocol) => {
//             protocol.writeRequestHeader(new RequestHeader('registerService', 2));

//             protocol.writeRequestArgumentHeader(new RequestArgumentHeader('serviceName', 'string'));
//             protocol.writeStringValue(serviceName);
//             protocol.writeRequestArgumentHeader(new RequestArgumentHeader('endpoint', 'string'));
//             protocol.writeStringValue(endpoint);
//         });

//          await readHandler((protocol, metadata) => {
//             const responseHeader = protocol.readResponseHeader();

//             if (!responseHeader.success) {
//                 const modelHeader = protocol.readModelHeader();

//                 const error = new RequestError();
//                 error.read(protocol, modelHeader);

//                 throw error.toError();
//             }
//         });
//     }

//     public async resolveRegisteredService(serviceName: string, timeout: number): Promise<string> {
//         // Implementation Type: axon/clientRequest
//         const readHandler = await this.protocol.writeAndReadData<string>(this.transport, new VolatileTransportMetadata(), (protocol) => {
//             protocol.writeRequestHeader(new RequestHeader('resolveRegisteredService', 2));

//             protocol.writeRequestArgumentHeader(new RequestArgumentHeader('serviceName', 'string'));
//             protocol.writeStringValue(serviceName);
//             protocol.writeRequestArgumentHeader(new RequestArgumentHeader('timeout', 'int'));
//             protocol.writeIntegerValue(timeout);
//         });

//         const responseData =  await readHandler((protocol, metadata) => {
//             const responseHeader = protocol.readResponseHeader();

//             if (!responseHeader.success) {
//                 const modelHeader = protocol.readModelHeader();

//                 const error = new RequestError();
//                 error.read(protocol, modelHeader);

//                 throw error.toError();
//             }
//             else {
//                 let result: string;

//                 result = protocol.readStringValue();

//                 return result;
//             }
//         });

//         return responseData;
//     }

//     public async resolveRegisteredServices(serviceName: string, timeout: number): Promise<Array<string>> {
//         // Implementation Type: axon/clientRequest
//         const readHandler = await this.protocol.writeAndReadData<Array<string>>(this.transport, new VolatileTransportMetadata(), (protocol) => {
//             protocol.writeRequestHeader(new RequestHeader('resolveRegisteredServices', 2));

//             protocol.writeRequestArgumentHeader(new RequestArgumentHeader('serviceName', 'string'));
//             protocol.writeStringValue(serviceName);
//             protocol.writeRequestArgumentHeader(new RequestArgumentHeader('timeout', 'int'));
//             protocol.writeIntegerValue(timeout);
//         });

//         const responseData =  await readHandler((protocol, metadata) => {
//             const responseHeader = protocol.readResponseHeader();

//             if (!responseHeader.success) {
//                 const modelHeader = protocol.readModelHeader();

//                 const error = new RequestError();
//                 error.read(protocol, modelHeader);

//                 throw error.toError();
//             }
//             else {
//                 let result: Array<string>;

//                 const arrayHeader = protocol.readArrayHeader();

//                 result = [];

//                 for (let i = 0; i < arrayHeader.itemCount; i++) {
//                     const arrayItemHeader = protocol.readArrayItemHeader();

//                     if (arrayItemHeader.type !== 'string')
//                         throw new Error(`Invalid array item type (${arrayItemHeader.type} | string)`);

//                     let item: string;
//                     item = protocol.readStringValue();

//                     result.push(item);
//                 }

//                 return result;
//             }
//         });

//         return responseData;
//     }
// }

// export class AxonDiscoveryServiceServer extends AServiceServer implements IAxonDiscoveryServiceServer {
//     public readonly handler: IAxonDiscoveryHandler;

//     public constructor(transport: IServerTransport, protocol: IProtocol, handler: IAxonDiscoveryHandler) {
//         super(transport, protocol);

//         // Implementation: "constructor/parameterized"
//         // handler
//         if (handler !== undefined) {
//             this.handler = handler;
//         }
//         else {
//             throw new Error('Property handler not defined');
//         }
//     }

//     public async handleRequest(): Promise<void> {
//         // Implementation Type: axon/handleRequest
//         // HANDLED

//         const readHandler = await this.protocol.readData<() => Promise<HandledRequestMessage>>(this.transport, (protocol, metadata) => (async () => {
//             const requestHeader = protocol.readRequestHeader();

//             try {
//                 let requestData: any;

//                 switch (requestHeader.actionName) {
//                     case 'registerService': {
//                         const args: { [key: string]: any } = {};

//                         for (let i = 0; i < requestHeader.argumentCount; i++) {
//                             const requestArgumentHeader = protocol.readRequestArgumentHeader();

//                             switch (requestArgumentHeader.argumentName) {
//                                 case 'serviceName': {
//                                     args['serviceName'] = protocol.readStringValue();
//                                 } break;

//                                 case 'endpoint': {
//                                     args['endpoint'] = protocol.readStringValue();
//                                 } break;

//                                 default:
//                                     throw new Error(`Unknown action argument ${requestArgumentHeader.argumentName} for action ${requestHeader.actionName}`);
//                             }
//                         }

//                         requestData = this.handler.registerService(args['serviceName'], args['endpoint']);
//                     } break;

//                     case 'resolveRegisteredService': {
//                         const args: { [key: string]: any } = {};

//                         for (let i = 0; i < requestHeader.argumentCount; i++) {
//                             const requestArgumentHeader = protocol.readRequestArgumentHeader();

//                             switch (requestArgumentHeader.argumentName) {
//                                 case 'serviceName': {
//                                     args['serviceName'] = protocol.readStringValue();
//                                 } break;

//                                 case 'timeout': {
//                                     args['timeout'] = protocol.readIntegerValue();
//                                 } break;

//                                 default:
//                                     throw new Error(`Unknown action argument ${requestArgumentHeader.argumentName} for action ${requestHeader.actionName}`);
//                             }
//                         }

//                         requestData = this.handler.resolveRegisteredService(args['serviceName'], args['timeout']);
//                     } break;

//                     case 'resolveRegisteredServices': {
//                         const args: { [key: string]: any } = {};

//                         for (let i = 0; i < requestHeader.argumentCount; i++) {
//                             const requestArgumentHeader = protocol.readRequestArgumentHeader();

//                             switch (requestArgumentHeader.argumentName) {
//                                 case 'serviceName': {
//                                     args['serviceName'] = protocol.readStringValue();
//                                 } break;

//                                 case 'timeout': {
//                                     args['timeout'] = protocol.readIntegerValue();
//                                 } break;

//                                 default:
//                                     throw new Error(`Unknown action argument ${requestArgumentHeader.argumentName} for action ${requestHeader.actionName}`);
//                             }
//                         }

//                         requestData = this.handler.resolveRegisteredServices(args['serviceName'], args['timeout']);
//                     } break;

//                     default:
//                         throw new Error(`Unknown action ${requestHeader.actionName}`);
//                 }

//                 return new SuccessfulHandledRequestMessage(requestHeader.actionName, metadata, requestData);
//             }
//             catch (err) {
//                 return new FailedHandledRequestMessage(requestHeader.actionName, metadata, err);
//             }
//         }));

//         const writeTask = readHandler().then(async (handledRequest) => {
//             await this.protocol.writeData(this.transport, handledRequest.metadata, (protocol) => {
//                 if (handledRequest.success) {
//                     switch (handledRequest.actionName) {
//                         case 'resolveRegisteredService': {
//                             const handledResult = handledRequest.result as string;

//                             protocol.writeResponseHeader(new ResponseHeader(true, 'string'));

//                             protocol.writeStringValue(handledResult);
//                         }
//                         case 'resolveRegisteredServices': {
//                             const handledResult = handledRequest.result as Array<string>;

//                             protocol.writeResponseHeader(new ResponseHeader(true, 'array'));

//                             protocol.writeArrayHeader(new ArrayHeader(handledResult.length));
//                             for (const item of handledResult) {
//                                 protocol.writeArrayItemHeader(new ArrayItemHeader('string'));
//                                 protocol.writeStringValue(item);
//                             }
//                         }
//                     }
//                 }
//                 else {
//                     console.log(handledRequest.error.stack);

//                     protocol.writeResponseHeader(new ResponseHeader(false, 'model'));

//                     const requestError = new RequestError(handledRequest.error.message);

//                     protocol.writeModelHeader(new ModelHeader('requestError', 1));
//                     requestError.write(protocol);
//                 }
//             });
//         });
//     }
// }
