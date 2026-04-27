<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import NewInstrumentDialog from "./NewInstrumentDialog.vue";
import TablePagination from "./TablePagination.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTablePagination } from "@/composables/useTablePagination";
import type { Instrument } from "@/domain/types";
import { usePortfolioStore } from "@/stores/portfolio";
import { useTargetStore } from "@/stores/target";

const target = useTargetStore();
const portfolio = usePortfolioStore();
const { targetWeights, total, isValid } = storeToRefs(target);
const { instruments, instrumentsByTicker } = storeToRefs(portfolio);

onMounted(() => {
  if (targetWeights.value.length === 0) target.loadFromMock();
});

const usedTickers = computed(() => new Set(targetWeights.value.map((w) => w.ticker)));
const availableInstruments = computed(() =>
  instruments.value.filter((i) => !usedTickers.value.has(i.ticker)),
);

const dialogOpen = ref(false);

const {
  pagedItems: pagedWeights,
  currentPage,
  pageSize,
  totalItems,
  setPage,
  setPageSize,
} = useTablePagination(targetWeights, {
  storageKey: "targetfolio:pagination:target",
});

const totalColor = computed(() => {
  if (isValid.value) return "text-emerald-600 dark:text-emerald-400";
  if (total.value >= 95 && total.value <= 105) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
});

function onWeightInput(ticker: string, raw: string) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return;
  const clamped = Math.max(0, Math.min(100, num));
  target.setWeight(ticker, clamped);
}

function onInstrumentCreated(instrument: Instrument) {
  portfolio.upsertInstrument(instrument);
  target.addTicker(instrument.ticker);
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between gap-4">
        <div>
          <CardTitle>Целевой портфель</CardTitle>
          <CardDescription>Желаемое распределение весов в %</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline"> <Plus class="size-4" /> Добавить тикер </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="max-h-72 overflow-y-auto">
            <DropdownMenuItem
              v-for="inst in availableInstruments"
              :key="inst.ticker"
              @select="target.addTicker(inst.ticker)"
            >
              <span class="font-medium">{{ inst.ticker }}</span>
              <span class="text-muted-foreground ml-2 truncate">{{ inst.name }}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator v-if="availableInstruments.length > 0" />
            <DropdownMenuItem @select="dialogOpen = true">
              <Plus class="size-4" /> Новый инструмент
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Тикер</TableHead>
            <TableHead>Название</TableHead>
            <TableHead class="text-right">Вес %</TableHead>
            <TableHead class="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="targetWeights.length === 0" :colspan="4">
            Добавьте позиции в целевой портфель
          </TableEmpty>
          <TableRow v-for="weight in pagedWeights" :key="weight.ticker">
            <TableCell class="font-medium">{{ weight.ticker }}</TableCell>
            <TableCell>{{ instrumentsByTicker.get(weight.ticker)?.name ?? "—" }}</TableCell>
            <TableCell class="text-right">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="ml-auto h-8 w-24 text-right"
                :model-value="weight.weightPercent"
                @update:model-value="(v) => onWeightInput(weight.ticker, String(v))"
              />
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить из таргета"
                @click="target.removeTicker(weight.ticker)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <TablePagination
        :page="currentPage"
        :page-size="pageSize"
        :total="totalItems"
        @update:page="setPage"
        @update:page-size="setPageSize"
      />

      <div class="flex items-center justify-between border-t pt-4">
        <span class="text-muted-foreground text-sm">Сумма весов</span>
        <span :class="['text-lg font-semibold', totalColor]"> {{ total.toFixed(1) }}% </span>
      </div>
    </CardContent>
  </Card>

  <NewInstrumentDialog
    v-model:open="dialogOpen"
    :existing-tickers="instruments.map((i) => i.ticker)"
    @created="onInstrumentCreated"
  />
</template>
