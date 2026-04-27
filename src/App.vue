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
      <div class="mx-auto flex max-w-6xl items-center justify-between p-6">
        <h1 class="text-xl font-semibold tracking-tight">Targetfolio</h1>
        <ThemeToggle />
      </div>
    </header>

    <main class="mx-auto grid max-w-6xl gap-6 p-6">
      <PortfolioSection />
      <TargetSection />
      <RebalanceSection />
    </main>

    <Toaster rich-colors position="top-right" />
  </div>
</template>
