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
import { createTransaction as apiCreateTransaction, updateTransaction as apiUpdateTransaction } from '@/lib/api/finance';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import type { Account, Category, CategoryView, Option } from '@/types';

// Define Transaction type
interface Transaction {
  id: string;
  transaction_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  note: string;
  description: string;
  account: {
    account_id: string;
    account_name: string;
    account_description: string;
  };
  category: string;
  portfolio: {
    portfolio_id: string;
    portfolio_title: string;
    portfolio_icon: string;
  };
}

const transactionSchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  amount: z.string().min(1, 'Amount is required'),
  category: z.string().optional(),
  account: z.string().min(1, 'Account is required'),
  to: z.string().optional(),
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
    amount: number;
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
  
  const [selectedType, setSelectedType] = useState<
    'income' | 'expense' | 'transfer'
  >(defaultType || editingTransaction?.transaction_type || 'income');
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      note: defaultValues?.note || editingTransaction?.note || '',
      description:
        defaultValues?.description || editingTransaction?.description || '',
    },
  });

  // Reset form when editingTransaction or defaultValues changes
  useEffect(() => {
    if (editingTransaction) {
      form.reset({
        date: editingTransaction.transaction_date.split('T')[0],
        amount: editingTransaction.amount.toString(),
        category: editingTransaction.category,
        account: editingTransaction.account.account_id,
        to: '',
        note: editingTransaction.note,
        description: editingTransaction.description,
      });
      setSelectedType(editingTransaction.transaction_type);
    } else if (defaultValues) {
      form.reset({
        date: new Date().toISOString().split('T')[0],
        amount: defaultValues.amount.toString(),
        category: defaultValues.category || '',
        account: defaultValues.account || '',
        to: defaultValues.to_account || '',
        note: defaultValues.note || '',
        description: defaultValues.description || '',
      });
      if (defaultType) {
        setSelectedType(defaultType);
      }
    }
  }, [editingTransaction, defaultValues, defaultType, form]);

  const onSubmit = async (data: z.infer<typeof transactionSchema>) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { date, amount, category, account, to, note, description } = data;

      // Prepare base transaction data
      const transactionData = {
        transaction_date: new Date(date).toISOString(),
        amount: parseFloat(amount),
        note: note || null,
        description: description || null,
        port_id: portId,
        transaction_type: selectedType,
        category: selectedType === 'transfer' ? 'Transfer' : category,
        account_id: account,
        to_account_id: selectedType === 'transfer' ? to : null,
      };

      let result;
      if (editingTransaction) {
        // Update existing transaction
        const updateResult = await apiUpdateTransaction(editingTransaction.id, transactionData);

        result = updateResult;
      } else {
        // Create new transaction
        const createResult = await apiCreateTransaction(transactionData);

        result = createResult;
      }

      // Call the onTransactionChange callback if provided
      if (onTransactionChange) {
        await onTransactionChange();
      }

      // Close modal and reset form on success
      onOpenChange(false);
      form.reset();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="mr-2">
                    {editingTransaction ? 'Updating...' : 'Creating...'}
                  </span>
                  {/* Optional: Add a loading spinner component here */}
                </>
              ) : editingTransaction ? (
                'Update Transaction'
              ) : (
                'Create Transaction'
              )}
            </Button>
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

