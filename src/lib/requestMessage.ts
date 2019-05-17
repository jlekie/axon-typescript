export interface IHandledRequestMessage {
    readonly actionName: string;
    readonly metadata: Map<string, Buffer>;
}
export interface ISuccessfulHandledRequestMessage extends IHandledRequestMessage {
    readonly success: true;
    readonly result: any;
}
export interface IFailedHandledRequestMessage extends IHandledRequestMessage {
    readonly success: false;
    readonly error: Error;
}

export type HandledRequestMessage = ISuccessfulHandledRequestMessage | IFailedHandledRequestMessage;

export class SuccessfulHandledRequestMessage implements ISuccessfulHandledRequestMessage {
    public readonly actionName: string;
    public readonly metadata: Map<string, Buffer>;
    public readonly success: true;
    public readonly result: any;

    public constructor(actionName: string, metadata: Map<string, Buffer>, result?: any) {
        this.actionName = actionName;
        this.metadata = new Map(metadata);

        this.success = true;
        this.result = result;
    }
}
export class FailedHandledRequestMessage implements IFailedHandledRequestMessage {
    public readonly actionName: string;
    public readonly metadata: Map<string, Buffer>;
    public readonly success: false;
    public readonly error: Error;

    public constructor(actionName: string, metadata: Map<string, Buffer>, error: Error) {
        this.actionName = actionName;
        this.metadata = new Map(metadata);

        this.success = false;
        this.error = error;
    }
}