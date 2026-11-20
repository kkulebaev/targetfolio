import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { useRebalanceStore } from "@/stores/rebalance";

const QUERY_KEY = "scope";
const ALL = "all";

function parseIncludeNonTarget(value: unknown): boolean {
  return value === ALL;
}

export function useIncludeNonTargetUrlSync() {
  const route = useRoute();
  const router = useRouter();
  const rebalance = useRebalanceStore();
  const { includeNonTarget } = storeToRefs(rebalance);

  rebalance.setIncludeNonTarget(parseIncludeNonTarget(route.query[QUERY_KEY]));

  watch(includeNonTarget, (next) => {
    const desired = next ? ALL : undefined;
    const raw = route.query[QUERY_KEY];
    const current = typeof raw === "string" ? raw : undefined;
    if (current === desired) return;
    const { [QUERY_KEY]: _drop, ...rest } = route.query;
    router.replace({ query: desired ? { ...rest, [QUERY_KEY]: desired } : rest });
  });

  watch(
    () => route.query[QUERY_KEY],
    (next) => {
      const parsed = parseIncludeNonTarget(next);
      if (rebalance.includeNonTarget !== parsed) rebalance.setIncludeNonTarget(parsed);
    },
  );
}
