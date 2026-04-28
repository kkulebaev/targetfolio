import type { Instrument, Ticker } from "@/domain/types";
import instrumentsData from "./instruments.json";

export const INSTRUMENTS: Instrument[] = instrumentsData as Instrument[];

export const INSTRUMENTS_BY_TICKER: ReadonlyMap<Ticker, Instrument> = new Map(
  INSTRUMENTS.map((i) => [i.ticker, i]),
);
