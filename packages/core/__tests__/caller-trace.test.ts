// noinspection ES6UnusedImports
import { describe, expect, test } from "bun:test";
import { That } from '@thaterror/core';
import { ResultAsync } from 'neverthrow';

describe("ThatError Location Anchoring", () => {
    const AppError = That({
        SYNC_ERR: "Sync failure",
        ASYNC_ERR: (url: string) => `Async failure: ${url}`,
        LOC_ERR: "Location test error"
    });

    const pathSegments = new URL(import.meta.url).pathname.split('/');
    const currentFileName = pathSegments.at(-1) ?? "";

    // --- Scenario 1: The Native Way (Messy) ---
    test("Native: new Error() inside callback captures library internals", async () => {
        function businessFunction() {
            return ResultAsync.fromPromise(
                Promise.reject("connection lost"),
                (error) =>
                    /**
                     * 🚨 The Native Way:
                     * A standard 'new Error' is captured here, but the stack trace
                     * will be cluttered with neverthrow's internal dispatcher frames.
                     */
                    new Error(`Native wrap: ${error}`)
            ).andThen(() => {
                throw new Error("Should not happen");
            });
        }

        const result = await businessFunction().map(() => {
            return 1;
        });

        if (result.isErr()) {
            const stack = result.error.stack ?? "";
            // ❌ Observation: Native error will contain 'node_modules/neverthrow' frames
            expect(stack).toContain("neverthrow");
            expect(stack).toContain("node_modules");
            console.log(stack.split("\n").slice(0, 4).join("\n"));
        }
    });

    // --- Scenario 2: Without .at() (The "Noisy" Way) ---
    test("Control: stack trace WITHOUT .at() might include internal noise", () => {
        function businessFunction() {
            // 🚨 Returning the error directly without anchoring
            return AppError.LOC_ERR();
        }

        const err = businessFunction();
        const stack = err.stack ?? "";

        /**
         * ⚠️ Note: Depending on V8 optimization, without .at(),
         * the stack might still contain factory internal frames
         * if the engine hasn't triggered the lazy stack capture yet.
         */
        expect(stack).toContain(currentFileName);
        console.log(stack.split("\n").slice(0, 4).join("\n"));
    });

    // --- Scenario 3: Neverthrow Async WITHOUT .at() (The "Lost" Scene) ---
    test("Async Control: stack trace WITHOUT .at() in neverthrow", async () => {
        const result = await ResultAsync.fromPromise(
            Promise.reject(new Error("Down")),
            (_error) => {
                // 🚨 No .at() used here.
                // The engine captures the stack during 'new', but without the
                // explicit anchor, the trace quality depends purely on V8's mood.
                return AppError.LOC_ERR();
            }
        );

        if (result.isErr()) {
            const stack = result.error.stack ?? "";
            // Often, without .at(), the trace is harder to read or
            // lacks the explicit "Crime Scene" context we want to enforce.
            console.log(stack.split("\n").slice(0, 4).join("\n"));
        }
    });

    // --- Scenario 4: Synchronous Business Logic ---
    test("Sync: stack trace should anchor at the business caller via .at()", () => {
            function businessFunction() {
                /**
                 * 💡 THE ANCHOR POINT
                 * We call .at() here to explicitly mark this line as the "Crime Scene".
                 */
                return AppError.SYNC_ERR().with(void 0);
            }

            const err = businessFunction();
            const stack = err.stack ?? "";
            const topFrame = stack.split("\n")[1];

            // 🎯 Verification: The first frame must point to 'businessFunction' in THIS file.
            expect(topFrame).toContain("businessFunction");
            expect(topFrame).toContain(currentFileName);

            // 🛡️ Noise Removal: The factory internals (define.ts) must be sliced off.
            expect(topFrame).not.toContain("define.ts");

            console.log(stack.split("\n").slice(0, 4).join("\n"));
        }
    )
    ;

    // --- Scenario 5: Neverthrow Async Callback ---
    test("Async: stack trace should anchor inside neverthrow callback via .at()", async () => {
        const url = "https://api.faulty.com";

        // Simulating a failed async operation
        const result = await ResultAsync.fromPromise(
            Promise.reject(new Error("Network Down")),
            (error) => {
                /**
                 * 💡 THE "CALLBACK-LOCAL" ANCHOR
                 * Without .at(), the stack might point to neverthrow's internal dispatcher.
                 * By calling .at() inside this anonymous closure, we lock the stack
                 * to this exact line in the business logic.
                 */
                return AppError.ASYNC_ERR(url).with({cause: error});
            }
        );

        if (result.isErr()) {
            const err = result.error;
            const stack = err.stack ?? "";
            const frames = stack.split("\n");

            // The top frame should represent the anonymous callback location.
            const topFrame = frames[1];

            // 🎯 Verification: Ensure the trace points to the caller site, not the library.
            expect(topFrame).toContain(currentFileName);

            // 🛡️ Noise Removal:
            // 1. No internal 'neverthrow' frames should leak into the business trace.
            // 2. No internal 'thaterror' (define.ts) frames should be visible.
            expect(topFrame).not.toContain("neverthrow");
            expect(topFrame).not.toContain("define.ts");

            // Metadata Verification
            expect(err.cause).toBeDefined();
            expect(err.message).toContain(url);

            console.log(stack.split("\n").slice(0, 4).join("\n"));
        } else {
            throw new Error("Test failed: Result should be an Err");
        }
    });
});