import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { decodeCustomWeights, encodeCustomWeights } from "@/lib/target-url";
import { DEFAULT_PRESET_ID, PRESETS, type PresetId } from "@/presets";
import { useTargetStore } from "@/stores/target";

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function useTargetUrlSync() {
  const route = useRoute();
  const router = useRouter();
  const target = useTargetStore();
  const { targetWeights, currentPreset } = storeToRefs(target);

  applyFromUrl();

  watch(
    [currentPreset, targetWeights] as const,
    () => syncToUrl(),
    { deep: true },
  );

  watch(
    () => [route.query.preset, route.query.w] as const,
    () => applyFromUrl(),
  );

  function applyFromUrl() {
    const preset = asString(route.query.preset);
    if (preset && preset in PRESETS) {
      if (currentPreset.value !== preset) target.applyPreset(preset as PresetId);
      return;
    }

    const w = asString(route.query.w);
    if (w !== undefined) {
      const weights = decodeCustomWeights(w);
      if (weights) {
        target.setCustomWeights(weights);
        return;
      }
    }

    if (currentPreset.value !== DEFAULT_PRESET_ID) target.applyPreset(DEFAULT_PRESET_ID);
  }

  function syncToUrl() {
    const { preset: _p, w: _w, ...rest } = route.query;
    const next: Record<string, unknown> = { ...rest };

    if (currentPreset.value === "custom") {
      if (targetWeights.value.length > 0) {
        next.w = encodeCustomWeights(targetWeights.value);
      }
    } else if (currentPreset.value !== DEFAULT_PRESET_ID) {
      next.preset = currentPreset.value;
    }

    if (sameQuery(route.query, next)) return;
    router.replace({ query: next });
  }
}

function sameQuery(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
