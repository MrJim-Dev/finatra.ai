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

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const transactionSchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  amount: z.string().min(1, 'Amount is required'),
  category: z.string().optional(),
  account: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  note: z.string().max(100, 'Note must be less than 100 characters').optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export function TransactionModal({
  open,
  onOpenChange,
}: TransactionModalProps) {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      account: '',
      from: '',
      to: '',
      note: '',
      description: '',
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    console.log(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="income" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
              </TabsList>
              <TabsContent value="income">
                <TransactionForm type="income" form={form} />
              </TabsContent>
              <TabsContent value="expense">
                <TransactionForm type="expense" form={form} />
              </TabsContent>
              <TabsContent value="transfer">
                <TransferForm form={form} />
              </TabsContent>
            </Tabs>
            <Button type="submit" className="w-full">
              Create Transaction
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
}: {
  type: 'income' | 'expense';
  form: UseFormReturn<TransactionFormData>;
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

      <div className="space-y-2">
        <Label htmlFor={`${type}-account`}>Account</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="account1">Account 1</SelectItem>
            <SelectItem value="account2">Account 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="category1">Category 1</SelectItem>
                <SelectItem value="category2">Category 2</SelectItem>
              </SelectContent>
            </Select>
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

function TransferForm({ form }: { form: UseFormReturn<TransactionFormData> }) {
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
        name="from"
        render={({ field }) => (
          <FormItem>
            <FormLabel>From</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="account1">Account 1</SelectItem>
                <SelectItem value="account2">Account 2</SelectItem>
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
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="account1">Account 1</SelectItem>
                <SelectItem value="account2">Account 2</SelectItem>
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
