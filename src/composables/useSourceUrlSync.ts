import { watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { usePortfolioStore, type Source } from "@/stores/portfolio";

const URL_SOURCES = new Set<Source>(["mock", "manual"]);

function parseSource(value: unknown): Source {
  if (typeof value === "string" && (URL_SOURCES as Set<string>).has(value)) {
    return value as Source;
  }
  return "tinkoff";
}

export function useSourceUrlSync() {
  const route = useRoute();
  const router = useRouter();
  const portfolio = usePortfolioStore();
  const { source } = storeToRefs(portfolio);

  portfolio.setSource(parseSource(route.query.source));

  watch(source, (next) => {
    const desired = next === "tinkoff" ? undefined : next;
    const current = typeof route.query.source === "string" ? route.query.source : undefined;
    if (current === desired) return;
    const { source: _drop, ...rest } = route.query;
    router.replace({ query: desired ? { ...rest, source: desired } : rest });
  });

  watch(
    () => route.query.source,
    (next) => {
      const parsed = parseSource(next);
      if (portfolio.source !== parsed) portfolio.setSource(parsed);
    },
  );
}
