import type { TargetWeight } from "@/domain/types";

import { IMOEX_WEIGHTS } from "./imoex";

export type PresetId = "imoex";

export type Preset = {
  id: PresetId;
  name: string;
  weights: TargetWeight[];
};

export const PRESETS: Record<PresetId, Preset> = {
  imoex: {
    id: "imoex",
    name: "Индекс МосБиржи (IMOEX)",
    weights: IMOEX_WEIGHTS,
  },
};

export const PRESET_LIST: Preset[] = Object.values(PRESETS);

export function getPreset(id: PresetId): Preset {
  return PRESETS[id];
}
