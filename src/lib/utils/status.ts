import { Status, StatusError } from '../../types'

export interface SuccessStats {
  prizeLength: number;
  amountsTotal: string;
  tierPrizeAmounts: any;
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
    runtime: now - createdAt,
    meta: meta,
  }
}

export function updateStatusFailure(createdAt: number, error: StatusError): Status {
  const now = Date.now()
  return {
    status: 'FAILURE',
    createdAt: createdAt,
    updatedAt: now,
    runtime: now - createdAt,
    error: error,
  }
}
