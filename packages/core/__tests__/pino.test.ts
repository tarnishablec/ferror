/*
 * Copyright 2019-Present tarnishablec. All Rights Reserved.
 */

// noinspection ES6UnusedImports
import {describe, expect, test} from "bun:test";
import {codeOf, payloadOf, type ThatError} from "@thaterror/core";
import pino from "pino";
import {AppError} from "./define-error.test.ts";

describe("pino logger test", () => {
    test("should log error with custom serializers", () => {
        const logs: string[] = [];

        // noinspection JSUnusedGlobalSymbols
        const logger = pino(
            {
                serializers: {
                    err: (e: ThatError) => {
                        return {
                            type: e.constructor.name,
                            message: e.message,
                            stack: e.stack,
                            code: codeOf(e),
                            payload: payloadOf(e),
                        };
                    },
                },
            },
            {
                write: (msg) => logs.push(msg),
            },
        );

        const testErr = AppError.ShardError(1, "shard-1");
        expect(testErr.constructor.name).toBe("ShardError");

        logger.error(testErr);

        expect(logs.length).toBe(1);

        const log = logs[0];
        expect(log).toBeTruthy();

        if (log) {
            const parsedLog = JSON.parse(log);
            expect(parsedLog.err.type).toBe("ShardError");
            expect(parsedLog.err.code).toBe("ShardError");
            expect(parsedLog.err.payload).toEqual([1, "shard-1"]);
            expect(parsedLog.level).toBe(50);
        }
    });
});
