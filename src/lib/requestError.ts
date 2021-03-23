import { IProtocolReader, IProtocolWriter } from './protocol';
import { ModelHeader, ModelPropertyHeader, IModelHeader, IModelPropertyHeader } from './headers';

export interface IRequestError {
    message: string | undefined;

    write(protocol: IProtocolWriter): void;
    read(protocol: IProtocolReader, modelHeader: ModelHeader): void;
    toError(): Error;
}

export class RequestError implements IRequestError {
    public message: string | undefined;

    public constructor(message?: string) {
        this.message = message;
    }

    public write(protocol: IProtocolWriter) {
        if (this.message !== undefined) {
            protocol.writeModelPropertyHeader(new ModelPropertyHeader('message', 'string'));
            protocol.writeStringValue(this.message);
        }
    }
    public read(protocol: IProtocolReader, modelHeader: IModelHeader) {
        for (let a = 0; a < modelHeader.propertyCount; a++) {
            const propertyHeader = protocol.readModelPropertyHeader();

            if (!this.readProperty(protocol, propertyHeader))
                throw new Error(`Property ${propertyHeader.propertyName} not recognized`);
        }
    }
    private readProperty(protocol: IProtocolReader, propertyHeader: IModelPropertyHeader) {
        switch (propertyHeader.propertyName) {
            case 'message':
                if (propertyHeader.type !== 'string')
                    throw new Error(`Unexpected data type for property message (${propertyHeader.type})`);

                this.message = protocol.readStringValue();

                return true;
            default:
                return false;
        }
    }

    public slipstreamWrite(writer: IProtocolWriter) {
        writer.writeStringValue(this.message ?? 'Undefined');
    }
    public slipstreamRead(reader: IProtocolReader) {
        this.message = reader.readStringValue();
    }

    public toError() {
        return new Error(this.message);
    }
}