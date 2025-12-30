import {describe, expect, test} from "bun:test";
import {defineError, is, isDefinedError} from "@ferror/core"
import {ErrorBrand, type InferDefinedError} from "@ferror/core/types";

const AppError = defineError({
    NotFound: (id: number) => `Resource ${id} not found`,
    Unauthorized: "User is not logged in",
    DatabaseError: (query: string) => `Query failed: ${query}`,
});

type AppErrorType = InferDefinedError<typeof AppError>;

describe("defineError strict type testing", () => {

    test("static error should be correctly generated", () => {
        const err = AppError.Unauthorized();

        const genericErr = err as AppErrorType;

        expect(isDefinedError(genericErr)).toBe(true);

        expect(err.code).toBe("Unauthorized");
        expect(err.message).toBe("User is not logged in");
        expect(err[ErrorBrand]).toBe(true);
        expect(err.payloads).toBeUndefined();
    });

    test("error with parameters should correctly capture payload", () => {
        const err = AppError.NotFound(404);

        expect(err.code).toBe("NotFound");
        expect(err.message).toBe("Resource 404 not found");
        // Verify payload is a tuple [404]
        expect(err.payloads).toEqual([404]);
        expect(err.payloads[0]).toBe(404);
    });

    test("should support native Error.cause (#[source])", () => {
        const original = new Error("Connection lost");
        const err = AppError.Unauthorized({cause: original});

        expect(err.cause).toBe(original);
    });

    test("should be correctly captured in throw scenarios", () => {
        const err = AppError.DatabaseError("SELECT *" as const);

        const fn = () => {
            throw err;
        };

        expect(fn).toThrow("Query failed: SELECT *");

        try {
            fn();
        } catch (e: unknown) {

            const isError = e instanceof Error;
            expect(isError).toBe(true);

            const isDBError = is(e, AppError.DatabaseError);
            expect(isDBError).toBe(true);

            if (isDBError) {
                expect(e.code).toBe("DatabaseError");
                expect(err.payloads).toEqual(["SELECT *"]);
            }
        }
    });

    test("type narrowing test (logic validation)", () => {
        const err: ReturnType<typeof AppError.NotFound> = AppError.NotFound(1);

        // Mock switch-case logic
        if (err.code === "NotFound") {
            // Here IDE should automatically infer err.payload[0] is number
            const id = err.payloads[0];
            expect(id).toBe(1);
        }
    });
});