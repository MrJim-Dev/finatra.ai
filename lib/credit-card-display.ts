/**
 * Credit card row: amount owed vs credit/overpayment from a single ledger balance.
 * Negative balance → debt shown under Balance payable (red).
 * Positive balance → credit on the card under Outstanding (blue).
 */
export function creditCardPayableAndOutstanding(balance: number): {
  payable: number;
  outstanding: number;
} {
  if (balance < 0) {
    return { payable: Math.abs(balance), outstanding: 0 };
  }
  return { payable: 0, outstanding: balance };
}
