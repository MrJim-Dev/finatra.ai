'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm, UseFormReturn } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/button';
import MultiLevelSelect from '@/components/ui/custom/multi-level-select';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import type { Account, Category, CategoryView, Option } from '@/types';

// Define Transaction type
interface Transaction {
  id: string;
  transaction_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'income' | 'expense' | 'transfer';
  note: string;
  description: string;
  currency?: string | null;
  account: {
    account_id: string;
    account_name: string;
    account_description: string;
    currency?: string | null;
    in_total?: boolean | null;
    hidden?: boolean | null;
  };
  category: string;
  portfolio: {
    portfolio_id: string;
    portfolio_title: string;
    portfolio_icon: string;
  };
  deleted_at?: string | null;
  amount_in_account_currency?: number | null;
  mm_meta?: Record<string, unknown> | null;
  to_account_id?: string | null;
}

const transactionSchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  amount: z.string().min(1, 'Amount is required'),
  category: z.string().optional(),
  account: z.string().min(1, 'Account is required'),
  to: z.string().optional(),
  bookAmount: z.string().optional().or(z.literal('')),
  note: z
    .string()
    .max(100, 'Note must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categoryView: CategoryView[];
  portId: string;
  editingTransaction?: Transaction;
  onTransactionChange?: () => Promise<void>;
  defaultType?: 'income' | 'expense' | 'transfer';
  defaultValues?: {
    amount?: number;
    category?: string;
    account?: string;
    to_account?: string;
    note?: string;
    description?: string;
  };
}

