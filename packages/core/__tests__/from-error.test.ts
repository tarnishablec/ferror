import { describe, expect, test } from 'bun:test'
import { HTTPException } from 'hono/http-exception'
import { AppError } from './define-error.test'

class MyCustomError extends Error {
    prop = 1;
}

class MyCustomError2 extends Error {
    constructor(public prop2 = 1) {
        super();
    }
}

describe('ErrorFamily from native error testing', () => {
    test('should chain up error family', () => {
        const ExAppError = AppError.enroll(MyCustomError, AppError.Unauthorized);
        const InferErr = ExAppError.from(new MyCustomError());
        expect(InferErr.is(AppError.Unauthorized)).toBe(true);

        const ExxAppError = ExAppError.enroll(HTTPException, AppError.NotFound, (e) => [e.status]);
        expect(ExxAppError.from(new HTTPException(404)).is(AppError.NotFound)).toBe(true);


        const ExrAppError = ExxAppError
            .enroll(MyCustomError, AppError.NotFound, (e) => [e.prop])
            .enroll(SyntaxError, AppError.ShardError, (_e) => [2, 'xx']);

        expect(ExrAppError.from(new MyCustomError()).is(AppError.NotFound)).toBe(true)

        // @ts-expect-error
        ExrAppError.from(new MyCustomError2())
    })

    test('should bridge error correctly', () => {
        const httpError = AppError.bridge(HTTPException, (e, cases) => {
            return e.status === 404
                ? cases.NotFound(Number(e.message) || 0)
                : e.status === 401
                    ? cases.Unauthorized()
                    : e.status === 500
                        ? cases.DatabaseError(e.message)
                        : cases.ShardError(0, "FORBIDDEN_SHARD")

        })

        const nfErr = httpError.from(new HTTPException(404))
        expect(nfErr.is(AppError.NotFound)).toBe(true);
    })
})
