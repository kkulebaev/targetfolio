import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { INSTRUMENTS, INSTRUMENTS_BY_TICKER } from "@/catalog/instruments";
import portfolioFixture from "@/fixtures/portfolio.json";
import type { Position, Ticker } from "@/domain/types";
import {
  getAccounts,
  getPortfolio,
  quotationToNumber,
  type TinkoffAccount,
} from "@/lib/tinkoff";
import {
  clearSavedToken as clearSavedTokenFromStorage,
  loadSavedToken,
  saveToken as saveTokenToStorage,
} from "@/lib/portfolio-storage";

export type Source = "mock" | "manual" | "tinkoff";
export type TinkoffStatus = "idle" | "loading" | "success" | "error";

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
  const tinkoffSkippedCount = ref(0);

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

  function setSource(next: Source) {
    source.value = next;
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
    clearSavedTokenFromStorage();
    tinkoffToken.value = "";
    tinkoffTokenSaved.value = false;
    tinkoffAccounts.value = [];
    tinkoffAccountId.value = null;
    tinkoffPositions.value = [];
    tinkoffStatus.value = "idle";
    tinkoffError.value = null;
    tinkoffSkippedCount.value = 0;
  }

  function setTinkoffAccountId(id: string) {
    tinkoffAccountId.value = id;
  }

  async function loadFromTinkoff() {
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
        tinkoffAccounts.value = await getAccounts(token);
      }
      const accounts = tinkoffAccounts.value;
      if (accounts.length === 0) throw new Error("В аккаунте нет счетов");
      if (!tinkoffAccountId.value || !accounts.some((a) => a.id === tinkoffAccountId.value)) {
        tinkoffAccountId.value = accounts[0]!.id;
      }
      const raw = await getPortfolio(token, tinkoffAccountId.value);

      const figiToTicker = new Map<string, Ticker>();
      for (const inst of INSTRUMENTS) {
        if (inst.figi) figiToTicker.set(inst.figi, inst.ticker);
      }

      const matched: Position[] = [];
      let skipped = 0;
      for (const p of raw) {
        if (p.instrumentType === "currency") continue;
        const ticker = figiToTicker.get(p.figi);
        if (!ticker) {
          skipped += 1;
          continue;
        }
        const qty = Math.round(quotationToNumber(p.quantity));
        if (qty <= 0) continue;
        matched.push({ ticker, quantity: qty });
      }

      tinkoffPositions.value = matched;
      tinkoffSkippedCount.value = skipped;
      tinkoffStatus.value = "success";
    } catch (err) {
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
    tinkoffSkippedCount,
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
