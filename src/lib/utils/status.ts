import { Status, StatusError } from '../../types'

export interface SuccessStats {
  numVaults: number;
  numTiers: number;
  numAccounts: number;
  numPrizes: number;
  amountsTotal: string;
  tierPrizeAmounts: any;
  tierAccrualDurationInDraws: any;
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
