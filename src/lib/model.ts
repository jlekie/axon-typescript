import { IProtocolReader, IProtocolWriter } from './protocol';
import { IModelHeader, IModelPropertyHeader } from './headers';

export interface IModel {
    getModelName(): string;
    getPropertyNames(): ReadonlyArray<string>;
    getDefinedPropertyNames(): ReadonlyArray<string>;
    getPropertyValue(propertyName: string): any;
    isPropertyDefined(propertyName: string): boolean;

    write(protocol: IProtocolWriter): void;
}

export abstract class AModel implements IModel {
    public abstract getModelName(): string;
    public getPropertyNames(): ReadonlyArray<string> {
        return [];
    }
    public getDefinedPropertyNames(): ReadonlyArray<string> {
        return [];
    }
    public getPropertyValue(propertyName: string): any {
        throw new Error(`Property ${propertyName} not recognized`);
    }
    public isPropertyDefined(propertyName: string): boolean {
        return false;
    }
    public isAnyPropertyDefined(): boolean {
        return false;
    }
    public toJson(): any {
        return {};
    }

    public write(protocol: IProtocolWriter) {
    }
}

export interface IVolatileModel extends IModel {
    read(protocol: IProtocolReader, modelHeader: IModelHeader): void;
}

export abstract class AVolatileModel extends AModel implements IVolatileModel {
    public read(protocol: IProtocolReader, modelHeader: IModelHeader) {
        for (let a = 0; a < modelHeader.propertyCount; a++) {
            const propertyHeader = protocol.readModelPropertyHeader();

            if (!this.readProperty(protocol, propertyHeader))
                throw new Error(`Property ${propertyHeader.propertyName} not recognized`);
        }
    }
    protected readProperty(protocol: IProtocolReader, propertyHeader: IModelPropertyHeader) {
        return false;
    }
}