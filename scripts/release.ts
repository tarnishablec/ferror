/**
 * @file scripts/release.ts
 * @brief Workspace-aware publish script for this monorepo.
 *
 * @details
 * Why this exists:
 * - This repo is a Bun workspace monorepo. Some packages use the workspace protocol
 *   (e.g. `"@thaterror/core": "workspace:*"`) for local development.
 * - `changeset publish` (Changesets' default publish command) publishes via npm and
 *   does not guarantee converting `workspace:*` to a real semver range in the
 *   published manifest.
 * - Here is a issue https://github.com/changesets/action/issues/246
 * - `bun publish` *does* handle workspace protocol during publish, so we keep Bun
 *   as the publisher.
 *
 * The CI failure this prevents:
 * - `changesets/action` will run the configured `publish` command when it finds
 *   no `.changeset/*.md` files after a merge.
 * - If our publish script blindly runs `bun publish` without versions changing,
 *   npm will reject it with:
 *   "You cannot publish over the previously published versions" (HTTP 403).
 *
 * So this script does a minimal safe check:
 * - Query the npm registry for the package's `dist-tags.latest`.
 * - If it equals the local `package.json` version, skip publishing.
 * - Otherwise, run `bun publish` in that package directory.
 *
 * Changesets pitfalls to be aware of:
 * - "No changesets found" does NOT mean "do nothing"; it means Changesets will
 *   attempt to publish any unpublished versions (based on your publish command).
 * - Workspace protocol (`workspace:*`) is great for monorepos, but you must ensure
 *   your publish tooling produces valid manifests for the registry.
 * - Access configuration can be surprising: `.changeset/config.json` has an `access`
 *   default for `changeset publish`, while each package may also define
 *   `publishConfig.access`. Keep these aligned if you ever switch publish mechanisms.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

type PackageJson = {
    name?: string;
    version?: string;
    private?: boolean;
    publishConfig?: {
        access?: "public" | "restricted";
    };
};

const PACKAGES_DIR = join(process.cwd(), "packages");

function normalizeNpmNameToUrl(name: string): string {
    // registry expects scoped names url-encoded (@scope%2fname)
    return `https://registry.npmjs.org/${encodeURIComponent(name)}`;
}

async function readPackageJson(dir: string): Promise<PackageJson> {
    const raw = await readFile(join(dir, "package.json"), "utf8");
    return JSON.parse(raw) as PackageJson;
}

/**
 * @brief Fetches the remote `latest` version from the npm registry.
 * @returns The `dist-tags.latest` string, or `null` if the package does not exist.
 * @throws If the registry request fails (non-404 and non-2xx).
 */
async function getRemoteLatestVersion(pkgName: string): Promise<string | null> {
    const url = normalizeNpmNameToUrl(pkgName);
    const res = await fetch(url, {
        headers: {
            accept: "application/vnd.npm.install-v1+json",
        },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
        throw new Error(
            `Failed to query npm registry for ${pkgName}: ${res.status} ${res.statusText}`,
        );
    }

    const data = (await res.json()) as {
        "dist-tags"?: { latest?: string };
    };
    return data["dist-tags"]?.latest ?? null;
}

/**
 * @brief Run a command and forward stdio.
 * @throws If the command exits non-zero.
 */
async function run(cmd: string, args: string[], cwd?: string): Promise<void> {
    const proc = Bun.spawn({
        cmd: [cmd, ...args],
        cwd,
        stdout: "inherit",
        stderr: "inherit",
        env: process.env,
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
        throw new Error(
            `${cmd} ${args.join(" ")} failed with exit code ${exitCode}`,
        );
    }
}

/**
 * @brief Entry point.
 *
 * Iterates workspace packages and publishes only when the local version differs
 * from npm registry's `latest`. This prevents CI from failing on no-op publishes.
 */
async function main(): Promise<void> {
    const packageDirs = (await readdir(PACKAGES_DIR, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => join(PACKAGES_DIR, d.name));

    let publishedAny = false;

    for (const dir of packageDirs) {
        const pkg = await readPackageJson(dir);
        if (pkg.private) continue;
        if (!pkg.name || !pkg.version) {
            throw new Error(`Missing name/version in ${dir}/package.json`);
        }

        const remoteLatest = await getRemoteLatestVersion(pkg.name);
        if (remoteLatest === pkg.version) {
            console.log(`[skip] ${pkg.name}@${pkg.version} already published`);
            continue;
        }

        const access = pkg.publishConfig?.access ?? "public";
        console.log(`[publish] ${pkg.name}@${pkg.version} (access=${access})`);
        await run("bun", ["publish", "--access", access], dir);
        publishedAny = true;
    }

    if (publishedAny) {
        await run("bunx", ["changeset", "tag"], process.cwd());
    } else {
        console.log("No packages needed publishing; skipping changeset tag.");
    }
}

await main();
