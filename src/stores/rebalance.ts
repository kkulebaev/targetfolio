import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { calculateBuys } from "@/domain/rebalance";
import type { RebalanceResult } from "@/domain/types";
import { usePortfolioStore } from "./portfolio";
import { useTargetStore } from "./target";

export type RebalanceState =
  | { status: "no-targets" }
  | { status: "invalid-weights"; total: number }
  | { status: "no-cash" }
  | { status: "no-recommendations"; unusedCash: number }
  | { status: "ok"; result: RebalanceResult };

export const useRebalanceStore = defineStore("rebalance", () => {
  const cashAvailable = ref(0);

  const state = computed<RebalanceState>(() => {
    const portfolio = usePortfolioStore();
    const target = useTargetStore();

    if (target.targetWeights.length === 0) return { status: "no-targets" };
    if (!target.isValid) return { status: "invalid-weights", total: target.total };
    if (!Number.isFinite(cashAvailable.value) || cashAvailable.value <= 0) {
      return { status: "no-cash" };
    }

    const result = calculateBuys(
      portfolio.instrumentsByTicker,
      portfolio.positions,
      target.targetWeights,
      cashAvailable.value,
    );

    if (result.recommendations.length === 0) {
      return { status: "no-recommendations", unusedCash: result.unusedCash };
    }
    return { status: "ok", result };
  });

  function setCash(value: number) {
    cashAvailable.value = value;
  }

  return { cashAvailable, state, setCash };
});
