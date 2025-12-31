import { type DefinedError, type ErrorCase, type ErrorFamily, ScopeField } from "./types";

export interface Scoped {
    readonly [ScopeField]: symbol;
}

export function scopeOf<C>(target: C extends ErrorCase<infer _K, infer _S> ? C : never): symbol;

export function scopeOf<E>(target: E extends DefinedError<infer _C, infer _P> ? E : never): symbol;

export function scopeOf<F>(
    target: F extends ErrorFamily<infer _M, infer _Es> ? F : never
): symbol;

export function scopeOf(target: Scoped | Error): symbol {
    if (target && ScopeField in target) {
        return (target as Scoped)[ScopeField];
    }

    if (target instanceof Error) {
        throw new Error("This Error instance does not belong to any defined ErrorFamily.");
    }

    throw new Error("Invalid target: Not a Scoped object.");
}