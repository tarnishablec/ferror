/*
 * Copyright 2019-Present tarnishablec. All Rights Reserved.
 */

import {type DefinedError, ErrorBrand, ScopeField} from "./types";

export function isDefinedError<E extends DefinedError>(
    error: unknown,
    scope?: symbol,
): error is E {
    if (!(error instanceof Error) || !(ErrorBrand in error)) {
        return false;
    }

    if (error[ErrorBrand] !== true) return false;
    return !(scope && Reflect.get(error, ScopeField) !== scope);
}
