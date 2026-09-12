import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { consumerEnvironment, readRegistryVersion, releaseVersion, validateProvenance,
  validatePackageIdentity, validateRegistryIdentity, validateRelease, verifyRegistry, waitForRegistry } from "../scripts/verify-published-release.mjs";

const tag = "v2.1.5";
const sha = "a".repeat(40);
const repository = "https://github.com/mmilanez/lead-protocol";
const predicateType = "https://slsa.dev/provenance/v1";
function fixture() {
  const metadata = { name: "@leadsolutions/lead-protocol", version: "2.1.5", gitHead: sha,
    dist: { integrity: `sha512-${Buffer.alloc(64, 1).toString("base64")}`,
      attestations: { url: "https://registry.npmjs.org/-/npm/v1/attestations/@leadsolutions%2flead-protocol@2.1.5" } } };
  const statement = { predicateType, subject: [{ name: "pkg:npm/%40leadsolutions/lead-protocol@2.1.5", digest: { sha512: Buffer.alloc(64, 1).toString("hex") } }],
    predicate: { buildDefinition: { buildType: "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
      externalParameters: { workflow: { repository, ref: `refs/tags/${tag}`, path: ".github/workflows/publish-cli.yml" } },
      resolvedDependencies: [{ uri: `git+${repository}@refs/tags/${tag}`, digest: { gitCommit: sha } }] } } };
  const encode = () => ({ attestations: [{ predicateType, bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(statement)).toString("base64") } } }] });
  return { metadata, statement, encode };
}
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test("only stable canonical tags are accepted", () => {
  assert.equal(releaseVersion(tag), "2.1.5");
  for (const invalid of ["2.1.5", "v2.1.5-rc.1", "v02.1.5", "v2.1.5\n", "main", "v2.1.5;echo x"]) {
    assert.throws(() => releaseVersion(invalid), /stable release tag/);
  }
});

test("release retry binds GitHub release, remote tag, checkout and Actions context", () => {
  const release = { tag_name: tag, target_commitish: sha, draft: false, prerelease: false, published_at: "2026-09-12T00:00:00Z" };
  const context = { ref: `refs/tags/${tag}`, sha };
  assert.doesNotThrow(() => validateRelease(release, tag, sha, sha, context));
  for (const patch of [{ tag_name: "v2.1.4" }, { target_commitish: "main" }, { target_commitish: "b".repeat(40) }, { draft: true }, { prerelease: true }, { published_at: null }]) {
    assert.throws(() => validateRelease({ ...release, ...patch }, tag, sha, sha, context));
  }
  assert.throws(() => validateRelease(release, tag, "b".repeat(40), sha, context), /Remote release tag/);
  assert.throws(() => validateRelease(release, tag, sha, sha, { ...context, ref: "refs/heads/main" }), /tag ref/);
  assert.throws(() => validateRelease(release, tag, sha, sha, { ...context, sha: "b".repeat(40) }), /tag ref/);
});

test("source package and both lockfile names identify the public package", () => {
  const name = "@leadsolutions/lead-protocol";
  const lock = { name, packages: { "": { name } } };
  assert.doesNotThrow(() => validatePackageIdentity({ name }, lock));
  assert.throws(() => validatePackageIdentity({ name: "other-package" }, lock), /expected public npm package/);
  assert.throws(() => validatePackageIdentity({ name }, { ...lock, name: "other-package" }), /expected public npm package/);
  assert.throws(() => validatePackageIdentity({ name }, { ...lock, packages: {} }), /expected public npm package/);
});

test("only an explicit registry 404 means version absent", async () => {
  assert.equal(await readRegistryVersion(tag, async () => response(404)), null);
  for (const status of [401, 403, 429, 500, 503]) {
    await assert.rejects(readRegistryVersion(tag, async () => response(status)), /Registry request failed/);
  }
  await assert.rejects(readRegistryVersion(tag, async () => { throw new Error("network timeout"); }), /network timeout/);
  await assert.rejects(readRegistryVersion(tag, async () => ({ ...response(200), json: async () => { throw new Error("bad JSON"); } })), /bad JSON/);
});