export function TransactionModal({
  open,
  onOpenChange,
  accounts,
  categoryView,
  portId,
  editingTransaction,
  onTransactionChange,
  defaultType,
  defaultValues,
}: TransactionModalProps) {
  const supabase = createClient();
  const [selectedType, setSelectedType] = useState<
    'income' | 'expense' | 'transfer'
  >(defaultType || editingTransaction?.transaction_type || 'income');
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allTags, setAllTags] = useState<{ tag_id: string; name: string }[]>(
    []
  );
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [archived, setArchived] = useState(false);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date:
        editingTransaction?.transaction_date.split('T')[0] ||
        new Date().toISOString().split('T')[0],
      amount:
        defaultValues?.amount?.toString() ||
        editingTransaction?.amount.toString() ||
        '',
      category: defaultValues?.category || editingTransaction?.category || '',
      account:
        defaultValues?.account || editingTransaction?.account.account_id || '',
      to: defaultValues?.to_account || '',
      bookAmount:
        editingTransaction?.amount_in_account_currency != null
          ? String(editingTransaction.amount_in_account_currency)
          : '',
      note: defaultValues?.note || editingTransaction?.note || '',
      description:
        defaultValues?.description || editingTransaction?.description || '',
    },
  });

  useEffect(() => {
    if (!open || !portId) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb
        .from('tags')
        .select('tag_id, name')
        .eq('port_id', portId)
        .order('name');
      setAllTags((data ?? []) as { tag_id: string; name: string }[]);
    })();
  }, [open, portId]);

  useEffect(() => {
    if (!open) {
      setTagIds([]);
      setArchived(false);
      return;
    }
    if (!editingTransaction?.transaction_id) {
      setTagIds([]);
      setArchived(false);
      return;
    }
    setArchived(!!editingTransaction.deleted_at);
    (async () => {
      const sb = createClient();
      const { data } = await sb
        .from('transaction_tags')
        .select('tag_id')
        .eq('transaction_id', editingTransaction.transaction_id);
      setTagIds((data ?? []).map((r) => r.tag_id as string));
    })();
  }, [open, editingTransaction?.transaction_id, editingTransaction?.deleted_at]);

  // Reset form when editingTransaction or defaultValues changes
  useEffect(() => {
    if (editingTransaction) {
      form.reset({
        date: editingTransaction.transaction_date.split('T')[0],
        amount: editingTransaction.amount.toString(),
        category: editingTransaction.category,
        account: editingTransaction.account.account_id,
        to: editingTransaction.to_account_id ?? '',
        bookAmount:
          editingTransaction.amount_in_account_currency != null
            ? String(editingTransaction.amount_in_account_currency)
            : '',
        note: editingTransaction.note,
        description: editingTransaction.description,
      });
      setSelectedType(editingTransaction.transaction_type);
    } else if (defaultValues) {
      form.reset({
        date: new Date().toISOString().split('T')[0],
        amount:
          defaultValues.amount != null
            ? String(defaultValues.amount)
            : '',
        category: defaultValues.category || '',
        account: defaultValues.account || '',
        to: defaultValues.to_account || '',
        bookAmount: '',
        note: defaultValues.note || '',
        description: defaultValues.description || '',
      });
      if (defaultType) {
        setSelectedType(defaultType);
      }
    }
  }, [editingTransaction, defaultValues, defaultType, form]);

  async function syncTagsForTransaction(txId: string) {
    await supabase.from('transaction_tags').delete().eq('transaction_id', txId);
    if (tagIds.length > 0) {
      const { error } = await supabase.from('transaction_tags').insert(
        tagIds.map((tag_id) => ({ transaction_id: txId, tag_id }))
      );
      if (error) throw error;
    }
  }

  const onSubmit = async (data: z.infer<typeof transactionSchema>) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { date, amount, category, account, to, note, description, bookAmount } =
        data;

      const bookRaw = bookAmount?.trim();
      const bookNum = bookRaw ? parseFloat(bookRaw.replace(/,/g, '')) : NaN;
      const amount_in_account_currency =
        Number.isFinite(bookNum) && bookNum > 0 ? bookNum : null;

      const deleted_at = archived
        ? editingTransaction?.deleted_at ?? new Date().toISOString()
        : null;

      const transactionData = {
        transaction_date: new Date(date).toISOString(),
        amount: parseFloat(amount),
        note: note || null,
        description: description || null,
        port_id: portId,
        transaction_type: selectedType,
        category:
          selectedType === 'transfer'
            ? 'Transfer'
            : (category?.trim() || 'Uncategorized'),
        account_id: account,
        to_account_id: selectedType === 'transfer' ? to || null : null,
        amount_in_account_currency,
        deleted_at,
      };

      if (editingTransaction) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id)
          .select('transaction_id')
          .single();

        if (updateError) throw updateError;
        await syncTagsForTransaction(editingTransaction.transaction_id);
      } else {
        const { data: createResult, error: createError } = await supabase
          .from('transactions')
          .insert(transactionData)
          .select('transaction_id')
          .single();

        if (createError) throw createError;
        const newId = createResult?.transaction_id as string | undefined;
        if (newId) await syncTagsForTransaction(newId);
      }

      if (onTransactionChange) {
        await onTransactionChange();
      }

      onOpenChange(false);
      form.reset();
      setTagIds([]);
      setArchived(false);

      toast({
        title: 'Success',
        description: editingTransaction
          ? 'Transaction updated successfully'
          : selectedType === 'transfer'
            ? 'Transfer has been created successfully'
            : `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} transaction has been created successfully`,
      });
    } catch (error) {
      console.error('Error with transaction:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingTransaction ? 'update' : 'create'} transaction. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter categories based on transaction type and port_id
  const getCategories = (type: 'income' | 'expense') => {
    const categoryData = categoryView.find(
      (cv) => cv.type === type && cv.port_id === portId
    );
    return categoryData?.categories || [];
  };

  const mmBlock =
    editingTransaction?.mm_meta &&
    typeof editingTransaction.mm_meta === 'object' &&
    Object.keys(editingTransaction.mm_meta).length > 0
      ? editingTransaction.mm_meta
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>
            {editingTransaction ? 'Edit transaction' : 'New transaction'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <Tabs
              value={selectedType}
              defaultValue={selectedType}
              className="w-full"
              onValueChange={(value) =>
                setSelectedType(value as typeof selectedType)
              }
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
              </TabsList>
              <TabsContent value="income">
                <TransactionForm
                  type="income"
                  form={form}
                  accounts={accounts}
                  categories={getCategories('income')}
                />
              </TabsContent>
              <TabsContent value="expense">
                <TransactionForm
                  type="expense"
                  form={form}
                  accounts={accounts}
                  categories={getCategories('expense')}
                />
              </TabsContent>
              <TabsContent value="transfer">
                <TransferForm form={form} accounts={accounts} />
              </TabsContent>
            </Tabs>

            <div className="space-y-4 border-t pt-4">
              <FormField
                control={form.control}
                name="bookAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Book amount (account currency)</FormLabel>
                    <FormDescription>
                      Optional. Use when the transaction currency differs from the
                      account ledger (e.g. imports with FX).
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Same as amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm">Archived</Label>
                  <p className="text-muted-foreground text-xs">
                    Hidden from the main activity list; totals ignore archived
                    rows.
                  </p>
                </div>
                <Switch checked={archived} onCheckedChange={setArchived} />
              </div>

              {allTags.length > 0 && (
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <p className="text-muted-foreground text-xs">
                    Tap to toggle. Manage the full list in Settings → Tags.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((t) => {
                      const on = tagIds.includes(t.tag_id);
                      return (
                        <Badge
                          key={t.tag_id}
                          variant={on ? 'default' : 'outline'}
                          className="cursor-pointer px-2.5 py-1 font-normal transition-opacity hover:opacity-90"
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setTagIds((prev) =>
                              prev.includes(t.tag_id)
                                ? prev.filter((x) => x !== t.tag_id)
                                : [...prev, t.tag_id]
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setTagIds((prev) =>
                                prev.includes(t.tag_id)
                                  ? prev.filter((x) => x !== t.tag_id)
                                  : [...prev, t.tag_id]
                              );
                            }
                          }}
                        >
                          {t.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {mmBlock ? (
                <Collapsible>
                  <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left text-xs font-medium">
                    <ChevronDown className="size-4" />
                    Import metadata (read-only)
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="bg-muted mt-2 max-h-36 overflow-auto rounded-md p-3 text-[10px] leading-relaxed">
                      {JSON.stringify(mmBlock, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
            </div>

            <div className="border-t bg-muted/20 px-6 py-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="mr-2">
                    {editingTransaction ? 'Updating...' : 'Creating...'}
                  </span>
                </>
              ) : editingTransaction ? (
                'Save changes'
              ) : (
                'Create transaction'
              )}
            </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  type,
  form,
  accounts,
  categories,
}: {
  type: 'income' | 'expense';
  form: UseFormReturn<z.infer<typeof transactionSchema>>;
  accounts: Account[];
  categories: Category[];
}) {
  // Transform categories to create path-based values
  const transformCategories = (cats: Category[], parentPath = ''): Option[] => {
    return cats.map((cat) => {
      const currentPath = parentPath ? `${parentPath}/${cat.name}` : cat.name;
      return {
        label: cat.name,
        value: currentPath,
        children:
          cat.subcategories && cat.subcategories.length > 0
            ? transformCategories(cat.subcategories, currentPath)
            : undefined,
      };
    });
  };

  const categoryOptions = transformCategories(categories);

  // Get the current category value from the form
  const categoryValue = form.watch('category');

  // Update category selection when form loads with a value
  useEffect(() => {
    if (categoryValue) {
      // The category value might be a path like "Parent/Child/Grandchild"
      // We'll use it as is since our MultiLevelSelect now expects the full path
      form.setValue('category', categoryValue);
    }
  }, [categoryValue, form]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="account"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
              }}
              value={field.value || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account">
                    {field.value
                      ? accounts.find(
                          (account) => account.account_id === field.value
                        )?.name
                      : 'Select account'}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem
                    key={account.account_id}
                    value={account.account_id}
                  >
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <FormControl>
              <MultiLevelSelect
                options={categoryOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select category"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note</FormLabel>
            <FormControl>
              <Input
                placeholder="Add a note (optional)"
                {...field}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    field.onChange(e);
                  }
                }}
              />
            </FormControl>
            <FormDescription>
              {field.value?.length || 0}/100 characters
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Add a description (optional)"
                {...field}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    field.onChange(e);
                  }
                }}
              />
            </FormControl>
            <FormDescription>
              {field.value?.length || 0}/500 characters
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function TransferForm({
  form,
  accounts,
}: {
  form: UseFormReturn<z.infer<typeof transactionSchema>>;
  accounts: Account[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="account"
        render={({ field }) => (
          <FormItem>
            <FormLabel>From</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue>
                    {field.value
                      ? accounts.find(
                          (account) => account.account_id === field.value
                        )?.name
                      : 'Select account'}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem
                    key={account.account_id}
                    value={account.account_id}
                  >
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="to"
        render={({ field }) => (
          <FormItem>
            <FormLabel>To</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue>
                    {field.value
                      ? accounts.find(
                          (account) => account.account_id === field.value
                        )?.name
                      : 'Select account'}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem
                    key={account.account_id}
                    value={account.account_id}
                  >
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note</FormLabel>
            <FormControl>
              <Input
                placeholder="Add a note (optional)"
                {...field}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    field.onChange(e);
                  }
                }}
              />
            </FormControl>
            <FormDescription>
              {field.value?.length || 0}/100 characters
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Add a description (optional)"
                {...field}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    field.onChange(e);
                  }
                }}
              />
            </FormControl>
            <FormDescription>
              {field.value?.length || 0}/500 characters
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
