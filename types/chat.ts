export interface TransactionRequest {
  transaction_type: 'income' | 'expense' | 'transfer';
  type?: 'income' | 'expense' | 'transfer'; // For backward compatibility
  amount: number;
  category?: string;
  account_id: string;
  to_account_id?: string;
  note?: string;
  description?: string;
  transaction_date?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
} 