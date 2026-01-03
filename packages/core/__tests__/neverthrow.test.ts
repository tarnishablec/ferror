// noinspection ES6UnusedImports
import { describe, expect, test } from "bun:test";
import { codeOf, PayloadField, payloadOf, type ThatError } from "@thaterror/core";
import { err, fromPromise } from 'neverthrow'
import { AppError } from './define-error.test'

describe('neverthrow test', () => {
    test('should infer Error type', () => {
        const getNotFoundResult = () => {
            const e = AppError.NotFound(404);
            return err<string, ThatError<typeof AppError, "NotFound">>(e);
        };

        const result = getNotFoundResult();

        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
            const error = result.error;
            expect(error.is(AppError.NotFound)).toBe(true);
            expect(error[PayloadField]).toEqual([404]);
        }
    })

    test('should infer Error type from async call', async () => {
        const id = 123;
        const fetchData = () => {
            const promise = Promise.reject(new Error('fetchData'));

            return fromPromise(
                promise,
                (e) => AppError.NotFound(id).with({cause: e})
            );
        };

        const result = await fetchData();

        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
            expect(result.error.is(AppError.NotFound)).toBe(true);
            const [id] = payloadOf(result.error);
            expect(id).toBe(id);
            const code = codeOf(result.error);
            expect(code).toBe("NotFound");
        }
    })
})