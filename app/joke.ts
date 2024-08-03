import { z } from 'zod'

export const jokeSchema = z.object({
  setup: z.string().describe('the setup of the joke'),
  punchline: z.string().describe('the punchline of the joke')
})

export type Joke = z.infer<typeof jokeSchema>
