import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { useStorage } from "@vueuse/core";

export const PAGE_SIZE_ALL = 0;

export type UseTablePaginationOptions = {
  storageKey: string;
  defaultPageSize?: number;
};

export type UseTablePaginationReturn<T> = {
  currentPage: Ref<number>;
  pageSize: Ref<number>;
  totalItems: ComputedRef<number>;
  totalPages: ComputedRef<number>;
  pagedItems: ComputedRef<T[]>;
  range: ComputedRef<{ from: number; to: number }>;
  setPage: (next: number) => void;
  setPageSize: (next: number) => void;
};

export function useTablePagination<T>(
  itemsRef: Ref<T[]> | ComputedRef<T[]>,
  options: UseTablePaginationOptions,
): UseTablePaginationReturn<T> {
  const fallback = options.defaultPageSize ?? 10;
  const pageSize = useStorage<number>(options.storageKey, fallback, window.sessionStorage);

  if (
    !Number.isFinite(pageSize.value) ||
    !Number.isInteger(pageSize.value) ||
    pageSize.value < 0
  ) {
    pageSize.value = fallback;
  }

  const currentPage = ref(1);

  const totalItems = computed(() => itemsRef.value.length);

  const effectivePageSize = computed(() =>
    pageSize.value === PAGE_SIZE_ALL ? Math.max(totalItems.value, 1) : pageSize.value,
  );

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalItems.value / effectivePageSize.value)),
  );

  watch(totalPages, (max) => {
    if (currentPage.value > max) currentPage.value = max;
  });

  const pagedItems = computed(() => {
    if (pageSize.value === PAGE_SIZE_ALL) return itemsRef.value.slice();
    const start = (currentPage.value - 1) * pageSize.value;
    return itemsRef.value.slice(start, start + pageSize.value);
  });

  const range = computed(() => {
    const total = totalItems.value;
    if (total === 0) return { from: 0, to: 0 };
    if (pageSize.value === PAGE_SIZE_ALL) return { from: 1, to: total };
    const from = (currentPage.value - 1) * pageSize.value + 1;
    const to = Math.min(from + pageSize.value - 1, total);
    return { from, to };
  });

  function setPage(next: number) {
    const clamped = Math.min(Math.max(1, Math.floor(next)), totalPages.value);
    currentPage.value = clamped;
  }

  function setPageSize(next: number) {
    pageSize.value = next;
    currentPage.value = 1;
  }

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    pagedItems,
    range,
    setPage,
    setPageSize,
  };
}
