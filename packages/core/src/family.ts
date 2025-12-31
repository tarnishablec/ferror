import {
    type ErrorCase,
    type ErrorFamily,
    type ErrorFamilyOperator,
    type ErrorMap,
    type ErrorUnionOfMap,
    type ExtractPayload,
    type InstanceOfError,
    ScopeField,
    type Upsert
} from "./types.ts";

type BasicErrorClass = new (...args: never[]) => Error;

interface EnrollEntry<M extends ErrorMap> {
    readonly type: 'enroll';
    readonly cls: BasicErrorClass;
    readonly errorCase: (...args: unknown[]) => ErrorUnionOfMap<M>;
    readonly transformer?: (e: Error) => unknown[];
}

interface BridgeEntry<M extends ErrorMap> {
    readonly type: 'bridge';
    readonly cls: BasicErrorClass;
    readonly mapper: (
        e: Error,
        cases: Record<string, (...args: unknown[]) => ErrorUnionOfMap<M>>
    ) => ErrorUnionOfMap<M> | undefined;
}

type RegistryEntry<M extends ErrorMap> = EnrollEntry<M> | BridgeEntry<M>;

class OperatorImpl<M extends ErrorMap, Es extends readonly (readonly [Error, ErrorUnionOfMap<M>])[]>
    implements ErrorFamilyOperator<M, Es> {
    constructor(
        private readonly _cases: Record<string, (...args: unknown[]) => ErrorUnionOfMap<M>>,
        private readonly _scope: symbol,
        private readonly _registry: readonly RegistryEntry<M>[] = []
    ) {
    }

    bridge<T extends {
        new(...args: never[]): Error;
        readonly prototype: Error
    }, C extends ErrorUnionOfMap<M>, E extends InstanceOfError<T>>(errorClass: T, mapper: <_K>(e: E, cases: { [K in keyof M & string]: ErrorCase<K, M[K]> }) => C): ErrorFamily<M, Upsert<Es, E, C>> {
        const internalMapper: BridgeEntry<M>['mapper'] = (e, cases) => {
            const typedError = e as unknown as E;
            const typedCases = cases as unknown as { [K in keyof M & string]: ErrorCase<K, M[K]> };
            return mapper(typedError, typedCases);
        };

        const entry: BridgeEntry<M> = {
            type: 'bridge',
            cls: errorClass as unknown as BasicErrorClass,
            mapper: internalMapper
        };

        const nextRegistry: readonly RegistryEntry<M>[] = [
            ...this._registry.filter(r => r.cls !== (errorClass as unknown as BasicErrorClass)),
            entry
        ];

        return createFamilyInstance<M, Upsert<Es, E, C>>(
            this._cases,
            this._scope,
            nextRegistry
        );
    }

    enroll<T extends {
        new(...args: never[]): Error;
        readonly prototype: Error
    }, K extends keyof M & string, U extends ErrorUnionOfMap<M>, E extends InstanceOfError<T>>(errorClass: T, errorCase: ErrorCase<K, M[K]> & ((...args: never[]) => U), ...args: ExtractPayload<M[K]> extends ([] | never[]) ? [] : [transformer: (e: E) => ExtractPayload<M[K]>]): ErrorFamily<M, Upsert<Es, E, U>> {
        const transformer = args[0] as ((e: Error) => unknown[]) | undefined;

        const entry: RegistryEntry<M> = {
            type: 'enroll',
            cls: errorClass as unknown as ErrorConstructor,
            errorCase: errorCase as unknown as (...args: unknown[]) => ErrorUnionOfMap<M>,
            transformer
        };

        return createFamilyInstance<M, Upsert<Es, E, U>>(
            this._cases,
            this._scope,
            [...this._registry.filter(r => r.cls !== (errorClass as unknown as ErrorConstructor)), entry]
        );

    }

    from<E extends Error>(error: E): Extract<Es[number], readonly [E, unknown]>[1] {
        const registry = this._registry;
        for (let i = registry.length - 1; i >= 0; i--) {
            const entry = registry[i];

            if (entry && error instanceof entry.cls) {
                if (entry.type === 'bridge') {
                    // 这里的 mapper 已经在 RegistryEntry 中定义为 (e: Error, cases: ...)
                    const result = entry.mapper(error, this._cases);
                    if (result) return result as Extract<Es[number], readonly [E, unknown]>[1];
                    continue;
                }

                const payload = entry.transformer ? entry.transformer(error) : [];
                return entry.errorCase(...payload) as Extract<Es[number], readonly [E, unknown]>[1];
            }
        }

        return error as unknown as Extract<Es[number], readonly [E, unknown]>[1];
    }
}

export function createFamilyInstance<
    M extends ErrorMap,
    Es extends readonly (readonly [Error, ErrorUnionOfMap<M>])[]
>(
    cases: Record<string, (...args: unknown[]) => ErrorUnionOfMap<M>>,
    scope: symbol,
    registry: readonly RegistryEntry<M>[]
): ErrorFamily<M, Es> {
    const op = new OperatorImpl<M, Es>(cases, scope, registry);

    const descriptors: PropertyDescriptorMap = {
        [ScopeField]: {value: scope, enumerable: false, configurable: false},
        enroll: {value: op.enroll.bind(op), enumerable: false, configurable: true},
        bridge: {value: op.bridge.bind(op), enumerable: false, configurable: true},
        from: {value: op.from.bind(op), enumerable: false, configurable: true}
    };

    for (const key in cases) {
        if (Object.hasOwn(cases, key)) {
            descriptors[key] = {
                value: cases[key],
                enumerable: true,
                configurable: false,
                writable: false
            };
        }
    }

    return Object.defineProperties(
        Object.create(null),
        descriptors
    ) as unknown as ErrorFamily<M, Es>;
}