'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { X } from 'lucide-react';
import { TransactionModal } from './transaction-modal';
import { useToast } from './ui/use-toast';
import {
  getAccountsByPortfolioAuthenticated,
  getCategoryHierarchyAuthenticated,
} from '@/lib/api/auth-proxy';
import { usePathname } from 'next/navigation';
import { Message } from 'ai';
import { useChat } from 'ai/react';
import type { TransactionRequest } from '@/types/chat';
import type { Account, CategoryView } from '@/types';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { useParams } from 'next/navigation';
import { useRightSidebar } from '@/lib/context/sidebar-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AIChatInterface() {
  const { isOpen, toggle } = useRightSidebar();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryView, setCategoryView] = useState<CategoryView[]>([]);
  const [transactionType, setTransactionType] = useState<
    'income' | 'expense' | 'transfer'
  >('expense');
  const [transactionDetails, setTransactionDetails] =
    useState<TransactionRequest | null>(null);
  const [portId, setPortId] = useState<string>('');
  const { toast } = useToast();
  const pathname = usePathname();
  const slug = pathname?.split('/').filter(Boolean)[1] || '';

  const { messages, input, handleInputChange, handleSubmit, setMessages } =
    useChat({
      api: '/api/chat',
      streamProtocol: 'text',
      onFinish: (message) => {
        // Check for transaction command in the complete message
        const text = message.content;
        if (text.includes('CREATE_TRANSACTION:')) {
          try {
            const jsonStr = text.split('CREATE_TRANSACTION:')[1].trim();
            const transaction = JSON.parse(jsonStr) as TransactionRequest;
            if (transaction.transaction_type) {
              setTransactionDetails({
                ...transaction,
                type: transaction.transaction_type,
                amount: Number(transaction.amount),
              });
              setTransactionType(transaction.transaction_type);
              setIsTransactionModalOpen(true);
            }
          } catch (error) {
            console.error('Error parsing transaction:', error);
            toast({
              title: 'Error',
              description: 'Failed to parse transaction details.',
              variant: 'destructive',
            });
          }
        }

        // Check for empty messages
        if (!text.trim()) {
          toast({
            title: 'Error',
            description: 'Received empty response from AI. Please try again.',
            variant: 'destructive',
          });
        }
      },
      onError: (error) => {
        console.error('Chat error:', error);
        toast({
          title: 'Error',
          description:
            'An error occurred while sending your message. Please try again.',
          variant: 'destructive',
        });
      },
    });

  useEffect(() => {
    const initPortfolio = async () => {
      if (slug) {
        const portfolio = await getPortfolioBySlug(slug);
        if (portfolio) {
          setPortId(portfolio.port_id);
        }
      }
    };
    initPortfolio();
  }, [slug]);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!portId) return;
      const accountsRes = await getAccountsByPortfolioAuthenticated(portId);
      const { data } = accountsRes as any;
      if (data) {
        setAccounts(data as any);
      }
      const [income, expense] = await Promise.all([
        getCategoryHierarchyAuthenticated(portId, 'income'),
        getCategoryHierarchyAuthenticated(portId, 'expense'),
      ]);
      setCategoryView([
        { type: 'income', port_id: portId, categories: (income as any) || [] },
        {
          type: 'expense',
          port_id: portId,
          categories: (expense as any) || [],
        },
      ] as any);
    };

    fetchAccounts();
  }, [portId]);

  const handleTransactionComplete = async () => {
    setIsTransactionModalOpen(false);
    setTransactionDetails(null);
    toast({
      title: 'Transaction created',
      description: 'Your transaction has been recorded successfully.',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="w-[400px] border-l flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
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
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
                    components={{
                      p: ({ children }: any) => (
                        <p className="mb-2 last:mb-0">{children}</p>
                      ),
                      code: ({
                        node,
                        inline,
                        className,
                        children,
                        ...props
                      }: any) => {
                        if (inline) {
                          return (
                            <code
                              className="rounded bg-muted px-1 py-0.5"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                        return (
                          <pre className="mb-2 mt-2 overflow-auto rounded-lg bg-muted p-4">
                            <code className="bg-transparent p-0" {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>

      {isTransactionModalOpen && transactionDetails && portId && (
        <TransactionModal
          open={isTransactionModalOpen}
          onOpenChange={setIsTransactionModalOpen}
          accounts={accounts}
          categoryView={categoryView}
          portId={portId}
          defaultType={transactionType}
          defaultValues={transactionDetails}
          onTransactionChange={handleTransactionComplete}
        />
      )}
    </div>
  );
}
