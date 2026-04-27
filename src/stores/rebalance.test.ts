import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { usePortfolioStore } from "./portfolio";
import { useRebalanceStore } from "./rebalance";
import { useTargetStore } from "./target";

describe("useRebalanceStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("returns no-targets when target list is empty", () => {
    const store = useRebalanceStore();
    expect(store.state.status).toBe("no-targets");
  });

  it("returns invalid-weights when weights do not sum to 100", () => {
    const target = useTargetStore();
    target.addTicker("SBER");
    target.setWeight("SBER", 50);
    const store = useRebalanceStore();
    expect(store.state.status).toBe("invalid-weights");
  });

  it("returns no-cash when cash is unset and ok with recommendations once cash is provided", () => {
    usePortfolioStore();
    const target = useTargetStore();
    target.addTicker("SBER");
    target.setWeight("SBER", 100);

    const store = useRebalanceStore();
    expect(store.state.status).toBe("no-cash");

    store.setCash(1_000_000);
    expect(store.state.status).toBe("ok");
    if (store.state.status === "ok") {
      expect(store.state.result.recommendations[0]!.ticker).toBe("SBER");
    }
  });
});
