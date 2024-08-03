'use server'

import { Weather } from '@/components/weather'
import { generateText, StreamData } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createStreamableUI } from 'ai/rsc'
import { ReactNode } from 'react'
import { z } from 'zod'

import { createClient, getUser } from '@/lib/supabase/server'
import { AccountCard, Accounts } from '@/components/accounts'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  display?: ReactNode
}

const supabase = createClient()

export async function continueConversation(history: Message[]) {
  const stream = createStreamableUI()

  const { text, toolResults } = await generateText({
    model: openai('gpt-4o'),
    system:
      'You are a friendly assistant! If the user wants to create an account, ask for the account name and description if not given.',
    messages: history,
    tools: {
      insertAccount: {
        description:
          'Creates an account and inserts it to the database. Ask for the account name and description if not given.',
        parameters: z.object({
          accountName: z.string().describe('Name of the account.'),
          description: z.string().describe('Description of the account.')
        }),
        execute: async ({ accountName, description }) => {
          const { data: account, error } = await supabase
            .from('accounts')
            .insert([{ name: accountName, description: description }])
            .select()
            .single()

          if (account) {
            stream.done(<AccountCard account={account} />)
            return `Successfully created the account.!`
          } else {
            return `Failed to create the account: ${accountName}!`
          }
        }
      },

      // getAllAccounts: {
      //   description: 'Shows all accounts of the user.',
      //   execute: async () => {
      //     const { data: accounts, error } = await supabase
      //       .from('accounts')
      //       .select('*')

      //     if (!error) {
      //       stream.done(<Accounts accounts={accounts} />)
      //       return `Here are all your accounts.`
      //     } else {
      //       return `Failed to your accounts. ${error}`
      //     }
      //   }
      // },
      showWeather: {
        description: 'Show the weather for a given location.',
        parameters: z.object({
          city: z.string().describe('The city to show the weather for.'),
          unit: z
            .enum(['C', 'F'])
            .describe('The unit to display the temperature in')
        }),
        execute: async ({ city, unit }) => {
          stream.done(<Weather city={city} unit={unit} />)
          return `Here's the weather for ${city}!`
        }
      }
    }
  })

  return {
    messages: [
      ...history,
      {
        role: 'assistant' as const,
        content:
          text || toolResults.map(toolResult => toolResult.result).join(),
        display: stream.value
      }
    ]
  }
}
