import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { INSTRUMENTS_BY_TICKER } from "@/catalog/instruments";
import { isWeightsValid, weightsTotal } from "@/domain/validation";
import type { TargetWeight, Ticker } from "@/domain/types";
import { getPreset, type PresetId } from "@/presets";

export type TargetMode = PresetId | "custom";

export const TARGET_STORAGE_KEY = "targetfolio:target:v3";

export const useTargetStore = defineStore(
  "target",
  () => {
    const targetWeights = ref<TargetWeight[]>([]);
    const currentPreset = ref<TargetMode>("custom");

    const total = computed(() => weightsTotal(targetWeights.value));
    const isValid = computed(() => isWeightsValid(targetWeights.value));

    function addTicker(ticker: Ticker) {
      if (!INSTRUMENTS_BY_TICKER.has(ticker)) return;
      if (targetWeights.value.some((w) => w.ticker === ticker)) return;
      targetWeights.value.unshift({ ticker, weightPercent: 0 });
      currentPreset.value = "custom";
    }

    function removeTicker(ticker: Ticker) {
      targetWeights.value = targetWeights.value.filter((w) => w.ticker !== ticker);
      currentPreset.value = "custom";
    }

    function setWeight(ticker: Ticker, weightPercent: number) {
      const idx = targetWeights.value.findIndex((w) => w.ticker === ticker);
      if (idx < 0) return;
      const current = targetWeights.value[idx];
      if (!current) return;
      targetWeights.value.splice(idx, 1, { ...current, weightPercent });
      currentPreset.value = "custom";
    }

    function clear() {
      targetWeights.value = [];
      currentPreset.value = "custom";
    }

    function applyPreset(id: PresetId) {
      const preset = getPreset(id);
      targetWeights.value = preset.weights.map((w) => ({ ...w }));
      currentPreset.value = id;
    }

    return {
      targetWeights,
      currentPreset,
      total,
      isValid,
      addTicker,
      removeTicker,
      setWeight,
      clear,
      applyPreset,
    };
  },
  {
    persist: {
      key: TARGET_STORAGE_KEY,
      pick: ["targetWeights", "currentPreset"],
    },
  },
);
