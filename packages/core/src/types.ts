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
    /**
     * Uses `never[]` to leverage contravariance, ensuring it can
     * serve as a base type for functions with any parameter types.
     */
    | ((...args: never[]) => string);

export type ExtractPayload<S extends ErrorSpec> =
    S extends (...args: infer A) => string
        ? A
        : never[];

export type ErrorMap = Record<string, ErrorSpec>;

export type ErrorUnionOfMap<M extends ErrorMap> = {
    [K in keyof M & string]: DefinedError<K, ExtractPayload<M[K]>>;
}[keyof M & string];

export type ErrorCase<K extends string, S extends ErrorSpec> =
    ([S] extends [(...args: infer A) => string]
        ? (...args: [...args: A, options?: ErrorOptions]) => DefinedError<K, A>
        : (options?: ErrorOptions) => DefinedError<K, never[]>)
    & { readonly [CodeField]: K; readonly [ScopeField]: symbol };

export type ErrorFamily<M extends ErrorMap, Es extends readonly [Error, ErrorUnionOfMap<M>][] = []> = {
    readonly [K in keyof M & string]: ErrorCase<K, M[K]>;
} & {
    readonly [ScopeField]: symbol;
} & {
    enroll<E extends Error, K extends keyof M & string, C extends ErrorUnionOfMap<M>>(
        errorClass: new (...args: never[]) => E,
        errorCase: ErrorCase<K, M[K]> & ((...args: never[]) => C),
        transformer?: (e: E)
            => ExtractPayload<M[K]>): ErrorFamily<M, readonly [...Es, [E, C]]>;

    from<E extends Es[number][0]>(error: E): Extract<Es[number], [E, unknown]>[1];
};

export type ErrorMapOf<F> =
    F extends ErrorFamily<infer M, infer _Es>
        ? M
        : never;
