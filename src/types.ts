type PrizesByTierKeys = "total" | "claimed";

export type PrizesByTier = Record<string, Record<PrizesByTierKeys, number>>;

export interface SuccessStats {
  numAccounts: number;
  numVaults?: number;
  numTiers?: number;
  numPrizeIndices?: number;
}

export type StatusError = {
  code: number;
  msg: string;
};

export interface Status {
  status: "LOADING" | "REQUEST" | "SUCCESS" | "FAILURE";
  createdAt: number;
  updatedAt?: number;
  runtime?: number;
  meta?: any;
  error?: StatusError;
}

export type PrizeTierIndices = Record<string, number[]>;

export type Winner = {
  user: string;
  prizes: PrizeTierIndices;
};
