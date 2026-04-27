import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { INSTRUMENTS, INSTRUMENTS_BY_TICKER } from "@/catalog/instruments";
import portfolioFixture from "@/fixtures/portfolio.json";
import type { Position, Ticker } from "@/domain/types";

export type Source = "mock" | "manual";

type FixtureShape = {
  positions: Position[];
};

export const usePortfolioStore = defineStore("portfolio", () => {
  const source = ref<Source>("mock");
  const positions = ref<Position[]>([]);

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
    positions.value = fixture.positions.map((p) => ({ ...p }));
    source.value = "mock";
  }

  function setSource(next: Source) {
    source.value = next;
  }

  function upsertPosition(position: Position) {
    if (!INSTRUMENTS_BY_TICKER.has(position.ticker)) return;
    const idx = positions.value.findIndex((p) => p.ticker === position.ticker);
    if (idx >= 0) {
      positions.value.splice(idx, 1, position);
    } else {
      positions.value.push(position);
    }
  }

  function removePosition(ticker: Ticker) {
    positions.value = positions.value.filter((p) => p.ticker !== ticker);
  }

  function clearManualPositions() {
    positions.value = [];
  }

  return {
    source,
    instruments,
    positions,
    instrumentsByTicker,
    totalValue,
    loadFromMock,
    setSource,
    upsertPosition,
    removePosition,
    clearManualPositions,
  };
});
