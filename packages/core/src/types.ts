export const ErrorBrand: unique symbol = Symbol("FErrorBrand");
export const ScopeField: unique symbol = Symbol("FErrorScope");
export const PayloadField: unique symbol = Symbol("FErrorPayload");
export const CodeField: unique symbol = Symbol("FErrorCode");

export interface DefinedError<
    Code extends string = string,
    Payload extends readonly unknown[] = readonly unknown[]
> extends Error {
    readonly [ErrorBrand]: true;
    readonly [ScopeField]: symbol;
    readonly [PayloadField]: Payload;
    readonly [CodeField]: Code;

    is<K extends string, S extends ErrorSpec>(errorCase: ErrorCase<K, S>): this is DefinedError<K, ExtractPayload<S>>;
}

export type ErrorSpec =
    | string
    /**
     * Uses `never[]` to leverage contravariance, ensuring it can
     * serve as a base type for functions with any parameter types.
     */
    | ((...args: never[]) => string);

export type ExtractPayload<S extends ErrorSpec> =
    S extends (...args: infer A) => string
        ? A
        : never[];

export type ErrorMap = Record<string, ErrorSpec>;

export type ErrorUnionOfMap<M extends ErrorMap> = {
    [K in keyof M & string]: DefinedError<K, ExtractPayload<M[K]>>;
}[keyof M & string];

export type ErrorCase<K extends string, S extends ErrorSpec> =
    ([S] extends [(...args: infer A) => string]
        ? (...args: [...args: A, options?: ErrorOptions]) => DefinedError<K, A>
        : (options?: ErrorOptions) => DefinedError<K, never[]>)
    & { readonly [CodeField]: K; readonly [ScopeField]: symbol };

export type ErrorFamily<M extends ErrorMap, Es extends readonly (readonly [Error, ErrorUnionOfMap<M>])[] = []> = {
    readonly [K in keyof M & string]: ErrorCase<K, M[K]>;
} & {
    readonly [ScopeField]: symbol;
} & {
    /**
     * Registers an Error class into the family mapping it to a specific variant.
     * ### 🧬 TYPE CAPTURE
     * 1. **Class to Instance**: Extracts the precise instance type `E` from the constructor `T`.
     * This handles built-in types (like `SyntaxError`) and custom classes correctly.
     * 2. **State Propagation**: Updates the internal tuple `Es` to track the mapping
     * between the Error class and its corresponding Case return type.
     * ### 🚀 TRANSFORMER LOGIC
     * 1) **Automatic**: If the target Case (e.g., `AppError.Unauthorized`) requires no payload,
     * the third argument is omitted.
     * 2) **Enforced**: If the Case requires a payload (e.g., `[id: string]`), you **MUST** * provide a transformer function `(e: E) => Payload` to bridge the data.
     *
     *
     * @param errorClass - The constructor of the error (e.g., `MyCustomError` or `TypeError`).
     * @param errorCase - The family variant this error should map to.
     * @param args - Conditional transformer based on the case's payload requirement.
     * @returns A new `ErrorFamily` instance with an updated type-safe registry.
     */
    enroll<
        T extends { new(...args: never[]): Error; readonly prototype: Error },
        K extends keyof M & string,
        U extends ErrorUnionOfMap<M>,
        E extends InstanceOfError<T>
    >(
        errorClass: T,
        errorCase: ErrorCase<K, M[K]> & ((...args: never[]) => U),
        ...args: ExtractPayload<M[K]> extends [] | never[]
            ? []
            : [transformer: (e: E) => ExtractPayload<M[K]>]
    ): ErrorFamily<M, Upsert<Es, E, U>>;

    /**
     * Bridges a multi-variant error class (like HTTPException) to multiple family cases.
     * ### 🌉 POLYMORPHIC MAPPING
     * Allows a single error class to be dispatched to different cases based on runtime properties.
     */
    bridge<
        T extends { new(...args: never[]): Error; readonly prototype: Error },
        C extends ErrorUnionOfMap<M>,
        E extends InstanceOfError<T>,
    >(
        errorClass: T,
        mapper: (e: E, cases: { [K in keyof M & string]: ErrorCase<K, M[K]> }) => C
    ): ErrorFamily<M, Upsert<Es, E, C>>;

    /**
     * Identifies and transforms a raw Error instance into its associated typed case.
     * ### 🧠 WHY THE COMPLEX LOGIC?
     * 1. **Structural vs. Nominal Typing**:
     * TypeScript is structural. Two different classes with identical shapes (like two
     * empty classes extending Error) are treated as the exact same type.
     * 2. **Distributive Identity Matching**:
     * We use `true extends (Es[number][0] extends infer U ...)` to force TS to iterate
     * over each enrolled type `U` individually. The bidirectional check `[E] extends [U]`
     * AND `[U] extends [E]` ensures that `E` and `U` are structurally identical.
     * 3. **The "Empty Class" Caveat**:
     * If you have `class A extends Error {}` and `class B extends Error {}`, they will
     * both satisfy the identity check because they share the same shape. To enforce
     * strict differentiation (Nominal Typing), add a private member or a brand:
     * `class MyError extends Error { #brand: unknown }`.
     * ### 🛠️ RETURN BEHAVIOR
     * - Returns the specific `ErrorCase` return value if the class is enrolled.
     * - Triggers a compilation error (`NOT_ENROLLED`) if the error class identity
     * does not match the registered set.
     */
    from<E extends Error>(
        error: E & (
            [NoInfer<E>] extends [Es[number][0]]
                ? (
                    true extends (
                            Es[number][0] extends infer U
                                ? (U extends Error
                                    ? ([E] extends [U] ? ([U] extends [E] ? true : never) : never)
                                    : never)
                                : never
                            )
                        ? unknown
                        : { __STATUS__: "ERROR_NOT_ENROLLED"; message: "This specific error class was not enrolled" }
                    )
                : { __STATUS__: "TYPE_NOT_ENROLLED"; message: "Type structure not found in family" }
            )
    ): Extract<Es[number], readonly [E, unknown]>[1];
};

