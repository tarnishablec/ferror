import {
    CodeField,
    type DefinedError,
    ErrorBrand, type ErrorCase,
    type ErrorFamily,
    type ErrorMap, type ErrorSpec,
    PayloadField,
    ScopeField
} from "./types";


class InternalBaseError<C extends string, P extends readonly unknown[]> extends Error implements DefinedError<C, P> {
    readonly [ErrorBrand] = true as const;
    readonly [ScopeField]: symbol;
    readonly [PayloadField]: P;
    readonly [CodeField]: C;

    constructor(
        public readonly code: C,
        args: P,
        readonly scope: symbol,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = code;
        this[CodeField] = code;
        this[ScopeField] = scope;
        this[PayloadField] = args;
    }
}

export function defineError<const M extends ErrorMap>(
    map: M
): ErrorFamily<M> {
    const result = {} as Record<string, unknown>;
    const scope = Symbol();

    for (const key in map) {
        const spec = map[key];

        const factory = (...args: unknown[]) => {
            let finalArgs = args;
            let options: ErrorOptions | undefined;

            if (typeof spec === "function") {
                if (args.length > spec.length) {
                    const lastArg = args[args.length - 1];
                    if (typeof lastArg === "object" && lastArg !== null) {
                        options = lastArg as ErrorOptions;
                        finalArgs = args.slice(0, -1);
                    }
                }

                const message = (spec as (...args: unknown[]) => string)(...finalArgs);
                return new InternalBaseError(key, finalArgs, scope, message, options);
            }

            if (typeof spec === "string") {
                options = args[0] as ErrorOptions | undefined;
                return new InternalBaseError(key, [], scope, spec, options);
            }
        };

        Reflect.set(factory, CodeField, key);
        Reflect.set(factory, ScopeField, scope);

        result[key] = factory;
    }

    Reflect.set(result, ScopeField, scope);
    return result as ErrorFamily<M>;
}

export function scopeOfFamily<M extends ErrorMap>(errorFamily: ErrorFamily<M>) {
    return errorFamily[ScopeField];
}

export function scopeOfError<E extends DefinedError>(error: E) {
    return error[ScopeField];
}

export function scopeOfCase<K extends string, S extends ErrorSpec>(
    errorCase: ErrorCase<K, S>
) {
    return errorCase[ScopeField];
}

export function scopeOf(target: { [ScopeField]: symbol } | DefinedError) {
    if (typeof target === "function") return scopeOfCase(target);
    if (target instanceof Error) return scopeOfError(target);
    if (typeof target === "object") return scopeOfFamily(target);
    throw new Error("Invalid target");
}