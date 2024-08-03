'use client'

import { useState } from 'react'

import { continueConversation, Message } from './actions'

import { ChatList } from '@/components/chat-list'
import { TransactionForm } from '@/components/llm/transaction-form'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export default function Home() {
  const [conversation, setConversation] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')

  return (
    <div>
      <div>
        <>
          <TransactionForm />
          <ChatList messages={conversation} />
        </>
      </div>

      <div>
        <input
          type="text"
          value={input}
          onChange={event => {
            setInput(event.target.value)
          }}
        />
        <button
          onClick={async () => {
            const { messages } = await continueConversation([
              // exclude React components from being sent back to the server:
              ...conversation.map(({ role, content }) => ({ role, content })),
              { role: 'user', content: input }
            ])

            setConversation(messages)
          }}
        >
          Send Message
        </button>
      </div>
    </div>
  )
}
