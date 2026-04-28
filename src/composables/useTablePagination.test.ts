import { beforeEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import { PAGE_SIZE_ALL, useTablePagination } from "./useTablePagination";

const STORAGE_KEY = "test:pagination";

function makeItems(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

describe("useTablePagination", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("slices items by current page and page size", () => {
    const items = ref(makeItems(25));
    const p = useTablePagination(items, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    expect(p.pagedItems.value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(p.totalPages.value).toBe(3);
    expect(p.range.value).toEqual({ from: 1, to: 10 });

    p.setPage(2);
    expect(p.pagedItems.value).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(p.range.value).toEqual({ from: 11, to: 20 });

    p.setPage(3);
    expect(p.pagedItems.value).toEqual([21, 22, 23, 24, 25]);
    expect(p.range.value).toEqual({ from: 21, to: 25 });
  });

  it("clamps currentPage when items shrink", async () => {
    const items = ref(makeItems(25));
    const p = useTablePagination(items, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    p.setPage(3);
    expect(p.currentPage.value).toBe(3);

    items.value = makeItems(5);
    await nextTick();

    expect(p.currentPage.value).toBe(1);
    expect(p.pagedItems.value).toEqual([1, 2, 3, 4, 5]);
  });

  it("resets to first page when pageSize changes", () => {
    const items = ref(makeItems(30));
    const p = useTablePagination(items, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    p.setPage(3);
    expect(p.currentPage.value).toBe(3);

    p.setPageSize(25);
    expect(p.currentPage.value).toBe(1);
    expect(p.pageSize.value).toBe(25);
    expect(p.pagedItems.value).toHaveLength(25);
  });

  it("PAGE_SIZE_ALL returns all items as a single page", () => {
    const items = ref(makeItems(46));
    const p = useTablePagination(items, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    p.setPageSize(PAGE_SIZE_ALL);
    expect(p.totalPages.value).toBe(1);
    expect(p.pagedItems.value).toHaveLength(46);
    expect(p.range.value).toEqual({ from: 1, to: 46 });
  });

  it("range is {0,0} for empty items", () => {
    const items = ref<number[]>([]);
    const p = useTablePagination(items, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    expect(p.totalItems.value).toBe(0);
    expect(p.totalPages.value).toBe(1);
    expect(p.pagedItems.value).toEqual([]);
    expect(p.range.value).toEqual({ from: 0, to: 0 });
  });

  it("setPage clamps out-of-range values", () => {
    const items = ref(makeItems(25));
    const p = useTablePagination(items, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    p.setPage(99);
    expect(p.currentPage.value).toBe(3);

    p.setPage(-5);
    expect(p.currentPage.value).toBe(1);
  });

  it("persists pageSize across instances under the same storage key", async () => {
    const itemsA = ref(makeItems(25));
    const a = useTablePagination(itemsA, { storageKey: STORAGE_KEY, defaultPageSize: 10 });
    a.setPageSize(50);
    await nextTick();

    const itemsB = ref(makeItems(25));
    const b = useTablePagination(itemsB, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    expect(b.pageSize.value).toBe(50);
  });

  it("recovers from invalid persisted pageSize value", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(-7));
    const items = ref(makeItems(25));
    const p = useTablePagination(items, { storageKey: STORAGE_KEY, defaultPageSize: 10 });

    expect(p.pageSize.value).toBe(10);
  });
});
