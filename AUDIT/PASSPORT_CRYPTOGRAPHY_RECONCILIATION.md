# Passport Cryptography Reconciliation

**Date:** September 8, 2026  
**Scope:** Actual production code, routes, key loading, credential schema, and audit documentation

## ACTUAL PASSPORT ALGORITHM:

**RSA-2048 with SHA-256, represented as `RS256`. It is not HMAC-SHA256.**

Evidence in `backend/services/PassportCryptoService.php`:

- `ALGORITHM` is `RS256`.
- `openssl_pkey_new()` generates a 2048-bit RSA key pair.
- `openssl_sign($canonicalStr, $rawSig, $privateKey, OPENSSL_ALGO_SHA256)` creates the signature.
- `openssl_verify($canonicalStr, $rawSig, $publicKey, OPENSSL_ALGO_SHA256)` verifies it.
- `skill_credentials.algorithm` defaults to `RS256`.
- `getJwks()` exports RSA modulus/exponent fields (`n`, `e`) with `kty=RSA` and `alg=RS256`.

The `credential_hash` is a separate SHA-256 digest of the canonical JSON payload. It is not the credential signature and does not make the implementation HMAC.

## ACTUAL KEY STORAGE:

Key lookup order is:

1. `SKILLBRIDGE_PASSPORT_PRIVKEY` and `SKILLBRIDGE_PASSPORT_PUBKEY` environment variables.
2. `backend/storage/keys/passport_private.pem` and `backend/storage/keys/passport_public.pem`.
3. Runtime-generated RSA-2048 key pair, written to those files.

The storage directory is created with mode `0700`. The PEM files are written with ordinary `file_put_contents`; the code does not explicitly apply restrictive file permissions to the files, encrypt the private key, or use an external KMS/secret manager. The repository currently contains only `.gitkeep` in that directory, so deployment must provide environment keys or ensure secure persistent writable storage.

The private key is never returned by the public passport response. The signed credential response does return the public key, which is appropriate for public verification but increases response size and is not a substitute for a JWKS endpoint.

## ACTUAL KEY ROTATION:

**No key rotation implementation is present.**

- `DEFAULT_KEY_ID` is `sb_k1_2026`.
- `signPayload()` accepts a `keyId`, but key loading always returns one current key pair; the key ID does not select a key version.
- No key-version table, active/retired key registry, rotation timestamp, overlap window, or historical public-key lookup exists.
- `verifySignature()` always uses the current public key when no explicit key is passed.
- `verifyCredentialByToken()` ignores the stored credential `key_id` when selecting a verification key.

Operational consequence: changing or losing the current key pair invalidates previously issued credentials unless the old key is retained and verification is extended to select it by `key_id`.

## ACTUAL PUBLIC VERIFICATION:

Credential issuance and ownership controls are implemented in `PassportController`:

- `POST /student/passport`, `/student/passport/reissue`, and `/student/passport/revoke` require the `student` role.
- The student ID is resolved from the authenticated JWT user ID.
- Revocation queries require both the credential passport token and authenticated student ID.
- `GET /passport/{token}` requires `student_passports.is_public = TRUE` before returning the public passport view.
- `GET /passport/{token}/verify` calls `PassportCryptoService::verifyCredentialByToken()` directly and does not check `student_passports.is_public`.
- Verification checks database existence, `REVOKED` status, canonical payload reconstruction, and RSA signature validity.
- The schema includes `expires_at` and `EXPIRED`, but `verifyCredentialByToken()` does not compare `expires_at` with the current time or reject `EXPIRED` status.

Tamper protection is present: changing the stored canonical payload or signature causes `openssl_verify()` to fail. Replay protection is limited: the random bearer passport token identifies one database credential and revocation can invalidate it, but there is no nonce/request freshness check, no expiry enforcement, and no one-time-use requirement. That is acceptable for a shareable credential only if long-lived bearer semantics are intentional.

Tenant isolation is strong for authenticated issue/reissue/revoke operations because ownership is resolved from the authenticated student. Public credential verification is intentionally token-based rather than tenant-authenticated, but the verify endpoint currently does not enforce the passport's `is_public` flag. Anyone who obtains a private credential token can therefore receive verification data through that endpoint.

## ACTUAL JWKS STATUS:

**A JWKS builder exists; no JWKS/public-key HTTP endpoint is registered.**

`PassportCryptoService::getJwks()` returns one RSA JWK containing `kty`, `use`, `alg`, `kid`, `n`, and `e`. However:

- `backend/index.php` has no `/jwks`, `/.well-known/jwks.json`, or equivalent route.
- No OpenAPI JWKS endpoint is defined.
- `getJwks()` always emits `DEFAULT_KEY_ID` rather than a key ID selected from a rotation registry.
- The public verification endpoint verifies server-side and returns the current public key in its response; it is not standards-based third-party JWKS discovery.

## Documentation Reconciliation

The following audit descriptions were corrected to remove HMAC claims and stale passport schema/route claims:

- `AUDIT/00-project-inventory.md`
- `AUDIT/01-feature-matrix.md`
- `AUDIT/03-backend-audit.md`
- `AUDIT/04-api-audit.md`
- `AUDIT/08-proof-of-skill-audit.md`
- `AUDIT/FINAL-COMPLETE-AUDIT.md`
- `AUDIT/FINAL_REVIEW_READINESS_AUDIT.md`
- `AUDIT/SKILLBRIDGE_3_COMPLETE_PRODUCT_AUDIT.md`

## Required Production Follow-up

1. Add a key registry with active and retired RSA public keys, explicit key IDs, and a controlled rotation process.
2. Make verification select the public key by the credential's stored `key_id` and reject unsupported algorithms.
3. Enforce `expires_at` and `EXPIRED` status during verification.
4. Decide whether `/passport/{token}/verify` should honor `is_public`; if yes, enforce it consistently with the public passport view.
5. Add a registered `/.well-known/jwks.json` endpoint backed by the key registry if external verification is required.
6. Set private PEM file permissions explicitly or use a managed secret/KMS facility in production.
7. Add focused tests for signature tampering, revocation, expiry, key selection, key rotation overlap, private-token verification, and JWKS output.

## Final Reconciliation

The actual implementation is **RS256 (RSA-2048 with SHA-256)**. It is not HMAC-SHA256. Documentation claiming HMAC passport signing was stale and has been corrected. The current implementation has working asymmetric signing and server-side verification, but it does not yet implement production-grade key rotation or a public JWKS endpoint.