/**
 * Extracts the specific instance type from an Error constructor.
 *
 * WHY THIS IS NECESSARY:
 *
 * Standard inference like `E extends Error` fails for built-in error types such as
 * - SyntaxError
 * - TypeError
 * - RangeError
 * - ReferenceError
 * * These are not defined as simple 'classes' in TypeScript's core library (lib.d.ts).
 * Instead, they use interface merging with multiple overloads (both newable and callable).
 * In complex generic chains like ErrorFamily, TS often "collapses" these back to the
 * base 'Error' type.
 * * BY ANCHORING TO `readonly prototype`:
 * We bypass the ambiguous constructor overloads and target the unique prototype
 * interface, ensuring that subtype-specific properties (e.g., SyntaxError.lineNumber)
 * are preserved in the transformer.
 */
type InstanceOfError<T> = T extends { readonly prototype: infer P }
    ? P extends Error ? P : Error
    : Error;

/**
 * Updates or inserts a type mapping into the Error Family tuple.
 * the recursive tail as a valid tuple array.
 */
type Upsert<T extends readonly (readonly [Error, unknown])[], E extends Error, C> =
    T extends readonly [readonly [infer CurE, infer CurC], ...infer Rest]
        ? [E] extends [CurE]
            ? readonly [[E, C], ...Rest]
            : readonly [[CurE, CurC], ...Upsert<Extract<Rest, readonly (readonly [Error, unknown])[]>, E, C>]
        : readonly [[E, C]];

export type ErrorMapOf<F> =
    F extends ErrorFamily<infer M, infer _Es>
        ? M
        : never;

export type ErrorUnionOf<F> =
    F extends ErrorFamily<infer M, infer _Es>
        ? ErrorUnionOfMap<M> : never
