<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateInstrument } from "@/domain/validation";
import type { Instrument } from "@/domain/types";

const open = defineModel<boolean>("open", { required: true });
const props = defineProps<{ existingTickers: string[] }>();
const emit = defineEmits<{ created: [instrument: Instrument] }>();

const ticker = ref("");
const name = ref("");
const lotSize = ref<number | undefined>(1);
const price = ref<number | undefined>(undefined);

const error = computed<string | null>(() => {
  const upperTicker = ticker.value.trim().toUpperCase();
  if (!upperTicker) return null;
  if (props.existingTickers.includes(upperTicker)) {
    return "Тикер уже есть в реестре";
  }
  const result = validateInstrument({
    ticker: upperTicker,
    name: name.value,
    lotSize: lotSize.value,
    price: price.value,
  });
  return result.ok ? null : result.error;
});

const canSubmit = computed(() => {
  return (
    ticker.value.trim().length > 0 &&
    name.value.trim().length > 0 &&
    lotSize.value !== undefined &&
    price.value !== undefined &&
    error.value === null
  );
});

watch(open, (next) => {
  if (!next) {
    ticker.value = "";
    name.value = "";
    lotSize.value = 1;
    price.value = undefined;
  }
});

function submit() {
  if (!canSubmit.value || lotSize.value === undefined || price.value === undefined) return;
  const instrument: Instrument = {
    ticker: ticker.value.trim().toUpperCase(),
    name: name.value.trim(),
    lotSize: lotSize.value,
    price: price.value,
  };
  emit("created", instrument);
  open.value = false;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Новый инструмент</DialogTitle>
        <DialogDescription>
          Добавляется в пользовательский реестр и сохраняется между сессиями.
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="ni-ticker">Тикер</Label>
          <Input
            id="ni-ticker"
            v-model="ticker"
            placeholder="SBER"
            autocomplete="off"
            class="uppercase"
          />
        </div>
        <div class="grid gap-2">
          <Label for="ni-name">Название</Label>
          <Input id="ni-name" v-model="name" placeholder="Сбербанк ао" autocomplete="off" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="ni-lot">Лот</Label>
            <Input
              id="ni-lot"
              v-model.number="lotSize"
              type="number"
              min="1"
              step="1"
              placeholder="1"
            />
          </div>
          <div class="grid gap-2">
            <Label for="ni-price">Цена ₽</Label>
            <Input
              id="ni-price"
              v-model.number="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>
        <p v-if="error" class="text-destructive text-sm">{{ error }}</p>

        <DialogFooter>
          <Button type="button" variant="ghost" @click="open = false">Отмена</Button>
          <Button type="submit" :disabled="!canSubmit">Добавить</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
