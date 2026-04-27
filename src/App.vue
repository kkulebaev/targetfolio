<script setup lang="ts">
import PortfolioSection from "@/components/PortfolioSection.vue";
import RebalanceSection from "@/components/RebalanceSection.vue";
import TargetSection from "@/components/TargetSection.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import { Toaster } from "@/components/ui/sonner";
</script>

<template>
  <div class="bg-background text-foreground min-h-screen">
    <header class="border-b">
      <div class="flex items-center justify-between p-4 md:p-6">
        <h1 class="text-xl font-semibold tracking-tight">Targetfolio</h1>
        <ThemeToggle />
      </div>
    </header>

    <main class="grid grid-cols-1 gap-6 p-4 md:p-6 xl:grid-cols-2">
      <PortfolioSection />
      <TargetSection />
      <RebalanceSection class="xl:col-span-2" />
    </main>

    <Toaster rich-colors position="top-right" />
  </div>
</template>
