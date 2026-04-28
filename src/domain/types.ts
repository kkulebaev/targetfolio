export type Ticker = string;

export type Instrument = {
  ticker: Ticker;
  name: string;
  lotSize: number;
  price: number;
  figi?: string;
};

export type Position = {
  ticker: Ticker;
  quantity: number;
};

export type TargetWeight = {
  ticker: Ticker;
  weightPercent: number;
};

export type BuyRecommendation = {
  ticker: Ticker;
  lotsToBuy: number;
  sharesToBuy: number;
  estimatedCost: number;
};

export type RebalanceResult = {
  recommendations: BuyRecommendation[];
  unusedCash: number;
};

export type IndexCode = string;

export type IndexConstituent = {
  ticker: Ticker;
  weight: number;
};

export type Index = {
  code: IndexCode;
  name: string;
  fetchedAt: string;
  constituents: IndexConstituent[];
};
