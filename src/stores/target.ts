import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { isWeightsValid, weightsTotal } from "@/domain/validation";
import type { TargetWeight, Ticker } from "@/domain/types";

export const useTargetStore = defineStore(
  "target",
  () => {
    const targetWeights = ref<TargetWeight[]>([]);

    const total = computed(() => weightsTotal(targetWeights.value));
    const isValid = computed(() => isWeightsValid(targetWeights.value));

    function addTicker(ticker: Ticker) {
      if (targetWeights.value.some((w) => w.ticker === ticker)) return;
      targetWeights.value.push({ ticker, weightPercent: 0 });
    }

    function removeTicker(ticker: Ticker) {
      targetWeights.value = targetWeights.value.filter((w) => w.ticker !== ticker);
    }

    function setWeight(ticker: Ticker, weightPercent: number) {
      const idx = targetWeights.value.findIndex((w) => w.ticker === ticker);
      if (idx < 0) return;
      const current = targetWeights.value[idx];
      if (!current) return;
      targetWeights.value.splice(idx, 1, { ...current, weightPercent });
    }

    function clear() {
      targetWeights.value = [];
    }

    return {
      targetWeights,
      total,
      isValid,
      addTicker,
      removeTicker,
      setWeight,
      clear,
    };
  },
  {
    persist: {
      key: "targetfolio:target:v1",
    },
  },
);
