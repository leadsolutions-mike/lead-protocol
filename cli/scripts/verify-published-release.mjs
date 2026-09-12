// Release identity and registry verification for the Ubuntu publication workflow.
// npm audit signatures performs cryptographic verification; the checks below
// additionally bind the attested source to this specific release and workflow.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE = "@leadsolutions/lead-protocol";
const REPOSITORY = "https://github.com/mmilanez/lead-protocol";
const REGISTRY = "https://registry.npmjs.org";
const PROVENANCE = "https://slsa.dev/provenance/v1";
const WORKFLOW = ".github/workflows/publish-cli.yml";
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));

export function releaseVersion(tag) {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag ?? "")) {
    throw new Error("Expected a stable release tag vX.Y.Z");
  }
  return tag.slice(1);
}

export function validatePackageIdentity(packageJson, packageLock) {
  if ([packageJson.name, packageLock.name, packageLock.packages?.[""]?.name].some((name) => name !== PACKAGE)) {
    throw new Error("Package and lockfile must identify the expected public npm package");
  }
}

export function validateRelease(release, tag, remoteSha, checkoutSha, context) {
  releaseVersion(tag);
  if (!/^[a-f0-9]{40}$/.test(checkoutSha) || remoteSha !== checkoutSha) {
    throw new Error("Remote release tag does not resolve to the checked-out commit");
  }
  if (context.ref !== `refs/tags/${tag}` || context.sha !== checkoutSha) {
    throw new Error("Run publication from the release tag ref and exact commit (also for manual retries)");
  }
  if (release.tag_name !== tag || release.draft !== false || release.prerelease !== false || !release.published_at) {
    throw new Error("Expected an existing published stable GitHub Release for this tag");
  }
  if (release.target_commitish !== checkoutSha) {
    throw new Error("GitHub Release target_commitish must explicitly identify the exact release commit");
  }
}

async function registryJson(url, fetcher = fetch, { allowMissing = false } = {}) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(30_000) });
  if (response.status === 404 && allowMissing) return null;
  if (!response.ok) throw new Error(`Registry request failed with HTTP ${response.status}: ${url}`);
  return response.json();
}

export async function readRegistryVersion(tag, fetcher = fetch) {
  const version = releaseVersion(tag);
  return registryJson(`${REGISTRY}/${encodeURIComponent(PACKAGE)}/${version}`, fetcher, { allowMissing: true });
}

export function validateRegistryIdentity(metadata, tag, sha) {
  const version = releaseVersion(tag);
  if (!/^[a-f0-9]{40}$/.test(sha) || metadata.name !== PACKAGE || metadata.version !== version || metadata.gitHead !== sha) {
    throw new Error("Existing npm version does not match the intended package, version, and release gitHead; never republish it");
  }
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(metadata.dist?.integrity ?? "") ||
      Buffer.from(metadata.dist.integrity.slice("sha512-".length), "base64").length !== 64) {
    throw new Error("npm version has no valid sha512 integrity");
  }
}

export function validateProvenance(metadata, attestations, tag, sha) {
  validateRegistryIdentity(metadata, tag, sha);
  const entries = attestations.attestations?.filter((entry) => entry.predicateType === PROVENANCE) ?? [];
  if (entries.length !== 1) throw new Error("Expected exactly one npm SLSA v1 provenance attestation");
  const statement = JSON.parse(Buffer.from(entries[0].bundle?.dsseEnvelope?.payload ?? "", "base64").toString("utf8"));
  const definition = statement.predicate?.buildDefinition;
  const workflow = definition?.externalParameters?.workflow;
  const expectedDigest = Buffer.from(metadata.dist.integrity.slice("sha512-".length), "base64").toString("hex");
  const expectedSubject = `pkg:npm/%40leadsolutions/lead-protocol@${releaseVersion(tag)}`;
  if (statement.predicateType !== PROVENANCE ||
      !statement.subject?.some((item) => item.name === expectedSubject && item.digest?.sha512 === expectedDigest) ||
      definition?.buildType !== "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1" ||
      workflow?.repository !== REPOSITORY || workflow.path !== WORKFLOW || workflow.ref !== `refs/tags/${tag}` ||
      !definition.resolvedDependencies?.some((item) => item.uri === `git+${REPOSITORY}@refs/tags/${tag}` && item.digest?.gitCommit === sha)) {
    throw new Error("npm provenance does not bind this package to the intended release commit, tag, repository, and workflow");
  }
}

export async function verifyRegistry(metadata, tag, sha, fetcher = fetch) {
  validateRegistryIdentity(metadata, tag, sha);
  const expectedUrl = `${REGISTRY}/-/npm/v1/attestations/@leadsolutions%2flead-protocol@${releaseVersion(tag)}`;
  if (metadata.dist?.attestations?.url !== expectedUrl) throw new Error("npm provenance URL is missing or unexpected");
  const attestations = await registryJson(expectedUrl, fetcher);
  validateProvenance(metadata, attestations, tag, sha);
}

