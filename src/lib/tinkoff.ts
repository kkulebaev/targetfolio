const BASE_URL = "https://invest-public-api.tinkoff.ru/rest";
const SERVICE_PREFIX = "tinkoff.public.invest.api.contract.v1";

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
  currentPrice?: MoneyValue;
};

type GetAccountsResponse = { accounts: TinkoffAccount[] };
type GetPortfolioResponse = { positions: TinkoffPortfolioPosition[] };

export class TinkoffApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "TinkoffApiError";
  }
}

async function call<T>(token: string, service: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/${SERVICE_PREFIX}.${service}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new TinkoffApiError(res.status, `${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function getAccounts(token: string): Promise<TinkoffAccount[]> {
  const res = await call<GetAccountsResponse>(token, "UsersService", "GetAccounts", {});
  return res.accounts ?? [];
}

export async function getPortfolio(
  token: string,
  accountId: string,
): Promise<TinkoffPortfolioPosition[]> {
  const res = await call<GetPortfolioResponse>(token, "OperationsService", "GetPortfolio", {
    accountId,
    currency: "RUB",
  });
  return res.positions ?? [];
}

export function quotationToNumber(q: Quotation): number {
  const units = Number(q.units);
  if (!Number.isFinite(units)) return 0;
  return units + q.nano / 1e9;
}
