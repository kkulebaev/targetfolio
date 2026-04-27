<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PRESET_LIST, PRESETS, type PresetId } from "@/presets";
import { usePortfolioStore } from "@/stores/portfolio";
import { useTargetStore } from "@/stores/target";

const target = useTargetStore();
const portfolio = usePortfolioStore();
const { targetWeights, total, isValid, currentPreset } = storeToRefs(target);
const { instruments, instrumentsByTicker } = storeToRefs(portfolio);
const isXl = useIsXl();

onMounted(() => {
  if (targetWeights.value.length === 0) target.applyPreset("imoex");
});

const usedTickers = computed(() => new Set(targetWeights.value.map((w) => w.ticker)));
const availableInstruments = computed(() =>
  instruments.value.filter((i) => !usedTickers.value.has(i.ticker)),
);

const confirmDialogOpen = ref(false);
const pendingPresetId = ref<PresetId | null>(null);

const currentPresetLabel = computed(() => {
  if (currentPreset.value === "custom") return "Кастомный";
  return PRESETS[currentPreset.value].name;
});

watch(confirmDialogOpen, (next) => {
  if (!next) pendingPresetId.value = null;
});

function onPresetSelect(value: unknown) {
  if (typeof value !== "string") return;
  if (!(value in PRESETS)) return;
  const presetId = value as PresetId;
  if (currentPreset.value === presetId) return;
  if (currentPreset.value === "custom" && targetWeights.value.length > 0) {
    pendingPresetId.value = presetId;
    confirmDialogOpen.value = true;
    return;
  }
  target.applyPreset(presetId);
}

function confirmApplyPreset() {
  if (pendingPresetId.value) target.applyPreset(pendingPresetId.value);
  confirmDialogOpen.value = false;
}

const {
  pagedItems: pagedWeights,
  currentPage,
  pageSize,
  totalItems,
  setPage,
} = useTablePagination(targetWeights, {
  storageKey: "targetfolio:pagination:target",
});

pageSize.value = 10;

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

function onAddTicker(ticker: string) {
  target.addTicker(ticker);
  setPage(1);
}
</script>

<template>
  <Card class="h-full min-h-0">
    <CardHeader>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Целевой портфель</CardTitle>
          <CardDescription>Желаемое распределение весов в %</CardDescription>
        </div>
        <div class="flex items-center gap-2">
          <Select :model-value="currentPreset" @update:model-value="onPresetSelect">
            <SelectTrigger class="w-56">
              <SelectValue>
                <span>{{ currentPresetLabel }}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="preset in PRESET_LIST" :key="preset.id" :value="preset.id">
                {{ preset.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" :disabled="availableInstruments.length === 0">
                <Plus class="size-4" /> Добавить
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="max-h-72 overflow-y-auto">
              <DropdownMenuItem
                v-for="inst in availableInstruments"
                :key="inst.ticker"
                @select="onAddTicker(inst.ticker)"
              >
                <span class="font-medium">{{ inst.ticker }}</span>
                <span class="text-muted-foreground ml-2 truncate">{{ inst.name }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardHeader>
    <CardContent class="flex min-h-0 flex-1 flex-col gap-4">
      <Table class="min-h-0 flex-1">
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
          <TableRow
            v-for="weight in isXl ? targetWeights : pagedWeights"
            :key="weight.ticker"
            class="h-12"
          >
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
        v-if="!isXl"
        :page="currentPage"
        :page-size="pageSize"
        :total="totalItems"
        @update:page="setPage"
      />

      <div class="mt-auto flex items-center justify-between border-t pt-4">
        <span class="text-muted-foreground text-sm">Сумма весов</span>
        <span :class="['text-lg font-semibold', totalColor]"> {{ total.toFixed(1) }}% </span>
      </div>
    </CardContent>
  </Card>

  <Dialog v-model:open="confirmDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Применить пресет?</DialogTitle>
        <DialogDescription>
          Текущие веса будут перезаписаны. Это действие нельзя отменить.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" @click="confirmDialogOpen = false">Отмена</Button>
        <Button @click="confirmApplyPreset">Применить</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
