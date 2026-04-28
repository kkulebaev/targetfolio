import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { decodeManualPositions, encodeManualPositions } from "@/lib/manual-positions-url";
import { usePortfolioStore } from "@/stores/portfolio";

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function useManualPositionsUrlSync() {
  const route = useRoute();
  const router = useRouter();
  const portfolio = usePortfolioStore();
  const { source, positions } = storeToRefs(portfolio);

  if (source.value === "manual") applyFromUrl();

  watch(source, (next, prev) => {
    if (next === "manual" && prev !== "manual") applyFromUrl();
  });

  watch(positions, () => syncToUrl(), { deep: true });

  watch(
    () => route.query.p,
    () => {
      if (source.value === "manual") applyFromUrl();
    },
  );

  function applyFromUrl() {
    const raw = asString(route.query.p);
    if (!raw) {
      portfolio.setManualPositions([]);
      return;
    }
    const parsed = decodeManualPositions(raw);
    if (parsed) portfolio.setManualPositions(parsed);
  }

  function syncToUrl() {
    if (source.value !== "manual") return;
    const { p: _drop, ...rest } = route.query;
    const next: Record<string, unknown> = { ...rest };
    if (positions.value.length > 0) {
      next.p = encodeManualPositions(positions.value);
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
