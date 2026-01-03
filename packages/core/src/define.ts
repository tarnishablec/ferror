import { createFamilyInstance } from "./family.ts";
import {
    CodeField,
    type DefinedError,
    ErrorBrand,
    type ErrorCase,
    type ErrorFamily,
    type ErrorFamilyCases,
    type ErrorMap,
    type ErrorSpec,
    type ErrorUnionOfMap,
    type ExtractPayload,
    MetaField,
    PayloadField,
    ScopeField
} from "./types";


export function That<const M extends ErrorMap>(
    map: M
): ErrorFamily<M> {
    const scope = Symbol("ErrorFamilyScope");
    const cases: Partial<ErrorFamilyCases<M>> = {};

    for (const key in map) {
        const spec = map[key];

        type Payload = ExtractPayload<M[typeof key]>;
        type Code = typeof key;

        const InternalBaseError = class extends Error implements DefinedError<Code, Payload> {
            readonly [ErrorBrand] = true as const;
            readonly [ScopeField]: symbol;
            readonly [PayloadField]: Payload;
            readonly [CodeField]: Code;
            [MetaField]: Record<string, unknown>;

            constructor(
                _caller: (...args: Payload) => ErrorUnionOfMap<M>,
                readonly code: Code,
                args: Payload,
                readonly scope: symbol,
                message: string,
            ) {
                super(message);
                this.name = code;
                this[CodeField] = code;
                this[ScopeField] = scope;
                this[PayloadField] = args;
                this[MetaField] = {};

                Error.captureStackTrace(this, _caller);
            }

            with<Me extends Record<string, unknown>>(options?: ErrorOptions, meta?: Me) {
                this.cause = options?.cause;
                this[MetaField] = {...this[MetaField], ...meta};
                return this as this & DefinedError<Extract<keyof M, string>, ExtractPayload<M[Extract<keyof M, string>]>, Record<string, unknown> & Me>;
            }

            is<K extends string, S extends ErrorSpec>(errorCase: ErrorCase<K, S>): this is DefinedError<K, ExtractPayload<S>> {
                return this[CodeField] as unknown === errorCase[CodeField];
            }
        }

        Object.defineProperty(InternalBaseError, 'name', {value: key, configurable: true});

        const factory = (...args: Payload): ErrorUnionOfMap<M> => {
            let message: string;

            if (typeof spec === "function") {
                message = (spec as (...a: unknown[]) => string)(...args);
            } else if (typeof spec === "string") {
                message = spec;
            } else {
                throw new Error(`Invalid error spec ${spec}`)
            }

            return new InternalBaseError(factory, key, args, scope, message);
        };

        factory[CodeField] = key;
        factory[ScopeField] = scope;

        Reflect.set(cases, key, factory);
    }

    return createFamilyInstance<M, []>(cases as ErrorFamilyCases<M>, scope, []);
}