export async function waitForRegistry(tag, sha, { fetcher = fetch, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 12 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const metadata = await readRegistryVersion(tag, fetcher);
    if (metadata) {
      validateRegistryIdentity(metadata, tag, sha);
      if (metadata.dist?.attestations?.url) {
        await verifyRegistry(metadata, tag, sha, fetcher);
        return metadata;
      }
    }
    if (attempt < attempts) await pause(10_000);
  }
  throw new Error("Published npm version and provenance did not become available within the bounded verification window");
}

export function consumerEnvironment(base, temporaryHome) {
  // Allowlist rather than inheriting GH_TOKEN, npm auth, or Actions OIDC tokens.
  const env = { HOME: temporaryHome, PATH: base.PATH, TMPDIR: temporaryHome,
    npm_config_registry: REGISTRY, npm_config_userconfig: path.join(temporaryHome, ".npmrc"),
    npm_config_globalconfig: path.join(temporaryHome, "global.npmrc"), npm_config_cache: path.join(temporaryHome, "cache") };
  for (const name of ["SystemRoot", "ComSpec", "PATHEXT"]) if (base[name]) env[name] = base[name];
  return env;
}

function verifyConsumer(metadata, tag) {
  const temporaryHome = mkdtempSync(path.join(os.tmpdir(), "lp-published-release-"));
  try {
    const env = consumerEnvironment(process.env, temporaryHome);
    const options = { cwd: temporaryHome, env, encoding: "utf8", timeout: 180_000 };
    writeFileSync(path.join(temporaryHome, "package.json"), JSON.stringify({ name: "published-release-check", private: true }));
    writeFileSync(env.npm_config_userconfig, "");
    writeFileSync(env.npm_config_globalconfig, "");
    execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", `${PACKAGE}@${releaseVersion(tag)}`], options);
    const lock = JSON.parse(readFileSync(path.join(temporaryHome, "package-lock.json"), "utf8"));
    if (lock.packages?.[`node_modules/${PACKAGE}`]?.integrity !== metadata.dist.integrity) {
      throw new Error("Installed npm artifact integrity differs from the verified release metadata");
    }
    // Registry signature and Sigstore provenance are verified before CLI execution.
    console.log(execFileSync("npm", ["audit", "signatures"], options).trim());
    const installed = path.join(temporaryHome, "node_modules", PACKAGE);
    const packageJson = JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8"));
    const bin = path.join(installed, "dist", "index.js");
    const actualVersion = execFileSync(process.execPath, [bin, "--version"], options).trim();
    if (packageJson.version !== releaseVersion(tag) || actualVersion !== releaseVersion(tag)) {
      throw new Error("Installed CLI does not report the exact release version");
    }
    execFileSync(process.execPath, [bin, "init", "--yes"], options);
    const actual = JSON.parse(readFileSync(path.join(temporaryHome, ".agents", "manifest.json"), "utf8"));
    const expected = JSON.parse(readFileSync(path.resolve(scriptRoot, "../../.agents/manifest.json"), "utf8"));
    if (["manifest_version", "product_version", "kernel_version"].some((key) => actual[key] !== expected[key])) {
      throw new Error("Registry installation initializes a different product/kernel manifest");
    }
    console.log(`Verified registry ${PACKAGE}@${actualVersion}, signed provenance, exact CLI version, and initialized manifest`);
  } finally {
    rmSync(temporaryHome, { recursive: true, force: true });
  }
}

async function main() {
  const [command, tag, sha, extra] = process.argv.slice(2);
  if (command === "release") {
    const release = JSON.parse(readFileSync(extra, "utf8"));
    const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    validateRelease(release, tag, sha, checkoutSha, { ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA });
    const cliRoot = path.resolve(scriptRoot, "..");
    validatePackageIdentity(JSON.parse(readFileSync(path.join(cliRoot, "package.json"), "utf8")),
      JSON.parse(readFileSync(path.join(cliRoot, "package-lock.json"), "utf8")));
  } else if (command === "probe") {
    const metadata = await readRegistryVersion(tag);
    if (metadata) await verifyRegistry(metadata, tag, sha);
    const status = metadata ? "present" : "absent";
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`);
    console.log(`npm version is ${status}`);
  } else if (command === "verify") {
    const metadata = await waitForRegistry(tag, sha);
    verifyConsumer(metadata, tag);
  } else throw new Error("usage: verify-published-release.mjs release|probe|verify vX.Y.Z COMMIT [release.json]");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
