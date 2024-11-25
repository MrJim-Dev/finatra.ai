'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { X, Plus } from 'lucide-react';
import {
  toggleRightSidebar,
  getRightSidebarState,
} from '@/lib/actions/sidebar';
import { TransactionModal } from './transaction-modal';

export function AIChatInterface() {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [input, setInput] = useState('');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const initSidebarState = async () => {
      const state = await getRightSidebarState();
      setIsOpen(state);
    };
    initSidebarState();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen border-l w-[400px]">
      <div className="border-b p-4 flex items-center justify-between shrink-0">
        <h2 className="font-semibold">AI Assistant</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleRightSidebar()}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTransactionModalOpen(true)}
          className="absolute bottom-2 right-2 text-xs"
        >
          Add Transaction
        </Button>
      </ScrollArea>

      <div className="border-t p-4 shrink-0 relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>

      {/* {isTransactionModalOpen && (
        <TransactionModal
          open={isTransactionModalOpen}
          onOpenChange={setIsTransactionModalOpen}
        />
      )} */}
    </div>
  );
}
