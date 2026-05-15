# Ownership Verification

Phase 12 replaces demo-only verification with real target proof.

## Commands

```text
/scan https://target.com
/challenge <job_id>
/verify <job_id>
```

## Proof methods

HTTP proof:

```text
https://target.com/.well-known/clawvapt/<token>.txt
```

File body must contain exactly the token.

DNS proof:

```text
_clawvapt.target.com TXT <token>
```

## Safety behavior

- Scanner gates remain fail-closed until ownership proof passes.
- Scope locks to the verified hostname only.
- `demo-owned-site.local` remains the only demo fixture path.
- Failed proof does not reveal internals; user gets a safe retry message.

## Audit events

- `ownership_challenge_created`
- `ownership_verification_passed`
- `ownership_verification_failed`

## Report fields

Report `authorization_and_scope` includes:

- `verified`
- `scope_locked`
- `scope_host`
- `verification_method`
- `verified_at`
