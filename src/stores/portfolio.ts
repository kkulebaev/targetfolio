import { computed, ref } from "vue";
import { defineStore } from "pinia";

import portfolioFixture from "@/fixtures/portfolio.json";
import type { Instrument, Position, Ticker } from "@/domain/types";

export type Source = "mock" | "manual";

type FixtureShape = {
  instruments: Instrument[];
  positions: Position[];
};

export const usePortfolioStore = defineStore(
  "portfolio",
  () => {
    const source = ref<Source>("mock");
    const instruments = ref<Instrument[]>([]);
    const positions = ref<Position[]>([]);

    const instrumentsByTicker = computed(() => {
      const map = new Map<Ticker, Instrument>();
      for (const inst of instruments.value) map.set(inst.ticker, inst);
      return map;
    });

    const totalValue = computed(() => {
      let total = 0;
      for (const position of positions.value) {
        const instrument = instrumentsByTicker.value.get(position.ticker);
        if (!instrument) continue;
        total += position.quantity * instrument.price;
      }
      return total;
    });

    function loadFromMock() {
      const fixture = portfolioFixture as FixtureShape;
      const merged = new Map<Ticker, Instrument>();
      for (const inst of instruments.value) merged.set(inst.ticker, inst);
      for (const inst of fixture.instruments) merged.set(inst.ticker, inst);
      instruments.value = Array.from(merged.values());
      positions.value = fixture.positions.map((p) => ({ ...p }));
      source.value = "mock";
    }

    function setSource(next: Source) {
      source.value = next;
    }

    function upsertInstrument(instrument: Instrument) {
      const idx = instruments.value.findIndex((i) => i.ticker === instrument.ticker);
      if (idx >= 0) {
        instruments.value.splice(idx, 1, instrument);
      } else {
        instruments.value.push(instrument);
      }
    }

    function removeInstrument(ticker: Ticker) {
      instruments.value = instruments.value.filter((i) => i.ticker !== ticker);
      positions.value = positions.value.filter((p) => p.ticker !== ticker);
    }

    function upsertPosition(position: Position) {
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
      upsertInstrument,
      removeInstrument,
      upsertPosition,
      removePosition,
      clearManualPositions,
    };
  },
  {
    persist: {
      key: "targetfolio:portfolio:v2",
      pick: ["instruments"],
    },
  },
);
