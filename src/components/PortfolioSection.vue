<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import TablePagination from "./TablePagination.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsXl } from "@/composables/useIsXl";
import { useTablePagination } from "@/composables/useTablePagination";
import { validatePosition } from "@/domain/validation";
import { usePortfolioStore } from "@/stores/portfolio";

const store = usePortfolioStore();
const { source, instruments, positions, totalValue, instrumentsByTicker } = storeToRefs(store);
const isXl = useIsXl();

onMounted(() => {
  if (source.value === "mock" && positions.value.length === 0) store.loadFromMock();
});

function onSourceChange(next: unknown) {
  if (next === "mock" || next === "manual") store.setSource(next);
}

const {
  pagedItems: pagedPositions,
  currentPage,
  pageSize,
  totalItems,
  setPage,
} = useTablePagination(positions, {
  storageKey: "targetfolio:pagination:portfolio",
});

pageSize.value = 10;

const newTicker = ref("");
const newQuantity = ref<number | undefined>(undefined);
const addError = ref<string | null>(null);
const clearDialogOpen = ref(false);

const availableInstrumentsForAdd = computed(() => {
  const usedTickers = new Set(positions.value.map((p) => p.ticker));
  return instruments.value.filter((i) => !usedTickers.has(i.ticker));
});

const canAdd = computed(() => {
  return (
    newTicker.value.length > 0 &&
    newQuantity.value !== undefined &&
    Number.isInteger(newQuantity.value) &&
    newQuantity.value >= 0
  );
});

function addPosition() {
  addError.value = null;
  if (newQuantity.value === undefined) return;
  const result = validatePosition({ ticker: newTicker.value, quantity: newQuantity.value });
  if (!result.ok) {
    addError.value = result.error;
    return;
  }
  store.upsertPosition(result.value);
  newTicker.value = "";
  newQuantity.value = undefined;
}

function updateQuantity(ticker: string, raw: string) {
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 0) return;
  store.upsertPosition({ ticker, quantity: num });
}

function confirmClear() {
  store.clearManualPositions();
  setPage(1);
  clearDialogOpen.value = false;
}

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
      <div class="flex items-center justify-between gap-4">
        <div>
          <CardTitle>Текущий портфель</CardTitle>
          <CardDescription
            >Источник данных: {{ source === "mock" ? "демо" : "ручной ввод" }}</CardDescription
          >
        </div>
        <div class="flex items-center gap-2">
          <Select :model-value="source" @update:model-value="onSourceChange">
            <SelectTrigger class="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mock">Демо</SelectItem>
              <SelectItem value="manual">Ручной ввод</SelectItem>
            </SelectContent>
          </Select>
          <Button
            v-if="source === 'manual'"
            variant="ghost"
            size="icon-sm"
            aria-label="Очистить портфель"
            :disabled="positions.length === 0"
            @click="clearDialogOpen = true"
          >
            <Trash2 class="size-4" />
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent class="flex min-h-0 flex-1 flex-col gap-4">
      <Table class="min-h-0 flex-1">
        <TableHeader>
          <TableRow>
            <TableHead>Тикер</TableHead>
            <TableHead>Название</TableHead>
            <TableHead class="text-right">Лот</TableHead>
            <TableHead class="text-right">Цена ₽</TableHead>
            <TableHead class="text-right">Кол-во</TableHead>
            <TableHead class="text-right">Стоимость ₽</TableHead>
            <TableHead v-if="source === 'manual'" class="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="positions.length === 0" :colspan="source === 'manual' ? 7 : 6">
            Позиций нет
          </TableEmpty>
          <TableRow
            v-for="position in isXl ? positions : pagedPositions"
            :key="position.ticker"
            class="h-12"
          >
            <TableCell class="font-medium">{{ position.ticker }}</TableCell>
            <TableCell>
              {{ instrumentsByTicker.get(position.ticker)?.name ?? "—" }}
            </TableCell>
            <TableCell class="text-right">
              {{ instrumentsByTicker.get(position.ticker)?.lotSize ?? "—" }}
            </TableCell>
            <TableCell class="text-right">
              <template v-if="instrumentsByTicker.get(position.ticker)">
                {{ formatRub(instrumentsByTicker.get(position.ticker)!.price) }}
              </template>
              <template v-else>—</template>
            </TableCell>
            <TableCell class="text-right">
              <template v-if="source === 'manual'">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  class="ml-auto h-8 w-24 text-right"
                  :model-value="position.quantity"
                  @update:model-value="(v) => updateQuantity(position.ticker, String(v))"
                />
              </template>
              <template v-else>{{ position.quantity }}</template>
            </TableCell>
            <TableCell class="text-right">
              <template v-if="instrumentsByTicker.get(position.ticker)">
                {{ formatRub(position.quantity * instrumentsByTicker.get(position.ticker)!.price) }}
              </template>
              <template v-else>—</template>
            </TableCell>
            <TableCell v-if="source === 'manual'">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить позицию"
                @click="store.removePosition(position.ticker)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
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

      <div v-if="source === 'manual'" class="border-t pt-4">
        <div class="flex flex-wrap items-end gap-3">
          <div class="grid gap-2">
            <label class="text-sm font-medium">Тикер</label>
            <Select v-model="newTicker">
              <SelectTrigger class="w-40">
                <SelectValue placeholder="Выбрать" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="inst in availableInstrumentsForAdd"
                  :key="inst.ticker"
                  :value="inst.ticker"
                >
                  {{ inst.ticker }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium">Количество</label>
            <Input
              v-model.number="newQuantity"
              type="number"
              min="0"
              step="1"
              class="w-32"
              placeholder="0"
            />
          </div>
          <Button :disabled="!canAdd" @click="addPosition">
            <Plus class="size-4" /> Добавить
          </Button>
        </div>
        <p v-if="addError" class="text-destructive mt-2 text-sm">{{ addError }}</p>
      </div>

      <div class="mt-auto flex items-center justify-between border-t pt-4">
        <span class="text-muted-foreground text-sm">Суммарная стоимость</span>
        <span class="text-lg font-semibold">{{ formatRub(totalValue) }}</span>
      </div>
    </CardContent>
  </Card>

  <Dialog v-model:open="clearDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Очистить портфель?</DialogTitle>
        <DialogDescription>
          Все позиции будут удалены. Это действие нельзя отменить.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" @click="clearDialogOpen = false">Отмена</Button>
        <Button variant="destructive" @click="confirmClear">Очистить</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
