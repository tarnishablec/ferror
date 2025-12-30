export const ErrorBrand: unique symbol = Symbol("FErrorBrand");
export const ScopeField: unique symbol = Symbol("FErrorScope");
export const PayloadField: unique symbol = Symbol("FErrorPayload");
export const CodeField: unique symbol = Symbol("FErrorCode");

export interface DefinedError<
    Code extends string = string,
    Payload extends readonly unknown[] = readonly unknown[]
> extends Error {
    readonly [ErrorBrand]: true;
    readonly [ScopeField]: symbol;
    readonly [PayloadField]: Payload;
    readonly [CodeField]: Code;
}

export type ErrorSpec =
    | string
    | ((...args: never[]) => string);

export type ExtractPayload<S extends ErrorSpec> =
    S extends (...args: infer A) => string
        ? A
        : never[];

export type ErrorMap = Record<string, ErrorSpec>;


export type ErrorCase<K extends string, S extends ErrorSpec> =
    ([S] extends [(...args: infer A) => string]
        ? (...args: [...args: A, options?: ErrorOptions]) => DefinedError<K, A>
        : (options?: ErrorOptions) => DefinedError<K, never[]>)
    & { readonly [CodeField]: K; readonly [ScopeField]: symbol };

export type ErrorFamily<M extends ErrorMap> = {
    readonly [K in keyof M & string]: ErrorCase<K, M[K]>;
} & {
    readonly [ScopeField]: symbol;
};

export type ErrorOf<F> =
    F extends ErrorFamily<infer _M>
        ? ReturnType<F[keyof F & string]>
        : never;

