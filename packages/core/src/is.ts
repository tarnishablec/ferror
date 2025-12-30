import {ErrorBrand, type DefinedError, type ErrorFactory, type ErrorSpec} from "./types";

export function is<K extends string, P extends ErrorSpec>(
    error: unknown,
    factory: ErrorFactory<K, P>
): error is DefinedError<K, P> {
    if (!(error instanceof Error) || !(ErrorBrand in error)) {
        return false;
    }

    return error.name === factory.code;
}

export function isDefinedError(e: unknown): e is DefinedError {
    if (!(e instanceof Error)) {
        return false;
    }

    const err = e as any;

    return (
        err[ErrorBrand] === true &&
        typeof err.code === "string" &&
        typeof err.scope === "symbol"
    );
}
