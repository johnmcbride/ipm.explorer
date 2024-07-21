type ErrorName = |
'INVALID_RESPONSE_CONTENTTYPE';

export class ContentTypeError extends Error
{
    name: ErrorName;
    message: string;
    cause: any;

    constructor({
        name,
        message,
        cause
    }: {
        name: ErrorName;
        message:string;
        cause?:any;
    }) {
        super();
        this.name = name;
        this.message = message;
        this.cause = cause;
    }
}