import { describe, expect, test } from 'bun:test'
import { HTTPException } from 'hono/http-exception'
import { AppError } from './define-error.test'

class MyCustomError extends Error {
}


describe('ErrorFamily from native error testing', () => {
    test('should chain up error family', () => {
        const ExAppError = AppError.enroll(MyCustomError, AppError.Unauthorized);
        const InferErr = ExAppError.from(new MyCustomError());
        expect(InferErr).toBeInstanceOf(AppError.Unauthorized);

        const ExxAppError = ExAppError.enroll(HTTPException, AppError.NotFound, (e) => [e.status]);
        expect(ExxAppError.from(new HTTPException(404))).toBeInstanceOf(AppError.NotFound);
    })
})
