import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { useRebalanceStore } from "@/stores/rebalance";

function parseCash(value: unknown): number {
  if (typeof value !== "string") return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num;
}

export function useCashUrlSync() {
  const route = useRoute();
  const router = useRouter();
  const rebalance = useRebalanceStore();
  const { cashAvailable } = storeToRefs(rebalance);

  rebalance.setCash(parseCash(route.query.cash));

  watch(cashAvailable, (next) => {
    const desired = next > 0 ? String(next) : undefined;
    const current = typeof route.query.cash === "string" ? route.query.cash : undefined;
    if (current === desired) return;
    const { cash: _drop, ...rest } = route.query;
    router.replace({ query: desired ? { ...rest, cash: desired } : rest });
  });

  watch(
    () => route.query.cash,
    (next) => {
      const parsed = parseCash(next);
      if (rebalance.cashAvailable !== parsed) rebalance.setCash(parsed);
    },
  );
}
