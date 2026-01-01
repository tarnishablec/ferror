import { createFamilyInstance } from "./family.ts";
import {
    CodeField,
    type DefinedError,
    ErrorBrand,
    type ErrorCase,
    type ErrorFamily,
    type ErrorMap,
    type ErrorSpec,
    type ErrorUnionOfMap,
    type ExtractPayload,
    PayloadField,
    ScopeField
} from "./types";


class InternalBaseError<const Code extends string, const Payloads extends readonly unknown[]> extends Error implements DefinedError<Code, Payloads> {
    readonly [ErrorBrand] = true as const;
    readonly [ScopeField]: symbol;
    readonly [PayloadField]: Payloads;
    readonly [CodeField]: Code;

    constructor(
        public readonly code: Code,
        args: Payloads,
        readonly scope: symbol,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = code;
        this[CodeField] = code;
        this[ScopeField] = scope;
        this[PayloadField] = args;

        Error.captureStackTrace(this, this.constructor);
    }

    is<K extends string, S extends ErrorSpec>(errorCase: ErrorCase<K, S>): this is DefinedError<K, ExtractPayload<S>> {
        return this[CodeField] as unknown === errorCase[CodeField];
    }
}

export function That<const M extends ErrorMap>(
    map: M
): ErrorFamily<M> {
    const scope = Symbol("ErrorFamilyScope");
    const cases: Record<string, (...args: unknown[]) => ErrorUnionOfMap<M>> = {};

    for (const key in map) {
        const spec = map[key];

        const factory = (...args: unknown[]): ErrorUnionOfMap<M> => {
            let finalArgs: unknown[] = args;
            let options: ErrorOptions | undefined;

            if (typeof spec === "function") {
                if (args.length > spec.length) {
                    const lastArg = args[args.length - 1];
                    if (lastArg !== null && typeof lastArg === "object" && !Array.isArray(lastArg)) {
                        options = lastArg as ErrorOptions;
                        finalArgs = args.slice(0, -1);
                    }
                }
                const message = (spec as (...a: unknown[]) => string)(...finalArgs);
                return new InternalBaseError(key, finalArgs, scope, message, options) as unknown as ErrorUnionOfMap<M>;
            }

            if (typeof spec === "string") {
                options = args[0] as ErrorOptions | undefined;
                return new InternalBaseError(key, [], scope, spec, options) as unknown as ErrorUnionOfMap<M>;
            }

            throw new Error("Invalid ErrorSpec");
        };

        Reflect.set(factory, CodeField, key);
        Reflect.set(factory, ScopeField, scope);

        cases[key] = factory;
    }

    return createFamilyInstance<M, []>(cases, scope, []);
}
