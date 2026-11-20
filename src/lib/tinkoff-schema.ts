import type {
  MoneyValue,
  Quotation,
  TinkoffAccount,
  TinkoffPortfolioPosition,
  TinkoffPositions,
} from "./tinkoff";

export class TinkoffResponseError extends Error {
  constructor(path: string, expected: string) {
    super(`Неожиданный ответ T‑Invest API: ${path} — ожидалось ${expected}`);
    this.name = "TinkoffResponseError";
  }
}

type JsonObject = Record<string, unknown>;

// Proto3 JSON omits fields holding their default value (0, "", [], unset message), so an
// absent field means "default" and only a present field of the wrong type is an error.

function asObject(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TinkoffResponseError(path, "объект");
  }
  return value as JsonObject;
}

function optString(o: JsonObject, key: string, path: string): string {
  const value = o[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new TinkoffResponseError(`${path}.${key}`, "строка");
  return value;
}

function optInt32(o: JsonObject, key: string, path: string): number {
  const value = o[key];
  if (value === undefined || value === null) return 0;
  // Proto3 JSON allows int32 as a quoted string too.
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TinkoffResponseError(`${path}.${key}`, "целое число");
  }
  return value;
}

// int64 is serialized as a string, but accept a JSON number in case a proxy re-encodes it.
function optInt64(o: JsonObject, key: string, path: string): string {
  const value = o[key];
  if (value === undefined || value === null) return "0";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  throw new TinkoffResponseError(`${path}.${key}`, "целое число (int64)");
}

function optArray(o: JsonObject, key: string, path: string): unknown[] {
  const value = o[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TinkoffResponseError(`${path}.${key}`, "массив");
  return value;
}

function parseQuotation(o: JsonObject, key: string, path: string): Quotation {
  const value = o[key];
  if (value === undefined || value === null) return { units: "0", nano: 0 };
  const q = asObject(value, `${path}.${key}`);
  return {
    units: optInt64(q, "units", `${path}.${key}`),
    nano: optInt32(q, "nano", `${path}.${key}`),
  };
}

function parseMoney(value: unknown, path: string): MoneyValue {
  const m = asObject(value, path);
  return {
    currency: optString(m, "currency", path),
    units: optInt64(m, "units", path),
    nano: optInt32(m, "nano", path),
  };
}

export function parseAccountsResponse(json: unknown): TinkoffAccount[] {
  const root = asObject(json, "ответ");
  return optArray(root, "accounts", "ответ").map((item, i) => {
    const path = `accounts[${i}]`;
    const a = asObject(item, path);
    const id = optString(a, "id", path);
    if (!id) throw new TinkoffResponseError(`${path}.id`, "непустой идентификатор счёта");
    return {
      id,
      type: optString(a, "type", path),
      name: optString(a, "name", path),
      status: optString(a, "status", path),
    };
  });
}

export function parsePortfolioResponse(json: unknown): TinkoffPortfolioPosition[] {
  const root = asObject(json, "ответ");
  return optArray(root, "positions", "ответ").map((item, i) => {
    const path = `positions[${i}]`;
    const p = asObject(item, path);
    const ticker = optString(p, "ticker", path);
    return {
      figi: optString(p, "figi", path),
      instrumentType: optString(p, "instrumentType", path),
      quantity: parseQuotation(p, "quantity", path),
      ...(ticker ? { ticker } : {}),
    };
  });
}

export function parsePositionsResponse(json: unknown): TinkoffPositions {
  const root = asObject(json, "ответ");
  return {
    money: optArray(root, "money", "ответ").map((item, i) => parseMoney(item, `money[${i}]`)),
  };
}
