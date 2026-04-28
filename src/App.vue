<script setup lang="ts">
import { Target } from "lucide-vue-next";

import PortfolioSection from "@/components/PortfolioSection.vue";
import RebalanceSection from "@/components/RebalanceSection.vue";
import TargetSection from "@/components/TargetSection.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import { Toaster } from "@/components/ui/sonner";
import { useCashUrlSync } from "@/composables/useCashUrlSync";
import { useManualPositionsUrlSync } from "@/composables/useManualPositionsUrlSync";
import { useSourceUrlSync } from "@/composables/useSourceUrlSync";
import { useTargetUrlSync } from "@/composables/useTargetUrlSync";

useSourceUrlSync();
useManualPositionsUrlSync();
useTargetUrlSync();
useCashUrlSync();
</script>

<template>
  <div
    class="bg-background text-foreground flex min-h-screen flex-col xl:h-screen xl:min-h-0 xl:overflow-hidden"
  >
    <header class="border-b">
      <div class="flex items-center justify-between p-4 md:p-6">
        <div class="flex items-center gap-2">
          <Target class="size-6" />
          <h1 class="text-xl font-semibold tracking-tight">Targetfolio</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>

    <main
      class="grid grid-cols-1 gap-6 p-4 md:p-6 xl:min-h-0 xl:flex-1 xl:grid-cols-2 xl:grid-rows-[3fr_2fr]"
    >
      <PortfolioSection />
      <TargetSection />
      <RebalanceSection class="xl:col-span-2" />
    </main>

    <Toaster rich-colors position="top-right" />
  </div>
</template>
