import "server-only";

const DEFAULT_BASE_URL = "https://daffaa.net";
const REQUEST_TIMEOUT_MS = 15_000;

/** Paid = Approved or Completed (github.com/mashroecom/daffaa-sdks). */
const PAID_STATUSES = new Set([1, 3]);
/** Cancelled or Fail - won't ever become paid, unlike Pending/NeedsAction. */
const TERMINAL_FAILURE_STATUSES = new Set([2, 4]);

export type DaffaaTransaction = {
  transactionId: string;
  amount: number;
  from: string | null;
  transactionStatus: number;
  statusLabel: string;
  createdAt: string | null;
};

export function daffaaIsPaid(tx: DaffaaTransaction): boolean {
  return PAID_STATUSES.has(tx.transactionStatus);
}

export function daffaaIsTerminalFailure(tx: DaffaaTransaction): boolean {
  return TERMINAL_FAILURE_STATUSES.has(tx.transactionStatus);
}

function getConfig() {
  const apiKey = process.env.DAFFAA_API_KEY;
  const storeId = process.env.DAFFAA_STORE_ID;
  if (!apiKey || !storeId) {
    throw new Error("Daffaa is not configured (DAFFAA_API_KEY / DAFFAA_STORE_ID)");
  }
  const baseUrl = (process.env.DAFFAA_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return { apiKey, storeId, baseUrl };
}

async function daffaaRequest(method: "GET" | "POST", path: string, jsonBody?: unknown): Promise<Record<string, unknown>> {
  const { apiKey, baseUrl } = getConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
        ...(jsonBody !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  // 404 is a domain-level "not found" (see daffaaVerify) - every other
  // non-OK status is a hard error.
  if (!response.ok && response.status !== 404) {
    const message = typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
    throw new Error(`Daffaa request failed: ${message}`);
  }
  return body;
}

/** Verifies a wallet/InstaPay transfer by its reference (POST /api/callback/success).
 * Returns null when Daffaa has no matching transaction yet - the SMS that
 * confirms a fresh transfer can take a few seconds to land, so "not found
 * yet" is an expected, retryable outcome, not necessarily a wrong reference. */
export async function daffaaVerify(transactionId: string): Promise<DaffaaTransaction | null> {
  const body = await daffaaRequest("POST", "/api/callback/success", { transaction_id: transactionId });
  if (body.status === false) return null;

  return {
    transactionId: String(body.transaction_id ?? transactionId),
    amount: toNumber(body.amount) ?? 0,
    from: body.from != null ? String(body.from) : null,
    transactionStatus: toNumber(body.transaction_status) ?? 0,
    statusLabel: typeof body.status_label === "string" ? body.status_label : "غير معروف",
    createdAt: typeof body.created_at === "string" ? body.created_at : null,
  };
}

/** Store payment info (wallets, currency, live exchange rate) shown on the
 * Daffaa checkout page - GET /api/getPaymentInfo?store_id=. Shape isn't
 * documented beyond "wallets, currency, exchange rate", so callers should
 * render it defensively rather than assume specific field names. */
export async function daffaaPaymentInfo(): Promise<unknown> {
  const { storeId } = getConfig();
  return daffaaRequest("GET", `/api/getPaymentInfo?store_id=${encodeURIComponent(storeId)}`);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
