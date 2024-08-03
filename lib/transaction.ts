import { z } from 'zod'

// Define the schema for the transaction data without ids and timestamps
const transactionSchema = z.object({
  uid: z.string().describe('User ID of the user to create transaction'),
  account_id: z
    .string()
    .uuid()
    .describe('Account ID of where the transaction will be inserted.')
    .optional(),
  transaction_date: z
    .string()
    .describe('Date when the transaction was made. By default, it is now.')
    .optional(),
  note: z
    .string()
    .describe('Note of the transaction, or what the transaction is for.')
    .optional(),
  category: z.string().describe('Category of the transaction.').optional(),
  amount: z.number().describe('Amount spent in the transaction').optional(),
  transaction_type: z
    .enum(['income', 'expense'])
    .describe('Is it an incoming transaction or expense transaction?')
    .optional()
})

// Define the schema for the complete transaction data including ids and timestamps
const completeTransactionSchema = z.object({
  id: z.number().int(),
  transaction_id: z
    .string()
    .uuid()
    .default(() => 'gen_random_uuid()'),
  uid: z.string().uuid(),
  account_id: z.string().uuid(),
  transaction_date: z.string(),
  note: z.string(),
  category: z.string(),
  amount: z.number(),
  transaction_type: z.enum(['income', 'expense', 'transfer']),
  created_at: z
    .string()
    .transform(val => new Date(val))
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .transform(val => new Date(val))
    .default(() => new Date().toISOString())
})

// TypeScript types inferred from the schemas
export type TransactionSchema = z.infer<typeof transactionSchema>
export type CompleteTransaction = z.infer<typeof completeTransactionSchema>

export { transactionSchema, completeTransactionSchema }
