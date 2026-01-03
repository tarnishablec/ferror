/*
 * Copyright 2019-Present tarnishablec. All Rights Reserved.
 */

import {
    type ErrorCase,
    type ErrorFamily,
    type ErrorFamilyCases,
    type ErrorFamilyOperator,
    type ErrorMap,
    type ErrorUnionOfMap,
    type ExtractPayload,
    type InstanceOfError,
    ScopeField,
    type Upsert,
} from "./types.ts";

type BasicErrorClass = new (...args: never[]) => Error;

interface EnrollEntry<M extends ErrorMap> {
    readonly type: "enroll";
    readonly cls: BasicErrorClass;
    readonly errorCase: (...args: unknown[]) => ErrorUnionOfMap<M>;
    readonly transformer?: (e: Error) => unknown[];
}

interface BridgeEntry<M extends ErrorMap> {
    readonly type: "bridge";
    readonly cls: BasicErrorClass;
    readonly mapper: (
        e: Error,
        cases: ErrorFamilyCases<M>,
    ) => ErrorUnionOfMap<M> | undefined;
}

type RegistryEntry<M extends ErrorMap> = EnrollEntry<M> | BridgeEntry<M>;

class OperatorImpl<
    M extends ErrorMap,
    Es extends readonly (readonly [Error, ErrorUnionOfMap<M>])[],
> implements ErrorFamilyOperator<M, Es>
{
    constructor(
        private readonly _cases: ErrorFamilyCases<M>,
        private readonly _scope: symbol,
        private readonly _registry: readonly RegistryEntry<M>[] = [],
    ) {}

    bridge<
        T extends {
            new (...args: never[]): Error;
            readonly prototype: Error;
        },
        C extends ErrorUnionOfMap<M>,
        E extends InstanceOfError<T>,
    >(
        errorClass: T,
        mapper: <_K>(
            e: E,
            cases: {[K in keyof M & string]: ErrorCase<K, M[K]>},
        ) => C,
    ): ErrorFamily<M, Upsert<Es, E, C>> {
        const internalMapper: BridgeEntry<M>["mapper"] = (e, cases) => {
            const typedError = e as unknown as E;
            const typedCases = cases as unknown as {
                [K in keyof M & string]: ErrorCase<K, M[K]>;
            };
            return mapper(typedError, typedCases);
        };

        const entry: BridgeEntry<M> = {
            type: "bridge",
            cls: errorClass as unknown as BasicErrorClass,
            mapper: internalMapper,
        };

        const nextRegistry: readonly RegistryEntry<M>[] = [
            ...this._registry.filter(
                (r) => r.cls !== (errorClass as unknown as BasicErrorClass),
            ),
            entry,
        ];

        return createFamilyInstance<M, Upsert<Es, E, C>>(
            this._cases,
            this._scope,
            nextRegistry,
        );
    }

    enroll<
        T extends {
            new (...args: never[]): Error;
            readonly prototype: Error;
        },
        K extends keyof M & string,
        U extends ErrorUnionOfMap<M>,
        E extends InstanceOfError<T>,
    >(
        errorClass: T,
        errorCase: ErrorCase<K, M[K]> & ((...args: never[]) => U),
        ...args: ExtractPayload<M[K]> extends [] | never[]
            ? []
            : [transformer: (e: E) => ExtractPayload<M[K]>]
    ): ErrorFamily<M, Upsert<Es, E, U>> {
        const transformer = args[0] as ((e: Error) => unknown[]) | undefined;

        const entry: RegistryEntry<M> = {
            type: "enroll",
            cls: errorClass,
            errorCase: errorCase as unknown as (
                ...args: unknown[]
            ) => ErrorUnionOfMap<M>,
            transformer,
        };

        return createFamilyInstance<M, Upsert<Es, E, U>>(
            this._cases,
            this._scope,
            [...this._registry.filter((r) => r.cls !== errorClass), entry],
        );
    }

    from<E extends Error>(error: E): Es[number][1] {
        const registry = this._registry;

        for (let i = registry.length - 1; i >= 0; i--) {
            const entry = registry[i];

            if (entry && error instanceof entry.cls) {
                let result: Es[number][1];

                if (entry.type === "bridge") {
                    const mapped = entry.mapper(error, this._cases);
                    if (!mapped) continue;
                    result = mapped;
                } else {
                    const payload = entry.transformer
                        ? entry.transformer(error)
                        : [];
                    result = entry.errorCase(...payload);
                }

                result.cause = error;
                return result;
            }
        }

        throw new Error(
            `No matching error case found for ${error.constructor.name}`,
        );
    }
}

export function createFamilyInstance<
    M extends ErrorMap,
    Es extends readonly (readonly [Error, ErrorUnionOfMap<M>])[],
>(
    cases: ErrorFamilyCases<M>,
    scope: symbol,
    registry: readonly RegistryEntry<M>[],
): ErrorFamily<M, Es> {
    const op = new OperatorImpl<M, Es>(cases, scope, registry);

    const descriptors: PropertyDescriptorMap = {
        [ScopeField]: {value: scope, enumerable: false, configurable: false},
        enroll: {
            value: op.enroll.bind(op),
            enumerable: false,
            configurable: true,
        },
        bridge: {
            value: op.bridge.bind(op),
            enumerable: false,
            configurable: true,
        },
        from: {
            value: op.from.bind(op),
            enumerable: false,
            configurable: true,
        },
    };

    for (const key in cases) {
        if (Object.hasOwn(cases, key)) {
            descriptors[key] = {
                value: cases[key],
                enumerable: true,
                configurable: false,
                writable: false,
            };
        }
    }

    return Object.defineProperties(
        Object.create(null),
        descriptors,
    ) as unknown as ErrorFamily<M, Es>;
}
