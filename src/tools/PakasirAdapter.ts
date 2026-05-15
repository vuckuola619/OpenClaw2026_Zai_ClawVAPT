export type PakasirStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'MOCK_PAYMENT_CONFIRMED';
export interface PakasirTransaction { orderId: string; amount: number; paymentUrl: string; status: PakasirStatus; mode: 'sandbox'|'live'|'mock'; rawStatus?: string; paymentMethod?: string; completedAt?: string; }

interface PakasirCreateResponse { payment?: { payment_method?: string; expired_at?: string; total_payment?: number } }
interface PakasirDetailResponse { transaction?: { amount?: number; order_id?: string; project?: string; status?: string; payment_method?: string; completed_at?: string } }

export class PakasirAdapter {
  baseUrl = process.env.PAKASIR_BASE_URL || 'https://app.pakasir.com';
  slug = process.env.PAKASIR_SLUG || 'demo-clawvapt';
  mode = process.env.PAKASIR_MODE || 'sandbox';
  method = process.env.PAKASIR_DEFAULT_METHOD || 'qris';
  apiKey = process.env.PAKASIR_API_KEY || '';

  createPaymentUrl(orderId: string, amount = 25000): string {
    const qris = this.method === 'qris' ? '&qris_only=1' : '';
    return `${this.baseUrl}/pay/${encodeURIComponent(this.slug)}/${amount}?order_id=${encodeURIComponent(orderId)}${qris}`;
  }

  async createTransaction(method: string, orderId: string, amount: number): Promise<PakasirTransaction> {
    if (!this.apiKey || process.env.DEMO_MODE === 'true') return { orderId, amount, paymentUrl: this.createPaymentUrl(orderId, amount), status: 'PENDING', mode: 'mock' };
    const res = await fetch(`${this.baseUrl}/api/transactioncreate/${encodeURIComponent(method)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: this.slug, order_id: orderId, amount, api_key: this.apiKey })
    });
    if (!res.ok) throw new Error(`PAKASIR_CREATE_FAILED:${res.status}`);
    const json = await res.json() as PakasirCreateResponse;
    return { orderId, amount, paymentUrl: this.createPaymentUrl(orderId, amount), status: 'PENDING', mode: this.mode === 'live' ? 'live' : 'sandbox', paymentMethod: json.payment?.payment_method || method };
  }

  async simulatePayment(orderId: string, amount: number): Promise<PakasirTransaction> {
    if (process.env.PAKASIR_MODE !== 'sandbox' && process.env.DEMO_MODE !== 'true') throw new Error('SIMULATION_DISABLED');
    return { orderId, amount, paymentUrl: this.createPaymentUrl(orderId, amount), status: 'MOCK_PAYMENT_CONFIRMED', mode: 'mock' };
  }

  async getTransactionDetail(orderId: string, amount: number): Promise<PakasirTransaction> {
    if (!this.apiKey || process.env.DEMO_MODE === 'true') return { orderId, amount, paymentUrl: this.createPaymentUrl(orderId, amount), status: 'MOCK_PAYMENT_CONFIRMED', mode: 'mock' };
    const url = new URL(`${this.baseUrl}/api/transactiondetail`);
    url.searchParams.set('project', this.slug);
    url.searchParams.set('amount', String(amount));
    url.searchParams.set('order_id', orderId);
    url.searchParams.set('api_key', this.apiKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PAKASIR_DETAIL_FAILED:${res.status}`);
    const json = await res.json() as PakasirDetailResponse;
    const tx = json.transaction;
    if (!tx) return { orderId, amount, paymentUrl: this.createPaymentUrl(orderId, amount), status: 'PENDING', mode: this.mode === 'live' ? 'live' : 'sandbox' };
    if (tx.order_id && tx.order_id !== orderId) throw new Error('PAKASIR_ORDER_MISMATCH');
    if (typeof tx.amount === 'number' && tx.amount !== amount) throw new Error('PAKASIR_AMOUNT_MISMATCH');
    const status = normalizePakasirStatus(tx.status);
    return { orderId, amount, paymentUrl: this.createPaymentUrl(orderId, amount), status, rawStatus: tx.status, paymentMethod: tx.payment_method, completedAt: tx.completed_at, mode: this.mode === 'live' ? 'live' : 'sandbox' };
  }

  isPaid(status: string): boolean { return isPaidPakasirStatus(status); }

  async handleWebhook(payload: unknown): Promise<{status:'MOCK'|'INCOMPLETE'; accepted:boolean; note:string}> {
    void payload;
    return { status: 'INCOMPLETE', accepted: false, note: 'Webhook endpoint skeleton only; transaction detail validation required before credits.' };
  }
}

export function normalizePakasirStatus(status?: string): PakasirStatus {
  const normalized = (status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'success' || normalized === 'paid') return normalized === 'paid' ? 'PAID' : 'COMPLETED';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'CANCELLED';
  if (normalized === 'expired') return 'EXPIRED';
  if (normalized === 'mock_payment_confirmed') return 'MOCK_PAYMENT_CONFIRMED';
  return 'PENDING';
}

export function isPaidPakasirStatus(status: string): boolean {
  return ['PAID', 'COMPLETED', 'MOCK_PAYMENT_CONFIRMED'].includes(normalizePakasirStatus(status));
}
