<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <thead
    data-slot="table-header"
    :class="cn('[&_tr]:border-b [&_th]:bg-card [&_th]:sticky [&_th]:top-0 [&_th]:z-10', props.class)"
  >
    <slot />
  </thead>
</template>
