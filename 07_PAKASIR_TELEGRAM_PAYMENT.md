# Pakasir Telegram Payment Flow

Yes, Pakasir payment can be initiated and completed through the Telegram bot experience.

Telegram does not process the payment directly. The bot sends the Pakasir payment URL or payment details to the user, then the backend validates the payment status using Pakasir API before adding credits.

## Pakasir Integration Modes

### Mode 1 - Payment URL

Bot sends:

```txt
https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}
```

Optional QRIS-only:

```txt
https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}&qris_only=1
```

Use this for fast hackathon demo.

### Mode 2 - API Transaction Create

Backend calls:

```txt
POST https://app.pakasir.com/api/transactioncreate/{method}
```

Body:

```json
{
  "project": "<PAKASIR_SLUG>",
  "order_id": "INV-CLAW-001",
  "amount": 25000,
  "api_key": "<PAKASIR_API_KEY>"
}
```

Supported methods include QRIS and multiple virtual accounts such as `qris`, `bni_va`, `bri_va`, `permata_va`, `cimb_niaga_va`, and others according to Pakasir documentation.

### Mode 3 - Sandbox Payment Simulation

Allowed only when:

```env
PAKASIR_MODE=sandbox
DEMO_MODE=true
```

Backend calls:

```txt
POST https://app.pakasir.com/api/paymentsimulation
```

### Mode 4 - Webhook

Pakasir can send webhook POST when payment completes.

Rule:

Webhook is useful for automation, but ClawVAPT must still validate with Transaction Detail API before adding credits.

Transaction detail endpoint:

```txt
GET https://app.pakasir.com/api/transactiondetail?project={slug}&amount={amount}&order_id={order_id}&api_key={api_key}
```

## Telegram Commands

```txt
/pay
/check_payment <order_id>
/simulate_payment <order_id>
```

## Flow - Second Scan Requires Payment

```txt
User: /scan https://verified-site.com
Bot: Free scan already used. Top up 10 credits to continue.
Bot: Order ID: CLWV-20260515-001
Bot: Amount: Rp25.000
Bot: Pay here: https://app.pakasir.com/pay/<slug>/25000?order_id=CLWV-20260515-001&qris_only=1
Bot: After paying, send /check_payment CLWV-20260515-001
```

After check:

```txt
User: /check_payment CLWV-20260515-001
Bot: Checking Pakasir transaction detail...
Bot: Payment confirmed. Credits added: +10. Resuming scan.
```

Sandbox:

```txt
User: /simulate_payment CLWV-20260515-001
Bot: Sandbox payment simulation requested.
Bot: Simulation completed. Validating transaction detail.
Bot: MOCK/SANDBOX payment confirmed. Credits added: +10.
```

## Required Adapter

```ts
class PakasirAdapter {
  createPaymentUrl(orderId: string, amount: number): string;
  createTransaction(method: string, orderId: string, amount: number): Promise<PakasirTransaction>;
  simulatePayment(orderId: string, amount: number): Promise<PakasirSimulationResult>;
  getTransactionDetail(orderId: string, amount: number): Promise<PakasirTransactionDetail>;
  handleWebhook(payload: unknown): Promise<PakasirWebhookResult>;
}
```

## Security Rules

- Never log `PAKASIR_API_KEY`.
- Never send `PAKASIR_API_KEY` to Telegram.
- Store order locally before checking payment.
- Validate amount, order_id, and project.
- Add credits only after valid payment confirmation.
- If mock payment is used, label `MOCK_PAYMENT_CONFIRMED`.

## Env

```env
PAYMENT_PROVIDER=pakasir
PAKASIR_MODE=sandbox
PAKASIR_SLUG=
PAKASIR_API_KEY=
PAKASIR_DEFAULT_METHOD=qris
PAKASIR_BASE_URL=https://app.pakasir.com
```

## References

- Pakasir docs: https://pakasir.com/p/docs

