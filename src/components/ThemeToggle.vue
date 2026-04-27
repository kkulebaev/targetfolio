<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { useDark, useToggle } from "@vueuse/core";

import { Button } from "@/components/ui/button";

const isDark = useDark({
  selector: "html",
  attribute: "class",
  valueDark: "dark",
  valueLight: "",
  storageKey: "targetfolio:theme:v1",
});
const toggle = useToggle(isDark);
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    :aria-label="isDark ? 'Светлая тема' : 'Тёмная тема'"
    @click="toggle()"
  >
    <Sun v-if="isDark" class="size-4" />
    <Moon v-else class="size-4" />
  </Button>
</template>
