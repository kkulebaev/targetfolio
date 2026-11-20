import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { INSTRUMENTS, INSTRUMENTS_BY_TICKER } from "@/catalog/instruments";
import portfolioFixture from "@/fixtures/portfolio.json";
import type { Position, Ticker } from "@/domain/types";
import { getAccounts, getPortfolio, getPositions, type TinkoffAccount } from "@/lib/tinkoff";
import { mergeTinkoffPortfolios, sumFreeRub, type SkippedPosition } from "@/lib/tinkoff-portfolio";
import {
  clearSavedToken as clearSavedTokenFromStorage,
  loadSavedToken,
  saveToken as saveTokenToStorage,
} from "@/lib/portfolio-storage";

export type Source = "mock" | "manual" | "tinkoff";
export type TinkoffStatus = "idle" | "loading" | "success" | "error";

/** Pseudo account id that aggregates every open account into one portfolio. */
export const ALL_ACCOUNTS = "all";

type FixtureShape = {
  positions: Position[];
};

export const usePortfolioStore = defineStore("portfolio", () => {
  const source = ref<Source>("tinkoff");
  const localPositions = ref<Position[]>([]);
  const tinkoffPositions = ref<Position[]>([]);

  const savedToken = loadSavedToken();
  const tinkoffToken = ref(savedToken ?? "");
  const tinkoffTokenSaved = ref(savedToken !== null);
  const tinkoffAccounts = ref<TinkoffAccount[]>([]);
  const tinkoffAccountId = ref<string | null>(null);
  const tinkoffStatus = ref<TinkoffStatus>("idle");
  const tinkoffError = ref<string | null>(null);
  const tinkoffSkipped = ref<SkippedPosition[]>([]);
  const tinkoffSkippedCount = computed(() => tinkoffSkipped.value.length);
  const tinkoffFreeCash = ref<number | null>(null);

  const positions = computed<Position[]>(() =>
    source.value === "tinkoff" ? tinkoffPositions.value : localPositions.value,
  );

  const instruments = computed(() => INSTRUMENTS);
  const instrumentsByTicker = computed(() => INSTRUMENTS_BY_TICKER);

  const totalValue = computed(() => {
    let total = 0;
    for (const position of positions.value) {
      const instrument = INSTRUMENTS_BY_TICKER.get(position.ticker);
      if (!instrument) continue;
      total += position.quantity * instrument.price;
    }
    return total;
  });

  function loadFromMock() {
    const fixture = portfolioFixture as FixtureShape;
    localPositions.value = fixture.positions.map((p) => ({ ...p }));
    source.value = "mock";
  }

  // The URL sync applies ?source=mock only after the router resolves, which is later than
  // component mount, so the fixture has to load here rather than in an onMounted hook.
  function setSource(next: Source) {
    source.value = next;
    if (next === "mock" && localPositions.value.length === 0) loadFromMock();
  }

  function upsertPosition(position: Position) {
    if (!INSTRUMENTS_BY_TICKER.has(position.ticker)) return;
    const idx = localPositions.value.findIndex((p) => p.ticker === position.ticker);
    if (idx >= 0) {
      localPositions.value.splice(idx, 1, position);
    } else {
      localPositions.value.push(position);
    }
  }

  function removePosition(ticker: Ticker) {
    localPositions.value = localPositions.value.filter((p) => p.ticker !== ticker);
  }

  function clearManualPositions() {
    localPositions.value = [];
  }

  function setManualPositions(items: readonly Position[]) {
    const seen = new Set<Ticker>();
    const valid: Position[] = [];
    for (const item of items) {
      if (!INSTRUMENTS_BY_TICKER.has(item.ticker)) continue;
      if (seen.has(item.ticker)) continue;
      if (!Number.isInteger(item.quantity) || item.quantity < 0) continue;
      seen.add(item.ticker);
      valid.push({ ticker: item.ticker, quantity: item.quantity });
    }
    localPositions.value = valid;
  }

  function setTinkoffToken(token: string) {
    tinkoffToken.value = token;
  }

  function saveTinkoffToken() {
    const token = tinkoffToken.value.trim();
    if (!token) return;
    saveTokenToStorage(token);
    tinkoffTokenSaved.value = true;
  }

  function clearSavedTinkoffToken() {
    clearSavedTokenFromStorage();
    tinkoffTokenSaved.value = false;
  }

  function resetTinkoff() {
    loadSeq += 1;
    clearSavedTokenFromStorage();
    tinkoffToken.value = "";
    tinkoffTokenSaved.value = false;
    tinkoffAccounts.value = [];
    tinkoffAccountId.value = null;
    tinkoffPositions.value = [];
    tinkoffStatus.value = "idle";
    tinkoffError.value = null;
    tinkoffSkipped.value = [];
    tinkoffFreeCash.value = null;
  }

  function setTinkoffAccountId(id: string) {
    tinkoffAccountId.value = id;
  }

  // Account switches and refreshes can overlap; only the latest load may write state,
  // otherwise a slow response for a previous account overwrites the current one.
  let loadSeq = 0;

  async function loadFromTinkoff() {
    const run = ++loadSeq;
    const isStale = () => run !== loadSeq;
    const token = tinkoffToken.value.trim();
    if (!token) {
      tinkoffError.value = "Введите токен";
      tinkoffStatus.value = "error";
      return;
    }
    tinkoffStatus.value = "loading";
    tinkoffError.value = null;
    try {
      if (tinkoffAccounts.value.length === 0) {
        const fetched = await getAccounts(token);
        if (isStale()) return;
        tinkoffAccounts.value = fetched;
      }
      const accounts = tinkoffAccounts.value;
      if (accounts.length === 0) throw new Error("В аккаунте нет счетов");
      const selectedId = tinkoffAccountId.value;
      const isKnown = selectedId === ALL_ACCOUNTS || accounts.some((a) => a.id === selectedId);
      if (!selectedId || !isKnown) tinkoffAccountId.value = accounts[0]!.id;

      const accountIds =
        tinkoffAccountId.value === ALL_ACCOUNTS
          ? accounts.filter((a) => a.status !== "ACCOUNT_STATUS_CLOSED").map((a) => a.id)
          : [tinkoffAccountId.value!];
      if (accountIds.length === 0) throw new Error("Нет открытых счетов");

      // Free cash is a convenience: if any balance request fails, hide it instead of failing
      // the portfolio, and never show a partial sum across accounts.
      const [portfolios, balances] = await Promise.all([
        Promise.all(accountIds.map((id) => getPortfolio(token, id))),
        Promise.all(accountIds.map((id) => getPositions(token, id))).catch(() => null),
      ]);
      if (isStale()) return;

      const figiToTicker = new Map<string, Ticker>();
      for (const inst of INSTRUMENTS) {
        if (inst.figi) figiToTicker.set(inst.figi, inst.ticker);
      }
      const merged = mergeTinkoffPortfolios(portfolios, figiToTicker);

      tinkoffPositions.value = merged.positions;
      tinkoffSkipped.value = merged.skipped;
      tinkoffFreeCash.value = balances ? sumFreeRub(balances) : null;
      tinkoffStatus.value = "success";
    } catch (err) {
      if (isStale()) return;
      tinkoffError.value = err instanceof Error ? err.message : String(err);
      tinkoffStatus.value = "error";
    }
  }

  return {
    source,
    instruments,
    positions,
    instrumentsByTicker,
    totalValue,
    tinkoffToken,
    tinkoffTokenSaved,
    tinkoffAccounts,
    tinkoffAccountId,
    tinkoffStatus,
    tinkoffError,
    tinkoffSkipped,
    tinkoffSkippedCount,
    tinkoffFreeCash,
    loadFromMock,
    setSource,
    upsertPosition,
    removePosition,
    clearManualPositions,
    setManualPositions,
    setTinkoffToken,
    saveTinkoffToken,
    clearSavedTinkoffToken,
    setTinkoffAccountId,
    resetTinkoff,
    loadFromTinkoff,
  };
});
