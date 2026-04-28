<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-vue-next";

import { TableHead } from "@/components/ui/table";

type SortDir = "asc" | "desc";

const props = defineProps<{
  sortKey: string;
  active: string | null;
  dir: SortDir;
  align?: "left" | "right";
  class?: HTMLAttributes["class"];
}>();

const emit = defineEmits<{ toggle: [key: string] }>();

const isActive = computed(() => props.active === props.sortKey);
</script>

<template>
  <TableHead :class="props.class">
    <button
      type="button"
      class="hover:text-foreground/70 -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-1 px-2 py-1 transition-colors"
      :class="props.align === 'right' ? 'justify-end' : 'justify-start'"
      @click="emit('toggle', props.sortKey)"
    >
      <slot />
      <ArrowUp v-if="isActive && props.dir === 'asc'" class="size-3.5" />
      <ArrowDown v-else-if="isActive && props.dir === 'desc'" class="size-3.5" />
      <ArrowUpDown v-else class="size-3.5 opacity-40" />
    </button>
  </TableHead>
</template>
