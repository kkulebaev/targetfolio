import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { useStorage } from "@vueuse/core";

export type SortDir = "asc" | "desc";

export type SortAccessor<T> = (item: T) => number | string | null | undefined;

export type UseTableSortOptions<T> = {
  accessors: Record<string, SortAccessor<T>>;
  defaultKey?: string | null;
  defaultDir?: SortDir;
  storageKey?: string;
};

export type UseTableSortReturn<T> = {
  sortedItems: ComputedRef<T[]>;
  sortKey: Ref<string | null>;
  sortDir: Ref<SortDir>;
  toggle: (key: string) => void;
};

const SESSION_STORAGE = typeof window === "undefined" ? undefined : window.sessionStorage;

export function useTableSort<T>(
  itemsRef: Ref<T[]> | ComputedRef<T[]>,
  options: UseTableSortOptions<T>,
): UseTableSortReturn<T> {
  const defaultKey = options.defaultKey ?? null;
  const defaultDir = options.defaultDir ?? "asc";

  const sortKey =
    options.storageKey && SESSION_STORAGE
      ? useStorage<string | null>(`${options.storageKey}:key`, defaultKey, SESSION_STORAGE)
      : ref<string | null>(defaultKey);

  const sortDir =
    options.storageKey && SESSION_STORAGE
      ? useStorage<SortDir>(`${options.storageKey}:dir`, defaultDir, SESSION_STORAGE)
      : ref<SortDir>(defaultDir);

  if (sortKey.value && !options.accessors[sortKey.value]) {
    sortKey.value = defaultKey;
    sortDir.value = defaultDir;
  }
  if (sortDir.value !== "asc" && sortDir.value !== "desc") {
    sortDir.value = defaultDir;
  }

  watch(sortKey, (key) => {
    if (key === null) sortDir.value = defaultDir;
  });

  const sortedItems = computed(() => {
    const key = sortKey.value;
    if (!key) return itemsRef.value.slice();
    const accessor = options.accessors[key];
    if (!accessor) return itemsRef.value.slice();
    const dir = sortDir.value === "asc" ? 1 : -1;
    return itemsRef.value.slice().sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "ru") * dir;
    });
  });

  function toggle(key: string) {
    if (sortKey.value === key) {
      if (sortDir.value === "asc") {
        sortDir.value = "desc";
      } else {
        sortKey.value = null;
        sortDir.value = "asc";
      }
    } else {
      sortKey.value = key;
      sortDir.value = "asc";
    }
  }

  return { sortedItems, sortKey, sortDir, toggle };
}
