import { Status, StatusError, DrawPrizesSuccessStats, VaultAccountsSuccessStats, ConcatWinnersSuccessStats } from '../../types'

export function createStatus(): Status {
  return {
    status: 'LOADING',
    createdAt: Date.now(),
  }
}

export function updateStatusSuccess(createdAt: number, meta: DrawPrizesSuccessStats | VaultAccountsSuccessStats | ConcatWinnersSuccessStats): Status {
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