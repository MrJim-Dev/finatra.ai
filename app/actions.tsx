'use server'

import { BotCard, BotMessage } from '@/components/llm/message'
import { Price } from '@/components/llm/price'
import { PriceSkeleton } from '@/components/llm/price-skeleton'
import { Stats } from '@/components/llm/stats'
import { StatsSkeleton } from '@/components/llm/stats-skeleton'
import { openai } from '@ai-sdk/openai'
import type { CoreMessage, ToolInvocation } from 'ai'
import { createAI, getMutableAIState, streamUI } from 'ai/rsc'
import { MainClient } from 'binance'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { z } from 'zod'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { type Chat } from '@/lib/types'
import { createClient, getUser } from '@/lib/supabase/server'
import { AccountSkeleton } from '@/components/llm/account-skeleton'
import { Account } from '@/components/llm/account'
import { TransactionSchema, transactionSchema } from '@/lib/transaction'
import { TransactionForm } from '@/components/llm/transaction-form'
import {
  createNewAccount,
  createTransaction,
  getCryptoPrice,
  getCryptoStats,
  showAccountSummary
} from './tools'

const supabase = createClient()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const binance = new MainClient({
  api_key: process.env.BINANCE_API_KEY,
  api_secret: process.env.BINANCE_API_SECRET
})

export async function sendMessage(message: string): Promise<{
  id: number
  role: 'user' | 'assistant'
  display: ReactNode
}> {
  const { user } = await getUser()

  let { data: user_data, error } = await supabase
    .from('account_details_view')
    .select('*')

  const content = `\
  You are a financial manager bot, and you can help users track expenses, create accounts, and manage transactions such as income, expenses, and transfers.

  Messages inside [] indicate a UI element or a user event. For example:
  - "[Expense of $50 for groceries]" means that the interface showing an expense of $50 for groceries is displayed to the user.

  If the user wants to track expenses, call \`track_expense\` to log the expense.
  If the user wants to create an account, call \`create_new_account\` to set up the new account.
  If the user wants details about their account, call \`show_account_summary\` to show balance, account name, description.
  If the user wants to create a transaction (income, expense, transfer), call \`create_transaction\` to record the transaction.
  If the user wants advice on financial matters, call \`provide_advice\` to give them guidance.

  Here are the user information and current data: ${JSON.stringify(user_data)}

  Besides managing accounts and transactions, you can also chat with users and offer financial advice.
  `

  const history = getMutableAIState<typeof AI>()

  history.update([
    ...history.get(),
    {
      role: 'user',
      content: message
    }
  ])

  const reply = await streamUI({
    model: openai('gpt-4o-2024-05-13'),
    messages: [
      {
        role: 'system',
        content,
        toolInvocations: []
      },
      ...history.get()
    ] as CoreMessage[],
    initial: (
      <BotMessage className="items-center flex shrink-0 select-none justify-center">
        <Loader2 className="h-5 w-5 animate-spin stroke-zinc-900" />
      </BotMessage>
    ),
    text: ({ content, done }) => {
      if (done) history.done([...history.get(), { role: 'assistant', content }])

      return <BotMessage>{content}</BotMessage>
    },
    tools: {
      create_transaction: createTransaction,
      create_new_account: createNewAccount,
      show_account_summary: showAccountSummary,
      get_crypto_price: getCryptoPrice,
      get_crypto_stats: getCryptoStats
    },
    temperature: 0
  })

  return {
    id: Date.now(),
    role: 'assistant' as const,
    display: reply.value
  }
}
// Define the AI state and UI state types
export type AIState = Array<{
  id?: number
  name?:
    | 'get_crypto_price'
    | 'get_crypto_stats'
    | 'create_new_account'
    | 'create_transaction'
  role: 'user' | 'assistant' | 'system'
  content: string
}>

export type UIState = Array<{
  id: number
  role: 'user' | 'assistant'
  display: ReactNode
  toolInvocations?: ToolInvocation[]
}>

// Create the AI provider with the initial states and allowed actions
export const AI = createAI({
  initialAIState: [] as AIState,
  initialUIState: [] as UIState,
  actions: {
    sendMessage
  }
})

export async function getChats(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  try {
    const supabase = createClient()

    await supabase.from('chats').delete().eq('id', id).throwOnError()

    revalidatePath('/')
    return revalidatePath(path)
  } catch (error) {
    return {
      error: 'Unauthorized'
    }
  }
}

export async function clearChats() {
  try {
    const supabase = createClient()

    await supabase.from('chats').delete().throwOnError()
    revalidatePath('/')
    return redirect('/')
  } catch (error) {
    console.log('clear chats error', error)
    return {
      error: 'Unauthorized'
    }
  }
}

export async function getSharedChat(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('chats')
    .select('payload')
    .eq('id', id)
    .not('payload->sharePath', 'is', null)
    .maybeSingle()

  return (data?.payload as Chat) ?? null
}

export async function shareChat(chat: Chat) {
  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  const supabase = createClient()
  await supabase
    .from('chats')
    .update({ payload: payload as any })
    .eq('id', chat.id)
    .throwOnError()

  return payload
}
