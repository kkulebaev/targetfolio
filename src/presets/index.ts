import { INDICES } from "@/catalog/indices";
import { INSTRUMENTS_BY_TICKER } from "@/catalog/instruments";
import type { IndexConstituent, TargetWeight } from "@/domain/types";

export type PresetId = string;

export const DEFAULT_PRESET_ID: PresetId = "imoex";

export type Preset = {
  id: PresetId;
  name: string;
  weights: TargetWeight[];
};

function buildPresetWeights(constituents: IndexConstituent[]): TargetWeight[] {
  const known = constituents.filter((c) => INSTRUMENTS_BY_TICKER.has(c.ticker));
  const sum = known.reduce((s, c) => s + c.weight, 0);
  if (sum <= 0) return [];
  const items: TargetWeight[] = known
    .map((c) => ({
      ticker: c.ticker,
      weightPercent: Math.round((c.weight / sum) * 10000) / 100,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
  const totalRounded = items.reduce((s, w) => s + w.weightPercent, 0);
  const drift = 100 - totalRounded;
  if (Math.abs(drift) > 1e-9 && items.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < items.length; i++) {
      if (items[i]!.weightPercent > items[maxIdx]!.weightPercent) maxIdx = i;
    }
    const top = items[maxIdx]!;
    items[maxIdx] = {
      ticker: top.ticker,
      weightPercent: Math.round((top.weightPercent + drift) * 100) / 100,
    };
  }
  return items;
}

export const PRESETS: Record<string, Preset> = Object.fromEntries(
  INDICES.map((index) => {
    const id = index.code.toLowerCase();
    return [
      id,
      {
        id,
        name: `${index.name} (${index.code})`,
        weights: buildPresetWeights(index.constituents),
      },
    ];
  }),
);

export const PRESET_LIST: Preset[] = Object.values(PRESETS);

export function getPreset(id: PresetId): Preset | null {
  return PRESETS[id] ?? null;
}
