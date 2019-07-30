export interface IRequestHeader {
    readonly actionName: string;
    readonly argumentCount: number;
    readonly tags: Map<string, string>;
}
export class RequestHeader implements IRequestHeader {
    public readonly actionName: string;
    public readonly argumentCount: number;
    public readonly tags: Map<string, string>;

    public constructor(actionName: string, argumentCount: number, tags?: Map<string, string>) {
        this.actionName = actionName;
        this.argumentCount = argumentCount;

        this.tags = new Map<string, string>();
        if (tags) {
            for (const tag of tags)
                this.tags.set(tag[0], tag[1]);
        }
    }
}

export interface IRequestArgumentHeader {
    readonly argumentName: string;
    readonly type: string;
}
export class RequestArgumentHeader implements IRequestArgumentHeader {
    public readonly argumentName: string;
    public readonly type: string;

    public constructor(argumentName: string, type: string) {
        this.argumentName = argumentName;
        this.type = type;
    }
}

export interface IResponseHeader {
    readonly success: boolean;
    readonly type: string;
    readonly argumentCount: number;
}
export class ResponseHeader implements IResponseHeader {
    public readonly success: boolean;
    public readonly type: string;
    public readonly argumentCount: number;

    public constructor(success: boolean, type: string, argumentCount: number = 0) {
        this.success = success;
        this.type = type;
        this.argumentCount = argumentCount;
    }
}

export interface IResponseArgumentHeader {
    readonly argumentName: string;
    readonly type: string;
}
export class ResponseArgumentHeader implements IResponseArgumentHeader {
    public readonly argumentName: string;
    public readonly type: string;

    public constructor(argumentName: string, type: string) {
        this.argumentName = argumentName;
        this.type = type;
    }
}

export interface IModelHeader {
    readonly modelName: string;
    readonly propertyCount: number;
}
export class ModelHeader implements IModelHeader {
    public readonly modelName: string;
    public readonly propertyCount: number;

    public constructor(modelName: string, propertyCount: number) {
        this.modelName = modelName;
        this.propertyCount = propertyCount;
    }
}

export interface IModelPropertyHeader {
    readonly propertyName: string;
    readonly type: string;
}
export class ModelPropertyHeader implements IModelPropertyHeader {
    public readonly propertyName: string;
    public readonly type: string;

    public constructor(propertyName: string, type: string) {
        this.propertyName = propertyName;
        this.type = type;
    }
}

export interface IArrayHeader {
    readonly itemCount: number;
}
export class ArrayHeader implements IArrayHeader {
    public readonly itemCount: number;

    public constructor(itemCount: number) {
        this.itemCount = itemCount;
    }
}

export interface IArrayItemHeader {
    readonly type: string;
}
export class ArrayItemHeader implements IArrayItemHeader {
    public readonly type: string;

    public constructor(type: string) {
        this.type = type;
    }
}

export interface IDictionaryHeader {
    readonly recordCount: number;
}
export class DictionaryHeader implements IDictionaryHeader {
    public readonly recordCount: number;

    public constructor(recordCount: number) {
        this.recordCount = recordCount;
    }
}

export interface IDictionaryItemHeader {
    readonly keyType: string;
    readonly valueType: string;
}
export class DictionaryItemHeader implements IDictionaryItemHeader {
    public readonly keyType: string;
    public readonly valueType: string;

    public constructor(keyType: string, valueType: string) {
        this.keyType = keyType;
        this.valueType = valueType;
    }
}