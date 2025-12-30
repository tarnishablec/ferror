import {
    type DefinedError,
    type DefinedErrorFactory,
    ErrorBrand,
    type ErrorFactory,
    type ErrorMap,
    type ErrorSpec
} from "./types";


class InternalBaseError<C extends string, P> extends Error implements DefinedError<C, P> {
    readonly [ErrorBrand] = true as const;

    constructor(
        public readonly code: C,
        public readonly payloads: P,
        readonly scope: symbol,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = code;
        this.scope = scope;
        this.payloads = payloads;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export function defineError<const M extends ErrorMap>(
    map: M
): DefinedErrorFactory<M> {
    const result = {} as Record<string, unknown>;
    const scope = Symbol();

    for (const key in map) {
        const spec = map[key];

        if (typeof spec === "function") {
            result[key] = (...args: unknown[]): DefinedError => {
                const message = (spec as (...args: unknown[]) => string)(...args);
                return new InternalBaseError(key, args, scope, message);
            };
        } else if (typeof spec === "string") {
            result[key] = (options?: ErrorOptions): DefinedError<string, void> => {
                return new InternalBaseError(key, undefined, scope, spec, options);
            };
        }

        const factory = result[key] as ErrorFactory<string, ErrorSpec>;

        Reflect.set(factory, "code", key);
        Reflect.set(factory, "scope", scope);
    }

    return result as DefinedErrorFactory<M>;
}

