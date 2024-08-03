import { ToolInvocation, convertToCoreMessages, streamText } from 'ai'
import { Weather } from '@/components/weather'
import { createStreamableUI } from 'ai/rsc'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

import { createClient, getUser } from '@/lib/supabase/server'
import { AccountCard, Accounts } from '@/components/accounts'

interface Message {
  role: 'user' | 'assistant'
  content: string
  display?: React.ReactNode
  toolInvocations?: ToolInvocation[]
}

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json()
  const supabase = createClient()

  const { user } = await getUser()

  // console.log('test', user)

  const result = await streamText({
    model: openai('gpt-4o'),
    system: 'You are a helpful assistant.',
    messages: convertToCoreMessages(messages),
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
            return `Successfully created the account: ${accountName}!`
          } else {
            return `Failed to create the account: ${accountName}!`
          }
        }
      },
      getWeather: {
        description: 'Get the weather for a location',
        parameters: z.object({
          city: z.string().describe('The city to get the weather for'),
          unit: z
            .enum(['C', 'F'])
            .describe('The unit to display the temperature in')
        }),
        execute: async ({ city, unit }) => {
          const weather = {
            value: 24,
            description: 'Sunny'
          }
          return `It is currently ${weather.value}°${unit} and ${weather.description} in ${city}!`
        }
      }
    }
  })

  console.log(result.toolResult)

  return result.toDataStreamResponse()
}
