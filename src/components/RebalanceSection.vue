<script setup lang="ts">
import { computed } from "vue";
import { X } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import TablePagination from "./TablePagination.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsXl } from "@/composables/useIsXl";
import { useTablePagination } from "@/composables/useTablePagination";
import type { BuyRecommendation } from "@/domain/types";
import { usePortfolioStore } from "@/stores/portfolio";
import { useRebalanceStore } from "@/stores/rebalance";

const rebalance = useRebalanceStore();
const portfolio = usePortfolioStore();
const { state, cashAvailable } = storeToRefs(rebalance);
const { instrumentsByTicker, source, tinkoffStatus } = storeToRefs(portfolio);
const isXl = useIsXl();

const isLoading = computed(() => source.value === "tinkoff" && tinkoffStatus.value === "loading");

const cashModel = computed({
  get: () => cashAvailable.value,
  set: (next: number) => rebalance.setCash(Number.isFinite(next) ? next : 0),
});

const recommendations = computed<BuyRecommendation[]>(() =>
  state.value.status === "ok" ? state.value.result.recommendations : [],
);

const {
  pagedItems: pagedRecommendations,
  currentPage,
  pageSize,
  totalItems,
  setPage,
} = useTablePagination(recommendations, {
  storageKey: "targetfolio:pagination:rebalance",
});

pageSize.value = 10;

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);
}
</script>

<template>
  <Card class="h-full min-h-0">
    <CardHeader>
      <CardTitle>Рекомендации</CardTitle>
      <CardDescription>Что докупить, чтобы приблизиться к таргету</CardDescription>
    </CardHeader>
    <CardContent class="flex min-h-0 flex-1 flex-col gap-4">
      <div class="grid max-w-sm gap-2">
        <Label for="cash">Свободно для покупки, ₽</Label>
        <div class="flex items-center gap-2">
          <Input
            id="cash"
            v-model.number="cashModel"
            type="number"
            min="0"
            step="100"
            placeholder="0"
            class="flex-1"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Очистить сумму"
            :disabled="!cashAvailable"
            @click="rebalance.setCash(0)"
          >
            <X class="size-4" />
          </Button>
        </div>
      </div>

      <p
        v-if="isLoading"
        class="text-muted-foreground rounded-md border border-dashed p-4 text-sm"
      >
        Загрузка портфеля…
      </p>
      <p
        v-else-if="state.status === 'no-targets'"
        class="text-muted-foreground rounded-md border border-dashed p-4 text-sm"
      >
        Добавьте позиции в целевой портфель.
      </p>
      <p
        v-else-if="state.status === 'invalid-weights'"
        class="text-destructive rounded-md border border-dashed p-4 text-sm"
      >
        Сумма целевых весов = {{ state.total.toFixed(1) }}%. Исправьте, чтобы увидеть рекомендации.
      </p>
      <p
        v-else-if="state.status === 'no-cash'"
        class="text-muted-foreground rounded-md border border-dashed p-4 text-sm"
      >
        Введите сумму свободного кэша.
      </p>
      <div
        v-else-if="state.status === 'no-recommendations'"
        class="rounded-md border border-dashed p-4 text-sm"
      >
        <p class="text-muted-foreground">
          По текущим параметрам докупать нечего: всё в рамках таргета или денег не хватает на
          минимальный лот.
        </p>
        <p class="mt-2">
          <span class="text-muted-foreground">Неиспользованный остаток: </span>
          <span class="font-semibold">{{ formatRub(state.unusedCash) }}</span>
        </p>
      </div>
      <template v-else>
        <Table class="min-h-0 flex-1 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead class="w-24">Тикер</TableHead>
              <TableHead>Название</TableHead>
              <TableHead class="w-20 text-right">Лотов</TableHead>
              <TableHead class="w-20 text-right">Акций</TableHead>
              <TableHead class="w-32 text-right">Стоимость ₽</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="rec in isXl ? recommendations : pagedRecommendations"
              :key="rec.ticker"
            >
              <TableCell class="font-medium">{{ rec.ticker }}</TableCell>
              <TableCell class="truncate">
                {{ instrumentsByTicker.get(rec.ticker)?.name ?? "—" }}
              </TableCell>
              <TableCell class="text-right">{{ rec.lotsToBuy }}</TableCell>
              <TableCell class="text-right">{{ rec.sharesToBuy }}</TableCell>
              <TableCell class="text-right">{{ formatRub(rec.estimatedCost) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <TablePagination
          v-if="!isXl"
          :page="currentPage"
          :page-size="pageSize"
          :total="totalItems"
          @update:page="setPage"
        />

        <div class="flex items-center justify-between border-t pt-4">
          <span class="text-muted-foreground text-sm">Неиспользованный остаток</span>
          <span class="text-lg font-semibold">{{ formatRub(state.result.unusedCash) }}</span>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
