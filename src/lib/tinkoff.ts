import {
  parseAccountsResponse,
  parsePortfolioResponse,
  parsePositionsResponse,
} from "./tinkoff-schema";

const BASE_URL = "https://invest-public-api.tinkoff.ru/rest";
const SERVICE_PREFIX = "tinkoff.public.invest.api.contract.v1";
// Loading "all accounts" fires several requests in parallel; one hung request must not
// leave the UI spinning forever.
const REQUEST_TIMEOUT_MS = 15_000;

export type Quotation = { units: string; nano: number };
export type MoneyValue = { currency: string; units: string; nano: number };

export type TinkoffAccount = {
  id: string;
  type: string;
  name: string;
  status: string;
};

export type TinkoffPortfolioPosition = {
  figi: string;
  instrumentType: string;
  quantity: Quotation;
  ticker?: string;
};

export type TinkoffPositions = {
  money: MoneyValue[];
};

export class TinkoffApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "TinkoffApiError";
  }
}

function describeHttpError(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return "Токен недействителен, истёк или не даёт доступа к счёту. Выпустите новый read-only токен.";
  }
  if (status === 429) return "Превышен лимит запросов к T‑Invest API. Попробуйте через минуту.";
  let detail = body.trim();
  try {
    const parsed = JSON.parse(body) as { message?: unknown; description?: unknown };
    const text = [parsed.message, parsed.description].find(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    if (text) detail = text;
  } catch {
    // Not JSON (e.g. a proxy error page): fall back to the raw body.
  }
  const prefix = `Ошибка T‑Invest API (HTTP ${status})`;
  return detail ? `${prefix}: ${detail.slice(0, 200)}` : prefix;
}

function describeTransportError(err: unknown): TinkoffApiError {
  if (err instanceof TinkoffApiError) return err;
  if (err instanceof DOMException && err.name === "TimeoutError") {
    return new TinkoffApiError(0, "T‑Invest API не ответил вовремя. Попробуйте ещё раз.");
  }
  return new TinkoffApiError(0, "Не удалось связаться с T‑Invest API. Проверьте подключение.");
}

async function call(
  token: string,
  service: string,
  method: string,
  body: unknown,
): Promise<unknown> {
  // The timeout signal also aborts reading the body, so the body reads share this handler.
  try {
    const res = await fetch(`${BASE_URL}/${SERVICE_PREFIX}.${service}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) throw new TinkoffApiError(res.status, describeHttpError(res.status, text));
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new TinkoffApiError(res.status, "T‑Invest API вернул ответ не в формате JSON.");
    }
  } catch (err) {
    throw describeTransportError(err);
  }
}

export async function getAccounts(token: string): Promise<TinkoffAccount[]> {
  return parseAccountsResponse(await call(token, "UsersService", "GetAccounts", {}));
}

export async function getPortfolio(
  token: string,
  accountId: string,
): Promise<TinkoffPortfolioPosition[]> {
  return parsePortfolioResponse(
    await call(token, "OperationsService", "GetPortfolio", { accountId, currency: "RUB" }),
  );
}

export async function getPositions(token: string, accountId: string): Promise<TinkoffPositions> {
  return parsePositionsResponse(
    await call(token, "OperationsService", "GetPositions", { accountId }),
  );
}

export function quotationToNumber(q: Quotation): number {
  const units = Number(q.units);
  if (!Number.isFinite(units)) return 0;
  return units + q.nano / 1e9;
}
