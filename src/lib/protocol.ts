import { ITransport, ITransportMetadata } from './transport';
import {
    RequestHeader, RequestArgumentHeader, ResponseHeader, ModelHeader, ModelPropertyHeader, ArrayHeader, ArrayItemHeader,
    IRequestHeader, IRequestArgumentHeader, IResponseHeader, IModelHeader, IModelPropertyHeader, IArrayHeader, IArrayItemHeader, ResponseArgumentHeader, IResponseArgumentHeader, IDictionaryHeader, DictionaryHeader, IDictionaryItemHeader, DictionaryItemHeader, IIndefiniteValueHeader, IndefiniteValueHeader
} from './headers';

export interface IProtocol {
    readonly identifier: string;

    read<T>(data: Buffer, handler: (reader: IProtocolReader) => T): T;
    write(handler: (writer: IProtocolWriter) => void): Buffer;

    writeData(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void>;
    writeTaggedData(transport: ITransport, messageId: string, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void>;

    readData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult>;
    readTaggedData<TResult = void>(transport: ITransport, messageId: string, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult>;

    readBufferedTaggedData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, messageId: string, metadata: ITransportMetadata) => TResult): Promise<TResult>;

    writeAndReadData<TResult = void>(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<(readHandler: ((protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult)) => Promise<TResult>>;
}
export abstract class AProtocol implements IProtocol {
    public abstract get identifier(): string;

    public abstract read<T>(data: Buffer, handler: (reader: IProtocolReader) => T): T;
    public abstract write(handler: (writer: IProtocolWriter) => void): Buffer;

    public abstract writeData(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void>;
    public abstract writeTaggedData(transport: ITransport, messageId: string, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<void>;

    public abstract readData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult>;
    public abstract readTaggedData<TResult = void>(transport: ITransport, messageId: string, handler: (protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult): Promise<TResult>;

    public abstract readBufferedTaggedData<TResult = void>(transport: ITransport, handler: (protocolReader: IProtocolReader, messageId: string, metadata: ITransportMetadata) => TResult): Promise<TResult>;

    public abstract writeAndReadData<TResult = void>(transport: ITransport, metadata: ITransportMetadata, handler: (protocolWriter: IProtocolWriter) => void): Promise<(readHandler: ((protocolReader: IProtocolReader, metadata: ITransportMetadata) => TResult)) => Promise<TResult>>;
}

export interface IProtocolReader {
    readonly protocol: IProtocol;

    readData(): Buffer;

    readStringValue(): string;
    readBooleanValue(): boolean;
    readByteValue(): number;
    readShortValue(): number;
    readIntegerValue(): number;
    readLongValue(): bigint;
    readFloatValue(): number;
    readDoubleValue(): number;
    readEnumValue<T>(): T;

    readHashedBlock<T = void>(handler: (reader: IProtocolReader) => T): T;

    readRequestHeader(): IRequestHeader;
    readRequestArgumentHeader(): IRequestArgumentHeader;
    readResponseHeader(): IResponseHeader;
    readResponseArgumentHeader(): IResponseArgumentHeader;
    readModelHeader(): IModelHeader;
    readModelPropertyHeader(): IModelPropertyHeader;
    readArrayHeader(): IArrayHeader;
    readArrayItemHeader(): IArrayItemHeader;
    readDictionaryHeader(): IDictionaryHeader;
    readDictionaryItemHeader(): IDictionaryItemHeader;
    readIndefiniteValueHeader(): IIndefiniteValueHeader;
}
export interface IProtocolWriter {
    readonly protocol: IProtocol;

    writeData(value: Buffer): void;

    writeStringValue(value: string): void;
    writeBooleanValue(value: boolean): void;
    writeByteValue(value: number): void;
    writeShortValue(value: number): void;
    writeIntegerValue(value: number): void;
    writeLongValue(value: bigint): void;
    writeFloatValue(value: number): void;
    writeDoubleValue(value: number): void;
    writeEnumValue<T>(value: T): void;

    writeHashedBlock(handler: (writer: IProtocolWriter) => void): void;

    writeRequestHeader(header: IRequestHeader): void;
    writeRequestArgumentHeader(header: IRequestArgumentHeader): void;
    writeResponseHeader(header: IResponseHeader): void;
    writeResponseArgumentHeader(header: IResponseArgumentHeader): void;
    writeModelHeader(header: IModelHeader): void;
    writeModelPropertyHeader(header: IModelPropertyHeader): void;
    writeArrayHeader(header: IArrayHeader): void;
    writeArrayItemHeader(header: IArrayItemHeader): void;
    writeDictionaryHeader(header: IDictionaryHeader): void;
    writeDictionaryItemHeader(header: IDictionaryItemHeader): void;
    writeIndefiniteValueHeader(header: IIndefiniteValueHeader): void;
}

export abstract class AProtocolReader implements IProtocolReader {
    public readonly protocol: AProtocol;

    public constructor(protocol: AProtocol) {
        this.protocol = protocol;
    }

    public abstract readData(): Buffer;

    public abstract readStringValue(): string;
    public abstract readBooleanValue(): boolean;
    public abstract readByteValue(): number;
    public abstract readShortValue(): number;
    public abstract readIntegerValue(): number;
    public abstract readLongValue(): bigint;
    public abstract readFloatValue(): number;
    public abstract readDoubleValue(): number;
    public abstract readEnumValue<T>(): T;

    public abstract readHashedBlock<T = void>(handler: (reader: IProtocolReader) => T): T;

    public readRequestHeader() {
        const actionName = this.readStringValue();
        const argumentCount = this.readIntegerValue();

        return new RequestHeader(actionName, argumentCount);
    }
    public readRequestArgumentHeader() {
        const argumentName = this.readStringValue();
        const type = this.readStringValue();

        return new RequestArgumentHeader(argumentName, type);
    }
    public readResponseHeader() {
        const success = this.readBooleanValue();
        const type = this.readStringValue();
        const argumentCount = this.readIntegerValue();

        return new ResponseHeader(success, type, argumentCount);
    }
    public readResponseArgumentHeader() {
        const argumentName = this.readStringValue();
        const type = this.readStringValue();

        return new ResponseArgumentHeader(argumentName, type);
    }
    public readModelHeader() {
        const modelName = this.readStringValue();
        const propertyCount = this.readIntegerValue();

        return new ModelHeader(modelName, propertyCount);
    }
    public readModelPropertyHeader() {
        const propertyName = this.readStringValue();
        const type = this.readStringValue();

        return new ModelPropertyHeader(propertyName, type);
    }
    public readArrayHeader() {
        const itemCount = this.readIntegerValue();

        return new ArrayHeader(itemCount);
    }
    public readArrayItemHeader() {
        const type = this.readStringValue();

        return new ArrayItemHeader(type);
    }
    public readDictionaryHeader() {
        const recordCount = this.readIntegerValue();

        return new DictionaryHeader(recordCount);
    }
    public readDictionaryItemHeader() {
        const keyType = this.readStringValue();
        const valueType = this.readStringValue();

        return new DictionaryItemHeader(keyType, valueType);
    }
    public readIndefiniteValueHeader() {
        const valueType = this.readStringValue();

        return new IndefiniteValueHeader(valueType);
    }
}

export abstract class AProtocolWriter implements IProtocolWriter {
    public readonly protocol: AProtocol;

    public constructor(protocol: AProtocol) {
        this.protocol = protocol;
    }

    public abstract writeData(value: Buffer): void;

    public abstract writeStringValue(value: string): void;
    public abstract writeBooleanValue(value: boolean): void;
    public abstract writeByteValue(value: number): void;
    public abstract writeShortValue(value: number): void;
    public abstract writeIntegerValue(value: number): void;
    public abstract writeLongValue(value: bigint): void;
    public abstract writeFloatValue(value: number): void;
    public abstract writeDoubleValue(value: number): void;
    public abstract writeEnumValue<T>(value: T): void;

    public abstract writeHashedBlock(handler: (writer: IProtocolWriter) => void): void;

    public writeRequestHeader(header: IRequestHeader) {
        this.writeStringValue(header.actionName);
        this.writeIntegerValue(header.argumentCount);
    }
    public writeRequestArgumentHeader(header: IRequestArgumentHeader) {
        this.writeStringValue(header.argumentName);
        this.writeStringValue(header.type);
    }
    public writeResponseHeader(header: IResponseHeader) {
        this.writeBooleanValue(header.success);
        this.writeStringValue(header.type);
        this.writeIntegerValue(header.argumentCount);
    }
    public writeResponseArgumentHeader(header: IResponseArgumentHeader) {
        this.writeStringValue(header.argumentName);
        this.writeStringValue(header.type);
    }
    public writeModelHeader(header: IModelHeader) {
        this.writeStringValue(header.modelName);
        this.writeIntegerValue(header.propertyCount);
    }
    public writeModelPropertyHeader(header: IModelPropertyHeader) {
        this.writeStringValue(header.propertyName);
        this.writeStringValue(header.type);
    }
    public writeArrayHeader(header: IArrayHeader) {
        this.writeIntegerValue(header.itemCount);
    }
    public writeArrayItemHeader(header: IArrayItemHeader) {
        this.writeStringValue(header.type);
    }
    public writeDictionaryHeader(header: IDictionaryHeader) {
        this.writeIntegerValue(header.recordCount);
    }
    public writeDictionaryItemHeader(header: IDictionaryItemHeader) {
        this.writeStringValue(header.keyType);
        this.writeStringValue(header.valueType);
    }
    public writeIndefiniteValueHeader(header: IIndefiniteValueHeader) {
        this.writeStringValue(header.valueType);
    }
}
