import type { Index, IndexCode } from "@/domain/types";
import indicesData from "./indices.json";

export const INDICES: Index[] = indicesData as Index[];

export const INDICES_BY_CODE: ReadonlyMap<IndexCode, Index> = new Map(
  INDICES.map((i) => [i.code, i]),
);
