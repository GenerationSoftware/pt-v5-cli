type PrizesByTierKeys = "total" | "claimed";

export type PrizesByTier = Record<string, Record<PrizesByTierKeys, number>>;

export interface ConcatWinnersSuccessStats {}

export interface VaultAccountsSuccessStats {
  numVaults: number;
  numTiers: number;
  numPrizeIndices: number;
  numAccounts: number;
}

export interface DrawPrizesSuccessStats {
  numVaults: number;
  numTiers: number;
  numPrizeIndices: number;
  numAccounts: number;
  numPrizes: number;
  prizesByTier: PrizesByTier;
  prizePoolReserve: string;
  amountsTotal: string;
  tierPrizeAmounts: any;
  vaultPortions: any;
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
