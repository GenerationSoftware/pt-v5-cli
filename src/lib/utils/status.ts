import { Status, StatusError } from '../../types.js'

type PrizesByTierKeys = 'total' | 'claimed'

export type PrizesByTier = Record<string, Record<PrizesByTierKeys, number>>;

export interface SuccessStats {
  numVaults: number;
  numTiers: number;
  numPrizeIndices: number;
  numAccounts: number;
  prizesByTier: PrizesByTier;
  prizePoolReserve: string;
  amountsTotal: string;
  tierPrizeAmounts: any;
  vaultPortions: any;
}

export function createStatus(): Status {
  return {
    status: 'LOADING',
    createdAt: Date.now(),
  }
}

export function updateStatusSuccess(createdAt: number, meta: SuccessStats): Status {
  const now = Date.now()
  return {
    status: 'SUCCESS',
    createdAt: createdAt,
    updatedAt: now,
    runtime: Math.ceil((now - createdAt)/1000),
    meta: meta,
  }
}

export function updateStatusFailure(createdAt: number, error: StatusError): Status {
  const now = Date.now()
  return {
    status: 'FAILURE',
    createdAt: createdAt,
    updatedAt: now,
    runtime: Math.ceil((now - createdAt)/1000),
    error: error,
  }
}
