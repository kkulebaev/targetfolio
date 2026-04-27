<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from "reka-ui";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_ALL } from "@/composables/useTablePagination";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
};

const props = withDefaults(defineProps<Props>(), {
  pageSizeOptions: () => [10, 25, 50],
});

const emit = defineEmits<{
  "update:page": [value: number];
  "update:pageSize": [value: number];
}>();

const isAll = computed(() => props.pageSize === PAGE_SIZE_ALL);

const minOption = computed(() => Math.min(...props.pageSizeOptions));

const isVisible = computed(() => {
  if (props.total === 0) return false;
  if (props.total <= minOption.value && !isAll.value && props.pageSize >= props.total) {
    return false;
  }
  return true;
});

const showNav = computed(() => !isAll.value && props.total > props.pageSize);

const range = computed(() => {
  if (props.total === 0) return { from: 0, to: 0 };
  if (isAll.value) return { from: 1, to: props.total };
  const from = (props.page - 1) * props.pageSize + 1;
  const to = Math.min(from + props.pageSize - 1, props.total);
  return { from, to };
});

const itemsPerPage = computed(() => (isAll.value ? Math.max(props.total, 1) : props.pageSize));

const sizeModel = computed({
  get: () => String(props.pageSize),
  set: (value: string) => emit("update:pageSize", Number(value)),
});

function onPageChange(value: number) {
  emit("update:page", value);
}
</script>

<template>
  <div
    v-if="isVisible"
    class="text-muted-foreground flex flex-wrap items-center justify-between gap-3 pt-2 text-sm"
  >
    <div class="flex items-center gap-3">
      <span>{{ range.from }}–{{ range.to }} из {{ total }}</span>
      <Select v-model="sizeModel">
        <SelectTrigger class="h-8 w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in pageSizeOptions" :key="opt" :value="String(opt)">
            {{ opt }}
          </SelectItem>
          <SelectItem :value="String(PAGE_SIZE_ALL)">Все</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <PaginationRoot
      v-if="showNav"
      :page="page"
      :items-per-page="itemsPerPage"
      :total="total"
      :sibling-count="1"
      show-edges
      @update:page="onPageChange"
    >
      <div class="flex items-center gap-1">
        <PaginationPrev as-child>
          <Button variant="outline" size="icon-sm" aria-label="Предыдущая страница">
            <ChevronLeft class="size-4" />
          </Button>
        </PaginationPrev>
        <PaginationList v-slot="{ items }" class="flex items-center gap-1">
          <template v-for="(item, index) in items" :key="index">
            <PaginationListItem v-if="item.type === 'page'" :value="item.value" as-child>
              <Button
                :variant="item.value === page ? 'default' : 'outline'"
                size="icon-sm"
                :aria-label="`Страница ${item.value}`"
                :aria-current="item.value === page ? 'page' : undefined"
              >
                {{ item.value }}
              </Button>
            </PaginationListItem>
            <PaginationEllipsis
              v-else
              :index="index"
              class="flex size-8 items-center justify-center"
            >
              …
            </PaginationEllipsis>
          </template>
        </PaginationList>
        <PaginationNext as-child>
          <Button variant="outline" size="icon-sm" aria-label="Следующая страница">
            <ChevronRight class="size-4" />
          </Button>
        </PaginationNext>
      </div>
    </PaginationRoot>
  </div>
</template>
