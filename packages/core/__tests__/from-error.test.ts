/*
 * Copyright 2019-Present tarnishablec. All Rights Reserved.
 */

import {describe, expect, test} from "bun:test";
import {HTTPException} from "hono/http-exception";
import {AppError} from "./define-error.test";

class MyCustomError extends Error {
    prop = 1;
}

class MyCustomError2 extends Error {
    constructor(public prop2 = 1) {
        super();
    }
}

describe("ErrorFamily from native error testing", () => {
    const HttpBridgedError = AppError.bridge(HTTPException, (e, cases) => {
        return e.status === 404
            ? cases.NotFound(Number(e.message) || 0)
            : e.status === 401
              ? cases.Unauthorized()
              : e.status === 500
                ? cases.DatabaseError(e.message)
                : cases.ShardError(0, "FORBIDDEN_SHARD");
    });

    test("should chain up error family", () => {
        const ExAppError = AppError.enroll(
            MyCustomError,
            AppError.Unauthorized,
        );
        const InferErr = ExAppError.from(new MyCustomError());
        expect(InferErr.is(AppError.Unauthorized)).toBe(true);

        const ExxAppError = ExAppError.enroll(
            HTTPException,
            AppError.NotFound,
            (e) => [e.status],
        );
        expect(
            ExxAppError.from(new HTTPException(404)).is(AppError.NotFound),
        ).toBe(true);

        const ExrAppError = ExxAppError.enroll(
            MyCustomError,
            AppError.NotFound,
            (e) => [e.prop],
        ).enroll(SyntaxError, AppError.ShardError, (_e) => [2, "xx"]);

        expect(
            ExrAppError.from(new MyCustomError()).is(AppError.NotFound),
        ).toBe(true);

        const unenrolledError = new MyCustomError2();
        // @ts-expect-error
        expect(() => ExrAppError.from(unenrolledError)).toThrowError(Error);
    });

    test("should bridge error correctly", () => {
        const nfErr = HttpBridgedError.from(new HTTPException(404));
        expect(nfErr.is(AppError.NotFound)).toBe(true);
    });

    test("should handle cause correctly", () => {
        const customError = new MyCustomError();
        const GenError = AppError.enroll(MyCustomError, AppError.Unauthorized);
        expect(GenError.from(customError).cause).toBe(customError);

        const not_found = new HTTPException(404);
        expect(HttpBridgedError.from(not_found).cause).toBe(not_found);
    });
});
