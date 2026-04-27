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

type Props = {
  page: number;
  pageSize: number;
  total: number;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:page": [value: number];
}>();

const isVisible = computed(() => props.total > 0);

const showNav = computed(() => props.total > props.pageSize);

const range = computed(() => {
  if (props.total === 0) return { from: 0, to: 0 };
  const from = (props.page - 1) * props.pageSize + 1;
  const to = Math.min(from + props.pageSize - 1, props.total);
  return { from, to };
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
    <span>{{ range.from }}–{{ range.to }} из {{ total }}</span>

    <PaginationRoot
      v-if="showNav"
      :page="page"
      :items-per-page="pageSize"
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
