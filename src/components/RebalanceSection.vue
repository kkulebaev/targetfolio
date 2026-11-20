<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { X } from "@lucide/vue";
import { storeToRefs } from "pinia";

import SortableTableHead from "./SortableTableHead.vue";
import TablePagination from "./TablePagination.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useIsXl } from "@/composables/useIsXl";
import { useTablePagination } from "@/composables/useTablePagination";
import { useTableSort } from "@/composables/useTableSort";
import type { AllocationRow } from "@/domain/allocation";
import { ALL_ACCOUNTS, usePortfolioStore } from "@/stores/portfolio";
import { useRebalanceStore } from "@/stores/rebalance";

const rebalance = useRebalanceStore();
const portfolio = usePortfolioStore();
const { state, cashAvailable, includeNonTarget, nonTargetValue } = storeToRefs(rebalance);
const { instrumentsByTicker, source, tinkoffStatus, tinkoffFreeCash, tinkoffAccountId } =
  storeToRefs(portfolio);
const isXl = useIsXl();

const isLoading = computed(() => source.value === "tinkoff" && tinkoffStatus.value === "loading");

const QUICK_ADD_AMOUNTS = [1000, 5000, 10000, 50000, 100000] as const;
const numberFormatter = new Intl.NumberFormat("ru-RU");

const cashModel = computed({
  get: () => (cashAvailable.value > 0 ? numberFormatter.format(cashAvailable.value) : ""),
  set: (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const parsed = digits === "" ? 0 : Number(digits);
    rebalance.setCash(Number.isFinite(parsed) ? parsed : 0);
  },
});

// The cash input accepts whole roubles only, so kopecks are dropped rather than rounded up
// to an amount the account does not have.
const brokerFreeCash = computed(() => {
  if (source.value !== "tinkoff" || tinkoffStatus.value !== "success") return null;
  const value = tinkoffFreeCash.value;
  return value !== null && value >= 1 ? Math.floor(value) : null;
});

watch(
  brokerFreeCash,
  (value) => {
    if (value !== null && cashAvailable.value <= 0) rebalance.setCash(value);
  },
  { immediate: true },
);

function addCash(amount: number) {
  rebalance.setCash(cashAvailable.value + amount);
}

type ResultRow = AllocationRow & {
  lotsToBuy: number;
  sharesToBuy: number;
  estimatedCost: number;
};

const showAllTargets = ref(false);

const rows = computed<ResultRow[]>(() => {
  if (state.value.status !== "ok") return [];
  const recByTicker = new Map(state.value.result.recommendations.map((r) => [r.ticker, r]));
  const result: ResultRow[] = [];
  for (const row of state.value.allocation.rows) {
    const rec = recByTicker.get(row.ticker);
    if (!rec && !showAllTargets.value) continue;
    result.push({
      ...row,
      lotsToBuy: rec?.lotsToBuy ?? 0,
      sharesToBuy: rec?.sharesToBuy ?? 0,
      estimatedCost: rec?.estimatedCost ?? 0,
    });
  }
  return result;
});

const percentFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${percentFormatter.format(value)}%`;
}

function movesTowardTarget(row: ResultRow): boolean {
  if (row.currentPercent === null || row.afterPercent === null) return false;
  return (
    Math.abs(row.afterPercent - row.targetPercent) <
    Math.abs(row.currentPercent - row.targetPercent) - 0.005
  );
}

const {
  sortedItems: sortedRecommendations,
  sortKey,
  sortDir,
  toggle: toggleSort,
} = useTableSort(rows, {
  storageKey: "targetfolio:sort:rebalance",
  accessors: {
    ticker: (r) => r.ticker,
    name: (r) => instrumentsByTicker.value.get(r.ticker)?.name ?? "",
    lotsToBuy: (r) => r.lotsToBuy,
    sharesToBuy: (r) => r.sharesToBuy,
    estimatedCost: (r) => r.estimatedCost,
    currentPercent: (r) => r.currentPercent,
    afterPercent: (r) => r.afterPercent,
    targetPercent: (r) => r.targetPercent,
  },
});

const {
  pagedItems: pagedRecommendations,
  currentPage,
  pageSize,
  totalItems,
  setPage,
} = useTablePagination(sortedRecommendations, {
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
  <Card class="xl:h-full xl:min-h-0">
    <CardHeader>
      <CardTitle>Рекомендации</CardTitle>
      <CardDescription>Что докупить, чтобы приблизиться к таргету</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4 xl:min-h-0 xl:flex-1">
      <div class="flex flex-wrap items-start gap-x-10 gap-y-4">
        <div class="grid max-w-full gap-2">
          <Label for="cash">Свободно для покупки, ₽</Label>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-1">
              <Input
                id="cash"
                v-model="cashModel"
                type="text"
                inputmode="numeric"
                placeholder="0"
                class="w-36"
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
            <Button
              v-for="amount in QUICK_ADD_AMOUNTS"
              :key="amount"
              variant="outline"
              size="sm"
              @click="addCash(amount)"
            >
              +{{ numberFormatter.format(amount) }}
            </Button>
          </div>
          <p
            v-if="brokerFreeCash !== null"
            class="text-muted-foreground flex items-center gap-2 text-sm"
          >
            {{ tinkoffAccountId === ALL_ACCOUNTS ? "На счетах" : "На счёте" }} свободно
            {{ formatRub(brokerFreeCash) }}
            <Button
              variant="link"
              size="sm"
              class="h-auto p-0"
              :disabled="cashAvailable === brokerFreeCash"
              @click="rebalance.setCash(brokerFreeCash)"
            >
              Подставить
            </Button>
          </p>
        </div>

        <div class="grid gap-2">
          <div class="flex items-center gap-3">
            <Switch
              id="include-non-target"
              :model-value="includeNonTarget"
              @update:model-value="rebalance.setIncludeNonTarget"
            />
            <Label
              for="include-non-target"
              :title="
                includeNonTarget
                  ? 'Веса таргета считаются от всего портфеля. Бумаги вне таргета не докупаются.'
                  : 'Веса таргета считаются только от бумаг, входящих в таргет.'
              "
            >
              Учитывать бумаги вне таргета
              <span v-if="nonTargetValue > 0" class="text-muted-foreground font-normal">
                ({{ formatRub(nonTargetValue) }})
              </span>
            </Label>
          </div>
          <div class="flex items-center gap-3">
            <Switch id="show-all-targets" v-model="showAllTargets" />
            <Label for="show-all-targets">Показывать все бумаги таргета</Label>
          </div>
        </div>
      </div>

      <p v-if="isLoading" class="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
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
        <p v-if="state.allocation.deviationBefore !== null" class="mt-1">
          <span class="text-muted-foreground">Текущее отклонение от таргета: </span>
          <span class="font-semibold">{{ formatPercent(state.allocation.deviationBefore) }}</span>
        </p>
      </div>
      <template v-else>
        <div class="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          <Table class="table-fixed min-w-190">
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sort-key="ticker"
                  :active="sortKey"
                  :dir="sortDir"
                  class="w-24"
                  @toggle="toggleSort"
                >
                  Тикер
                </SortableTableHead>
                <SortableTableHead
                  sort-key="name"
                  :active="sortKey"
                  :dir="sortDir"
                  class="min-w-40"
                  @toggle="toggleSort"
                >
                  Название
                </SortableTableHead>
                <SortableTableHead
                  sort-key="lotsToBuy"
                  :active="sortKey"
                  :dir="sortDir"
                  align="right"
                  class="w-20 text-right"
                  @toggle="toggleSort"
                >
                  Лотов
                </SortableTableHead>
                <SortableTableHead
                  sort-key="sharesToBuy"
                  :active="sortKey"
                  :dir="sortDir"
                  align="right"
                  class="w-20 text-right"
                  @toggle="toggleSort"
                >
                  Акций
                </SortableTableHead>
                <SortableTableHead
                  sort-key="estimatedCost"
                  :active="sortKey"
                  :dir="sortDir"
                  align="right"
                  class="w-32 text-right"
                  @toggle="toggleSort"
                >
                  Стоимость ₽
                </SortableTableHead>
                <SortableTableHead
                  sort-key="currentPercent"
                  :active="sortKey"
                  :dir="sortDir"
                  align="right"
                  class="w-24 text-right"
                  @toggle="toggleSort"
                >
                  Сейчас
                </SortableTableHead>
                <SortableTableHead
                  sort-key="afterPercent"
                  :active="sortKey"
                  :dir="sortDir"
                  align="right"
                  class="w-24 text-right"
                  @toggle="toggleSort"
                >
                  После
                </SortableTableHead>
                <SortableTableHead
                  sort-key="targetPercent"
                  :active="sortKey"
                  :dir="sortDir"
                  align="right"
                  class="w-24 text-right"
                  @toggle="toggleSort"
                >
                  Цель
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="rec in isXl ? sortedRecommendations : pagedRecommendations"
                :key="rec.ticker"
              >
                <TableCell class="font-medium">{{ rec.ticker }}</TableCell>
                <TableCell class="truncate">
                  {{ instrumentsByTicker.get(rec.ticker)?.name ?? "—" }}
                </TableCell>
                <TableCell class="text-right">{{ rec.lotsToBuy || "—" }}</TableCell>
                <TableCell class="text-right">{{ rec.sharesToBuy || "—" }}</TableCell>
                <TableCell class="text-right">
                  {{ rec.estimatedCost ? formatRub(rec.estimatedCost) : "—" }}
                </TableCell>
                <TableCell class="text-muted-foreground text-right">
                  {{ formatPercent(rec.currentPercent) }}
                </TableCell>
                <TableCell
                  class="text-right font-medium"
                  :class="{ 'text-emerald-600 dark:text-emerald-400': movesTowardTarget(rec) }"
                >
                  {{ formatPercent(rec.afterPercent) }}
                </TableCell>
                <TableCell class="text-muted-foreground text-right">
                  {{ formatPercent(rec.targetPercent) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePagination
          v-if="!isXl"
          :page="currentPage"
          :page-size="pageSize"
          :total="totalItems"
          @update:page="setPage"
        />

        <div
          class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t pt-4 text-sm"
        >
          <div
            class="flex flex-wrap items-baseline gap-x-2"
            title="Половина суммы |вес − цель| по бумагам: какая доля портфеля лежит не там, где должна. 0% — портфель точно совпадает с таргетом."
          >
            <span class="text-muted-foreground">Отклонение от таргета</span>
            <span class="font-semibold">{{ formatPercent(state.allocation.deviationBefore) }}</span>
            <span class="text-muted-foreground">→</span>
            <span class="font-semibold text-emerald-600 dark:text-emerald-400">
              {{ formatPercent(state.allocation.deviationAfter) }}
            </span>
            <span v-if="(state.allocation.nonTargetBefore ?? 0) > 0" class="text-muted-foreground">
              (вне таргета {{ formatPercent(state.allocation.nonTargetBefore) }} →
              {{ formatPercent(state.allocation.nonTargetAfter) }})
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-muted-foreground">Неиспользованный остаток</span>
            <span class="text-lg font-semibold">{{ formatRub(state.result.unusedCash) }}</span>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
