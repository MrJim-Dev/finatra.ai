import type { Transaction } from '@/components/transactions-view';

/** Signed effect on `accountId` (income +, expense −, transfer by side). */
export function signedAmountForAccount(
  tx: Pick<
    Transaction,
    'transaction_type' | 'amount' | 'account' | 'to_account_id'
  >,
  accountId: string
): number {
  const amt = Number(tx.amount);
  const fromId = tx.account.account_id;

  if (tx.transaction_type === 'income') {
    return fromId === accountId ? amt : 0;
  }
  if (tx.transaction_type === 'expense') {
    return fromId === accountId ? -amt : 0;
  }
  if (tx.transaction_type === 'transfer') {
    if (fromId === accountId) return -amt;
    if (tx.to_account_id === accountId) return amt;
    return 0;
  }
  return 0;
}

/** Same rules as `signedAmountForAccount` for minimal Supabase rows. */
export function signedDeltaFromRow(
  r: {
    amount: number | string;
    transaction_type: string;
    account_id: string;
    to_account_id: string | null;
  },
  accountId: string
): number {
  const amt = Number(r.amount);
  const aid = r.account_id;
  const toId = r.to_account_id;
  const type = r.transaction_type;

  if (type === 'income' && aid === accountId) return amt;
  if (type === 'expense' && aid === accountId) return -amt;
  if (type === 'transfer') {
    if (aid === accountId) return -amt;
    if (toId === accountId) return amt;
  }
  return 0;
}
