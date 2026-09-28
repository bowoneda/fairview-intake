import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { MAX_AGE_SECONDS, sha256Hex, verifyPlaidWebhook } from "../../supabase/functions/_shared/plaid-verify";

// Every branch of Plaid webhook verification, with keys the test controls. The integration test covers a real
// Plaid-signed webhook; these cover what cannot be forged against Plaid: a stale token and a tampered body.

const KID = "test-kid";
const NOW = 1_790_000_000;
const BODY = JSON.stringify({ webhook_type: "TRANSACTIONS", webhook_code: "SYNC_UPDATES_AVAILABLE", item_id: "item_1" }, null, 2);
let plaidKey: CryptoKey, publicJwk: JWK, otherKey: CryptoKey;
const resolve = async (kid: string) => (kid === KID ? publicJwk : null);

async function sign(opts: { body?: string; iat?: number; kid?: string; key?: CryptoKey; alg?: string } = {}) {
  return new SignJWT({ request_body_sha256: await sha256Hex(opts.body ?? BODY) })
    .setProtectedHeader({ alg: opts.alg ?? "ES256", kid: opts.kid ?? KID })
    .setIssuedAt(opts.iat ?? NOW)
    .sign(opts.key ?? plaidKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  plaidKey = pair.privateKey as CryptoKey;
  publicJwk = await exportJWK(pair.publicKey);
  otherKey = (await generateKeyPair("ES256")).privateKey as CryptoKey;
});

describe("verifyPlaidWebhook", () => {
  it("accepts a genuine webhook", async () => {
    expect(await verifyPlaidWebhook(await sign(), BODY, resolve, NOW)).toBeNull();
  });
  it("accepts one exactly at the 5 minute limit", async () => {
    expect(await verifyPlaidWebhook(await sign({ iat: NOW - MAX_AGE_SECONDS }), BODY, resolve, NOW)).toBeNull();
  });
  it("rejects a missing header", async () => {
    expect(await verifyPlaidWebhook(null, BODY, resolve, NOW)).toBe("missing_signature");
  });
  it("rejects garbage", async () => {
    expect(await verifyPlaidWebhook("not.a.jwt", BODY, resolve, NOW)).toBe("malformed_signature");
  });
  it("rejects any algorithm other than ES256", async () => {
    const hs = await new SignJWT({ request_body_sha256: await sha256Hex(BODY) }).setProtectedHeader({ alg: "HS256", kid: KID })
      .setIssuedAt(NOW).sign(new TextEncoder().encode("a-secret-that-is-long-enough-for-hs256"));
    expect(await verifyPlaidWebhook(hs, BODY, resolve, NOW)).toBe("wrong_algorithm");
  });
  it("rejects an unknown key id", async () => {
    expect(await verifyPlaidWebhook(await sign({ kid: "someone-else" }), BODY, resolve, NOW)).toBe("unknown_key");
  });
  it("rejects a token signed by a different key under a known key id", async () => {
    expect(await verifyPlaidWebhook(await sign({ key: otherKey }), BODY, resolve, NOW)).toBe("bad_signature");
  });
  it("rejects a token older than 5 minutes (replay)", async () => {
    expect(await verifyPlaidWebhook(await sign({ iat: NOW - MAX_AGE_SECONDS - 1 }), BODY, resolve, NOW)).toBe("stale_signature");
  });
  it("rejects a token from the future", async () => {
    expect(await verifyPlaidWebhook(await sign({ iat: NOW + 600 }), BODY, resolve, NOW)).toBe("stale_signature");
  });
  it("rejects a tampered body under a valid signature", async () => {
    const tampered = BODY.replace("item_1", "item_2");
    expect(await verifyPlaidWebhook(await sign(), tampered, resolve, NOW)).toBe("body_mismatch");
  });
  it("is sensitive to whitespace, as Plaid documents (the exact raw body is hashed)", async () => {
    const compact = JSON.stringify(JSON.parse(BODY));
    expect(await verifyPlaidWebhook(await sign(), compact, resolve, NOW)).toBe("body_mismatch");
  });
});
