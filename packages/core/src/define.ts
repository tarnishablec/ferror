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


export function That<const M extends ErrorMap>(
    map: M
): ErrorFamily<M> {
    const scope = Symbol("ErrorFamilyScope");
    const cases: Record<string, (...args: unknown[]) => ErrorUnionOfMap<M>> = {};

    for (const key in map) {
        const spec = map[key];

        type Payload = ExtractPayload<M[typeof key]>;
        type Code = typeof key;

        const InternalBaseError = class extends Error implements DefinedError<Code, Payload> {
            readonly [ErrorBrand] = true as const;
            readonly [ScopeField]: symbol;
            readonly [PayloadField]: Payload;
            readonly [CodeField]: Code;

            constructor(
                readonly code: Code,
                args: Payload,
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

        Object.defineProperty(InternalBaseError, 'name', {value: key, configurable: true});

        const factory = (...args: unknown[]): ErrorUnionOfMap<M> => {
            let finalArgs = args;
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
                return new InternalBaseError(key, finalArgs as Payload, scope, message, options);
            }

            if (typeof spec === "string") {
                options = args[0] as ErrorOptions | undefined;
                return new InternalBaseError(key, [] as Payload, scope, spec, options);
            }

            throw new Error("Invalid ErrorSpec");
        };

        Reflect.set(factory, CodeField, key);
        Reflect.set(factory, ScopeField, scope);

        cases[key] = factory;
    }

    return createFamilyInstance<M, []>(cases, scope, []);
}
