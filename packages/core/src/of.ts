import {
    CodeField,
    type DefinedError,
    type ErrorCase,
    type ErrorFamily,
    MetaField,
    PayloadField,
    ScopeField
} from "./types";

export interface Scoped {
    readonly [ScopeField]: symbol;
}

export function scopeOf<C>(target: C extends ErrorCase<infer _K, infer _S> ? C : never): symbol;

export function scopeOf<E>(target: E extends DefinedError<infer _C, infer _P> ? E : never): symbol;

export function scopeOf<F>(
    target: F extends ErrorFamily<infer _M, infer _Es> ? F : never
): symbol;

export function scopeOf(target: Scoped): symbol {
    return target[ScopeField];
}

export function payloadOf<E extends DefinedError>(error: E): E[typeof PayloadField] {
    return error[PayloadField];
}

export function codeOf<E extends DefinedError>(error: E): E[typeof CodeField] {
    return error[CodeField];
}

export function metaOf<E extends DefinedError>(error: E): Record<string, unknown> {
    return error[MetaField] ?? {};
}