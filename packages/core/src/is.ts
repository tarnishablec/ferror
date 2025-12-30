import {
    CodeField,
    type DefinedError,
    ErrorBrand,
    type ErrorCase,
    type ErrorSpec,
    type ExtractPayload,
    ScopeField
} from "./types";

export function isDefinedError<E extends DefinedError>(
    error: unknown,
    scope?: symbol
): error is E {
    if (!(error instanceof Error) || !(ErrorBrand in error)) {
        return false;
    }

    if (error[ErrorBrand] !== true) return false;
    return !(scope && Reflect.get(error, ScopeField) !== scope);
}

export function is<K extends string, S extends ErrorSpec>(
    error: unknown,
    errorCase: ErrorCase<K, S>
): error is DefinedError<K, ExtractPayload<S>> {
    if (!isDefinedError(error, errorCase[ScopeField])) {
        return false;
    }

    return error.name === errorCase[CodeField];
}