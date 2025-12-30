export const ErrorBrand = Symbol("FErrorBrand");

export interface DefinedError<
    Code extends string = string,
    Payload = unknown
> extends Error {
    readonly [ErrorBrand]: true;
    readonly code: Code;
    readonly payloads: Payload;
    readonly scope: symbol;
}


export type Into<E> = (cause: unknown) => E;


export type ErrorSpec =
    | string
    | ((...args: never[]) => string);

export type ErrorMap = Record<string, ErrorSpec>;


export type ErrorFactory<K extends string, S extends ErrorSpec> =
    (S extends (...args: infer A) => string
        ? (...args: A) => DefinedError<K, A>
        : (options?: { cause?: unknown }) => DefinedError<K, void>)
    & { readonly code: K; readonly scope: symbol };

export type DefinedErrorFactory<M extends ErrorMap> = {
    readonly [K in keyof M & string]: ErrorFactory<K, M[K]>;
};

export type InferDefinedError<F> =
    F extends Record<string, (...args: any[]) => infer R>
        ? R
        : never;