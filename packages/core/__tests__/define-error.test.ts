import {describe, expect, test} from "bun:test";
import {defineError, is, isDefinedError, scopeOf} from "@ferror/core"
import {CodeField, ErrorBrand, type ErrorOf, PayloadField, ScopeField} from "@ferror/core/types";

const AppError = defineError({
    NotFound: (id: number) => `Resource ${id} not found`,
    Unauthorized: "User is not logged in",
    DatabaseError: (query: string) => `Query failed: ${query}`,
    ShardError: (characterId: number, shard: string) => `Character & shard unmatch ${characterId} : ${shard}`
});

type AppErrorType = ErrorOf<typeof AppError>;

describe("defineError strict type testing", () => {

    test("should be correctly scoped", () => {
        const err = AppError.Unauthorized();
        expect(scopeOf(AppError)).toBe(scopeOf(err));
        expect(scopeOf(AppError)).toBe(scopeOf(AppError.ShardError));
        expect(scopeOf(AppError)).toBe(scopeOf(AppError.NotFound));
        expect(scopeOf(AppError)).toBe(scopeOf(AppError.Unauthorized));
    })

    test("static error should be correctly generated", () => {
        const err = AppError.Unauthorized();

        if (isDefinedError(err, scopeOf(AppError))) {
            expect(isDefinedError(err, scopeOf(AppError))).toBe(true);
            switch ((err as AppErrorType)[CodeField]) { // type auto infer
                case "DatabaseError":
                    expect(false).toBe(true);
                    throw new Error("Should not happen");
                case "NotFound":
                    expect(false).toBe(true);
                    throw new Error("Should not happen");
                case "Unauthorized":
                    break;
            }

        }

        expect(err[CodeField]).toBe("Unauthorized");
        expect(err.message).toBe("User is not logged in");
        expect(Reflect.get(err, ErrorBrand)).toBe(true);
        expect(Reflect.get(err, PayloadField)).toBeArrayOfSize(0);
    });

    test("scope matching should work", () => {
        const err = AppError.Unauthorized();
        expect(err[ScopeField]).toBe(scopeOf(AppError));
        expect(isDefinedError(err, scopeOf(AppError))).toBe(true);
        expect(isDefinedError(err, Symbol())).toBe(false);
    })

    test("error with parameters should correctly capture payload", () => {
        const err = AppError.NotFound(404);

        expect(err[CodeField]).toBe("NotFound");
        expect(err.message).toBe("Resource 404 not found");
        // Verify payload is a tuple [404]
        expect(Reflect.get(err, PayloadField)).toEqual([404]);
        expect(Reflect.get(err, PayloadField)).toBeArrayOfSize(1);
    });

    test("should support native Error.cause (#[source])", () => {
        const original = new Error("Connection lost");
        const err = AppError.Unauthorized({cause: original});

        expect(err.cause).toBe(original);

        const shardOriginal = new Error("Shard not found");
        const shardErr = AppError.ShardError(1, "shard-1", {cause: shardOriginal});
        expect(shardErr.cause).toBe(shardOriginal);
    });

    test("should be correctly captured in throw scenarios", () => {
        const query = "SELECT *" as const;
        const err = AppError.DatabaseError(query);

        expect(err[PayloadField]).toEqual([query]);

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
                expect(e[CodeField]).toBe("DatabaseError");
            }
        }
    });

    test("type narrowing test (logic validation)", () => {
        const err: ReturnType<typeof AppError.NotFound> = AppError.NotFound(1);

        // Mock switch-case logic
        if (err[CodeField] === "NotFound") {
            // Here IDE should automatically infer err.payload[0] is number
            expect(err[PayloadField]).toEqual([1]);
        }
    });
});