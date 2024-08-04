// tools.tsx

import { Account } from '@/components/llm/account'
import { AccountSkeleton } from '@/components/llm/account-skeleton'
import { BotCard, BotMessage } from '@/components/llm/message'
import { Price } from '@/components/llm/price'
import { PriceSkeleton } from '@/components/llm/price-skeleton'
import { Stats } from '@/components/llm/stats'
import { StatsSkeleton } from '@/components/llm/stats-skeleton'
import { TransactionForm } from '@/components/llm/transaction-form'
import { createClient } from '@/lib/supabase/server'
import { transactionSchema } from '@/lib/transaction'
import { tool } from 'ai'
import { MainClient } from 'binance'
import { z } from 'zod'

const supabase = createClient()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const binance = new MainClient({
  api_key: process.env.BINANCE_API_KEY,
  api_secret: process.env.BINANCE_API_SECRET
})

export const createTransaction = tool({
  description:
    'Create a transaction. Shows the transaction form and fills in the fields if data is available. Leave the parameters empty if no data is available.',
  parameters: transactionSchema,
  generate: async function* ({
    uid,
    account_id,
    transaction_date,
    note,
    category,
    amount,
    transaction_type
  }: {
    uid: string
    account_id: string
    transaction_date: string
    note: string
    category: string
    amount: number
    transaction_type: string
  }) {
    yield (
      <BotCard>
        <AccountSkeleton />
      </BotCard>
    )

    await new Promise(resolve => setTimeout(resolve, 1000))

    const transaction = {
      uid,
      account_id,
      transaction_date,
      note,
      category,
      amount,
      transaction_type
    }

    console.log(transaction)

    return (
      <BotCard>
        <TransactionForm {...transaction} />
      </BotCard>
    )
  }
})

export const createNewAccount = tool({
  description:
    'Creates an account and inserts it to the database. Ask for the account name if not given.',
  parameters: z.object({
    accountName: z.string().describe('Name of the account.')
  }),
  generate: async function* ({ accountName }: { accountName: string }) {
    yield (
      <BotCard>
        <AccountSkeleton />
      </BotCard>
    )

    const { data: new_account, error } = await supabase
      .from('accounts')
      .insert([{ name: accountName }])
      .select()
      .single()

    await new Promise(resolve => setTimeout(resolve, 1000))

    return (
      <BotCard>
        <p className="mb-2">I created a new account for you.</p>
        <Account name={new_account.name} price={0} />
      </BotCard>
    )
  }
})

export const showAccountSummaries = () =>
  tool({
    description: "List account summaries of user's accounts.",
    parameters: z.object({
      userId: z.string().describe('ID of the user.'),
      accountIds: z
        .string()
        .array()
        .describe('Array of all account IDs to show.')
        .min(1)
    }),
    generate: async function* ({
      userId,
      accountIds
    }: {
      userId: string
      accountIds: string[]
    }) {
      yield (
        <BotCard>
          <p className="mb-2">Here is a summary of your account.</p>
          <AccountSkeleton />
        </BotCard>
      )

      // const { data: account, error } = await supabase
      //   .from('account_details_view')
      //   .select('*')
      //   .eq('uid', userid)
      //   .eq('account_id', account_id)
      //   .single()
      // rewrite to support multiple accounts (params array)

      console.log('--- HERE', accountIds)

      const accountsData = []
      for (const account of accountIds) {
        const { data: accountData, error } = await supabase
          .from('account_details_view')
          .select('*')
          .eq('uid', userId)
          .eq('account_id', account)
          .single()
        accountsData.push(accountData)
      }

      await new Promise(resolve => setTimeout(resolve, 600))

      return (
        <BotCard>
          <p className="mb-2">Here is a summary of your account.</p>
          {accountsData.map(acc => (
            <Account key={acc.id} name={acc.name} price={acc.balance} />
          ))}
        </BotCard>
      )
    }
  })

export const getCryptoPrice = tool({
  description:
    'Get the current price of a given cryptocurrency. Use this to show the price to the user.',
  parameters: z.object({
    symbol: z
      .string()
      .describe('The name or symbol of the cryptocurrency. e.g. BTC/ETH/SOL.')
  }),
  generate: async function* ({ symbol }: { symbol: string }) {
    yield (
      <BotCard>
        <PriceSkeleton />
      </BotCard>
    )

    const stats = await binance.get24hrChangeStatististics({
      symbol: `${symbol}USDT`
    })
    const price = Number(stats.lastPrice)
    const delta = Number(stats.priceChange)

    await new Promise(resolve => setTimeout(resolve, 1000))

    return (
      <BotCard>
        <Price name={symbol} price={price} delta={delta} />
      </BotCard>
    )
  }
})

export const getCryptoStats = tool({
  description:
    'Get the current stats of a given cryptocurrency. Use this to show the stats to the user.',
  parameters: z.object({
    slug: z
      .string()
      .describe(
        'The full name of the cryptocurrency in lowercase. e.g. bitcoin/ethereum/solana.'
      )
  }),
  generate: async function* ({ slug }: { slug: string }) {
    yield (
      <BotCard>
        <StatsSkeleton />
      </BotCard>
    )

    const url = new URL(
      'https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail'
    )
    url.searchParams.append('slug', slug)
    url.searchParams.append('limit', '1')
    url.searchParams.append('sortBy', 'market_cap')

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY
      }
    })

    if (!response.ok) {
      return <BotMessage>Crypto not found!</BotMessage>
    }

    const res = (await response.json()) as {
      data: {
        id: number
        name: string
        symbol: string
        volume: number
        volumeChangePercentage24h: number
        statistics: {
          rank: number
          totalSupply: number
          marketCap: number
          marketCapDominance: number
        }
      }
    }

    const data = res.data
    const stats = res.data.statistics

    const marketStats = {
      name: data.name,
      volume: data.volume,
      volumeChangePercentage24h: data.volumeChangePercentage24h,
      rank: stats.rank,
      marketCap: stats.marketCap,
      totalSupply: stats.totalSupply,
      dominance: stats.marketCapDominance
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    return (
      <BotCard>
        <Stats {...marketStats} />
      </BotCard>
    )
  }
})
