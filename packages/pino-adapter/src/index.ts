/*
 * Copyright 2019-Present tarnishablec. All Rights Reserved.
 */

import {codeOf, isDefinedError, payloadOf, type ThatError,} from "@thaterror/core";
import pino, {type LoggerOptions, type SerializedError} from "pino";

export const thaterrorSerializer = (e: ThatError): SerializedError => {
    const pinoErr = pino.stdSerializers.errWithCause(e);

    return {
        ...pinoErr,
        code: codeOf(e),
        payload: payloadOf(e),
    };
};

export const thaterrorHooks: LoggerOptions["hooks"] = {
    logMethod(this, args, method) {
        const err = args[0];
        if (err && isDefinedError(err)) {
            return method.apply(this, [
                {thaterror: err},
                args[1],
                ...args.slice(2),
            ]);
        }
        return method.apply(this, args);
    },
};
