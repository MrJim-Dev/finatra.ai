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
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categoryView: CategoryView[];
  portId: string;
}

export function TransactionModal({
  open,
  onOpenChange,
  accounts,
  categoryView,
  portId,
}: TransactionModalProps) {
  const supabase = createClient();
  const [selectedType, setSelectedType] = useState<
    'income' | 'expense' | 'transfer'
  >('income');
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transactionSchema = z
    .object({
      date: z.string().default(() => new Date().toISOString().split('T')[0]),
      amount: z.string().min(1, 'Amount is required'),
      category: z.string().min(1, 'Category is required'),
      account: z.string().min(1, 'Account is required'),
      to: z.string().optional(),
      note: z
        .string()
        .max(100, 'Note must be less than 100 characters')
        .optional(),
      description: z
        .string()
        .max(500, 'Description must be less than 500 characters')
        .optional(),
    })
    .refine(
      (data) => {
        if (selectedType === 'transfer') {
          return !!data.to;
        }
        return true;
      },
      {
        message: 'Destination account is required for transfers',
        path: ['to'],
      }
    );

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      account: '',
      to: '',
      note: '',
      description: '',
    },
  });

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
      };

      if (selectedType === 'transfer') {
        const { data: result, error } = await supabase
          .from('transactions')
          .insert({
            ...transactionData,
            account_id: account,
            to_account_id: to,
            category: null,
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Transfer has been created successfully',
        });
      } else {
        const { data: result, error } = await supabase
          .from('transactions')
          .insert({
            ...transactionData,
            account_id: account,
            category: category,
            to_account_id: null,
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Success',
          description: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} transaction has been created successfully`,
        });
      }

      // Close modal and reset form on success
      onOpenChange(false);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to create transaction. Please try again.',
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
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs
              defaultValue="income"
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
                  <span className="mr-2">Creating...</span>
                  {/* Optional: Add a loading spinner component here */}
                </>
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
  // Transform categories into the format expected by MultiLevelSelect
  const transformCategories = (cats: Category[]): Option[] => {
    return cats.map((cat) => ({
      label: cat.name,
      value: cat.id.toString(), // Convert id to string
      children:
        cat.subcategories && cat.subcategories.length > 0
          ? transformCategories(cat.subcategories)
          : undefined,
    }));
  };

  const categoryOptions = transformCategories(categories);

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

      <div className="space-y-2">
        <Label htmlFor="transfer-note">Note</Label>
        <Input id="transfer-note" placeholder="Add a note" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transfer-description">Description</Label>
        <Textarea id="transfer-description" placeholder="Add a description" />
      </div>
    </div>
  );
}