test("existing version must match exact package/version/gitHead", () => {
  const { metadata } = fixture();
  assert.doesNotThrow(() => validateRegistryIdentity(metadata, tag, sha));
  for (const patch of [{ name: "unrelated-package" }, { version: "2.1.4" }, { gitHead: "b".repeat(40) }, { gitHead: undefined }]) {
    assert.throws(() => validateRegistryIdentity({ ...metadata, ...patch }, tag, sha), /never republish/);
  }
});

test("provenance is bound to release, workflow and artifact integrity", () => {
  const { metadata, encode } = fixture();
  assert.doesNotThrow(() => validateProvenance(metadata, encode(), tag, sha));
  const mutations = [
    (s) => { s.subject[0].digest.sha512 = "b".repeat(128); },
    (s) => { s.subject[0].name = "pkg:npm/%40leadsolutions/lead-protocol@2.1.4"; },
    (s) => { s.predicate.buildDefinition.externalParameters.workflow.repository = "https://github.com/other/repo"; },
    (s) => { s.predicate.buildDefinition.externalParameters.workflow.ref = "refs/heads/main"; },
    (s) => { s.predicate.buildDefinition.externalParameters.workflow.path = ".github/workflows/other.yml"; },
    (s) => { s.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = "b".repeat(40); },
    (s) => { s.predicate.buildDefinition.resolvedDependencies[0].uri = `git+${repository}@refs/heads/main`; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f.statement);
    assert.throws(() => validateProvenance(f.metadata, f.encode(), tag, sha), /does not bind/);
  }
  assert.throws(() => validateProvenance(metadata, { attestations: [] }, tag, sha), /exactly one/);
  assert.throws(() => validateProvenance(metadata, { attestations: [...encode().attestations, ...encode().attestations] }, tag, sha), /exactly one/);
});

test("provenance download never follows an unexpected metadata URL", async () => {
  const { metadata } = fixture();
  metadata.dist.attestations.url = "https://other.example/attestation";
  let requested = false;
  await assert.rejects(verifyRegistry(metadata, tag, sha, async () => { requested = true; }), /URL is missing or unexpected/);
  assert.equal(requested, false);
});

test("publication verification waits for registry and provenance propagation", async () => {
  const { metadata, encode } = fixture();
  const withoutAttestation = structuredClone(metadata); delete withoutAttestation.dist.attestations;
  const replies = [response(404), response(200, withoutAttestation), response(200, metadata), response(200, encode())];
  let pauses = 0;
  assert.deepEqual(await waitForRegistry(tag, sha, { fetcher: async () => replies.shift(), pause: async () => { pauses++; }, attempts: 3 }), metadata);
  assert.equal(pauses, 2);
  assert.equal(replies.length, 0);
});

test("verification stops after bounded absence and fails immediately on conflicting identity", async () => {
  let requests = 0;
  await assert.rejects(waitForRegistry(tag, sha, { fetcher: async () => { requests++; return response(404); }, pause: async () => {}, attempts: 3 }), /bounded verification window/);
  assert.equal(requests, 3);
  const { metadata } = fixture(); metadata.gitHead = "b".repeat(40);
  requests = 0;
  await assert.rejects(waitForRegistry(tag, sha, { fetcher: async () => { requests++; return response(200, metadata); }, pause: async () => {}, attempts: 3 }), /never republish/);
  assert.equal(requests, 1);
});

test("installed package receives no publication or API credentials", () => {
  const env = consumerEnvironment({ PATH: "/usr/bin", GH_TOKEN: "secret", GITHUB_TOKEN: "secret", NODE_AUTH_TOKEN: "secret", NPM_TOKEN: "secret",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "secret", ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.example", npm_config_userconfig: "/auth/.npmrc", NODE_OPTIONS: "--require /injected.js" }, "/tmp/consumer");
  assert.equal(env.PATH, "/usr/bin");
  assert.equal(env.HOME, "/tmp/consumer");
  assert.ok(!Object.values(env).some((value) => String(value).includes("secret")));
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.ACTIONS_ID_TOKEN_REQUEST_URL, undefined);
  assert.equal(env.npm_config_userconfig, path.join("/tmp/consumer", ".npmrc"));
});
