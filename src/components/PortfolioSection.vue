<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Plus, RefreshCw, Trash2 } from "lucide-vue-next";
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
import type { TinkoffAccount } from "@/lib/tinkoff";
import { usePortfolioStore } from "@/stores/portfolio";

const store = usePortfolioStore();
const {
  source,
  instruments,
  positions,
  totalValue,
  instrumentsByTicker,
  tinkoffToken,
  tinkoffTokenSaved,
  tinkoffAccounts,
  tinkoffAccountId,
  tinkoffStatus,
  tinkoffError,
  tinkoffSkippedCount,
} = storeToRefs(store);
const isXl = useIsXl();

onMounted(() => {
  if (source.value === "mock" && positions.value.length === 0) store.loadFromMock();
  if (source.value === "tinkoff" && tinkoffToken.value && tinkoffStatus.value === "idle") {
    void store.loadFromTinkoff();
  }
});

function onSourceChange(next: unknown) {
  if (next !== "mock" && next !== "manual" && next !== "tinkoff") return;
  store.setSource(next);
  if (next === "mock" && positions.value.length === 0) store.loadFromMock();
  if (next === "tinkoff" && tinkoffToken.value && tinkoffStatus.value === "idle") {
    void store.loadFromTinkoff();
  }
}

const tokenInput = ref("");
const showTokenForm = ref(!tinkoffToken.value);

const isTinkoff = computed(() => source.value === "tinkoff");
const needsTokenForm = computed(() => isTinkoff.value && showTokenForm.value);

watch(tinkoffStatus, (status) => {
  if (status === "success") showTokenForm.value = false;
});

function onLoadTinkoff() {
  if (!tokenInput.value.trim()) return;
  store.setTinkoffToken(tokenInput.value.trim());
  void store.loadFromTinkoff();
}

function onChangeToken() {
  if (tinkoffTokenSaved.value) store.clearSavedTinkoffToken();
  tokenInput.value = "";
  showTokenForm.value = true;
}

function onSaveToken() {
  store.saveTinkoffToken();
}

function onDeleteSavedToken() {
  store.clearSavedTinkoffToken();
}

function onCancelChangeToken() {
  tokenInput.value = "";
  showTokenForm.value = false;
}

function onRefreshTinkoff() {
  void store.loadFromTinkoff();
}

function onTinkoffAccountChange(id: unknown) {
  if (typeof id !== "string") return;
  store.setTinkoffAccountId(id);
  void store.loadFromTinkoff();
}

function accountLabel(a: TinkoffAccount): string {
  return a.name || a.id;
}

const sourceLabel = computed(() => {
  if (source.value === "mock") return "демо";
  if (source.value === "tinkoff") return "Т-Инвестиции";
  return "ручной ввод";
});

const emptyText = computed(() => {
  if (isTinkoff.value) {
    if (tinkoffStatus.value === "loading") return "Загрузка…";
    if (tinkoffStatus.value === "idle") return "Введите токен Т-Инвестиций и нажмите «Загрузить»";
    if (tinkoffStatus.value === "error") return "Не удалось загрузить портфель";
  }
  return "Позиций нет";
});

const colspan = computed(() => (source.value === "manual" ? 7 : 6));

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
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Текущий портфель</CardTitle>
          <CardDescription>Источник данных: {{ sourceLabel }}</CardDescription>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Select
            v-if="isTinkoff && tinkoffAccounts.length > 1"
            :model-value="tinkoffAccountId ?? undefined"
            :disabled="tinkoffStatus === 'loading'"
            @update:model-value="onTinkoffAccountChange"
          >
            <SelectTrigger class="w-56">
              <SelectValue placeholder="Счёт" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="acc in tinkoffAccounts" :key="acc.id" :value="acc.id">
                {{ accountLabel(acc) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select :model-value="source" @update:model-value="onSourceChange">
            <SelectTrigger class="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mock">Демо</SelectItem>
              <SelectItem value="manual">Ручной ввод</SelectItem>
              <SelectItem value="tinkoff">Т-Инвестиции</SelectItem>
            </SelectContent>
          </Select>
          <Button
            v-if="isTinkoff && tinkoffToken && !showTokenForm"
            variant="ghost"
            size="icon-sm"
            aria-label="Обновить портфель"
            :disabled="tinkoffStatus === 'loading'"
            @click="onRefreshTinkoff"
          >
            <RefreshCw
              class="size-4"
              :class="{ 'animate-spin': tinkoffStatus === 'loading' }"
            />
          </Button>
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
      <div v-if="isTinkoff && needsTokenForm" class="grid gap-3">
        <p class="text-muted-foreground text-sm">
          Чтобы загрузить портфель, создайте read-only токен в&nbsp;настройках Т-Инвестиций и&nbsp;вставьте его ниже.
          <a
            href="https://developer.tbank.ru/invest/intro/intro/token"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary font-medium underline underline-offset-2"
          >
            Как получить токен
          </a>
        </p>
        <div class="flex flex-wrap items-end gap-3">
          <div class="grid min-w-64 flex-1 gap-2">
            <label class="text-sm font-medium">Токен Т-Инвестиций (read-only)</label>
            <Input
              v-model="tokenInput"
              type="password"
              placeholder="t.xxx…"
              autocomplete="off"
              @keydown.enter="onLoadTinkoff"
            />
          </div>
          <Button
            :disabled="!tokenInput.trim() || tinkoffStatus === 'loading'"
            @click="onLoadTinkoff"
          >
            {{ tinkoffStatus === "loading" ? "Загрузка…" : "Загрузить" }}
          </Button>
          <Button v-if="tinkoffStatus === 'success'" variant="ghost" @click="onCancelChangeToken">
            Отмена
          </Button>
        </div>
      </div>

      <div
        v-else-if="isTinkoff && tinkoffToken"
        class="text-muted-foreground flex items-center gap-2 text-sm"
      >
        <span>{{ tinkoffTokenSaved ? "Токен сохранён в браузере" : "Токен задан" }}</span>
        <Button variant="ghost" size="sm" @click="onChangeToken">Изменить</Button>
        <Button
          v-if="tinkoffStatus === 'success' && !tinkoffTokenSaved"
          variant="ghost"
          size="sm"
          @click="onSaveToken"
        >
          Сохранить
        </Button>
        <Button
          v-if="tinkoffTokenSaved"
          variant="ghost"
          size="sm"
          @click="onDeleteSavedToken"
        >
          Удалить сохранённый
        </Button>
      </div>

      <p
        v-if="isTinkoff && tinkoffStatus === 'error' && tinkoffError"
        class="text-destructive bg-destructive/5 border-destructive/30 flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
      >
        <span>{{ tinkoffError }}</span>
        <Button size="sm" variant="ghost" @click="onRefreshTinkoff">Повторить</Button>
      </p>

      <Table
        class="min-h-0 flex-1 transition-opacity"
        :class="{ 'opacity-60': isTinkoff && tinkoffStatus === 'loading' }"
      >
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
          <TableEmpty v-if="positions.length === 0" :colspan="colspan">
            {{ emptyText }}
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

      <p
        v-if="isTinkoff && tinkoffSkippedCount > 0"
        class="text-muted-foreground text-sm"
      >
        Не показано {{ tinkoffSkippedCount }} позиций вне списка MOEX shares.
      </p>

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
