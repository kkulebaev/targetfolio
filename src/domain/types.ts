export type Ticker = string;

export type Instrument = {
  ticker: Ticker;
  name: string;
  lotSize: number;
  price: number;
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
