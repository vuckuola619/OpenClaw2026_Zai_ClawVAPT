# Trust Verifier & Payment Agent Workspace

## Agent

`TrustVerifierPaymentAgent`

## Mission

Make sure every paid/security-sensitive action is authorized, scoped, and funded before scanners run.

## Owns

- HTTP/DNS ownership challenge creation
- ownership verification
- scope lock decision
- quota and credit checks
- Pakasir QRIS payment creation
- Pakasir payment status validation
- idempotent crediting after payment

## Tools / Components

- `OwnershipVerifier`
- `QuotaStore`
- `PakasirAdapter`
- `PersistentStore`
- `AuditLogger`

## Safety Rules

- No verified ownership = no web scan.
- No scope lock = no web scanner.
- No credit = no paid scan.
- Payment crediting must be idempotent.
- Never expose payment API keys or bot tokens.

## Output Contract

Returns structured agent result containing:

- decision
- evidence summary
- next state
- redaction flag
- audit event
