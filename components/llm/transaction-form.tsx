'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0, 'Amount must be greater than or equal to 0'),
  category: z.string().min(1, 'Category is required'),
  account: z.string().min(1, 'Account is required'),
  note: z.string().optional()
})

type Transaction = z.infer<typeof transactionSchema>

export function TransactionForm({
  uid = '',
  account_id = '28823fa6-4187-4d4d-b542-f9912ce286ab',
  transaction_date = new Date().toISOString().split('T')[0],
  note = '',
  category = '',
  amount = 0,
  transaction_type = 'income'
}: {
  uid: string
  account_id: string
  transaction_date: string
  note: string
  category: string
  amount: number
  transaction_type: string
}) {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>(
    transaction_type as 'income' | 'expense'
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<Transaction>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: transaction_date,
      amount,
      category,
      account: account_id,
      note
    }
  })

  const onSubmit = async (data: Transaction) => {
    const { error } = await supabase
      .from('transactions')
      .insert([
        {
          account_id: data.account,
          transaction_date: data.date,
          note: data.note,
          category: data.category,
          amount: data.amount,
          transaction_type: activeTab
        }
      ])
      .select()
      .single()

    // ! Update Streamed UIState that it was successful.

    if (error) {
      console.error('Error inserting transaction:', error.message)
    } else {
      console.log('Transaction inserted successfully')
    }
  }

  return (
    <Tabs
      defaultValue={transaction_type}
      className="w-[400px]"
      onValueChange={value => setActiveTab(value as 'income' | 'expense')}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="income">Income</TabsTrigger>
        <TabsTrigger value="expense">Expense</TabsTrigger>
      </TabsList>
      <TabsContent value="income">
        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
            <CardDescription>
              Record your income transaction here.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register('category')} />
                {errors.category && (
                  <p className="text-sm text-red-600">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="account">Account</Label>
                <Select
                  onValueChange={value => setValue('account', value)}
                  defaultValue={account_id || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="28823fa6-4187-4d4d-b542-f9912ce286ab">
                      Maya
                    </SelectItem>
                    <SelectItem value="703237ce-f93e-4ef7-b2a9-4bd3c69e0d7d">
                      GCash
                    </SelectItem>
                    <SelectItem value="c5be1e3b-6453-46f4-ade7-de5e24a166fd">
                      PayPal
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.account && (
                  <p className="text-sm text-red-600">
                    {errors.account.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="note">note</Label>
                <Input id="note" {...register('note')} />
                {errors.note && (
                  <p className="text-sm text-red-600">{errors.note.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">Save Income</Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      <TabsContent value="expense">
        <Card>
          <CardHeader>
            <CardTitle>Expense</CardTitle>
            <CardDescription>
              Record your expense transaction here.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register('category')} />
                {errors.category && (
                  <p className="text-sm text-red-600">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="account">Account</Label>
                <Select
                  onValueChange={value => setValue('account', value)}
                  defaultValue={account_id || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="28823fa6-4187-4d4d-b542-f9912ce286ab">
                      Maya
                    </SelectItem>
                    <SelectItem value="703237ce-f93e-4ef7-b2a9-4bd3c69e0d7d">
                      GCash
                    </SelectItem>
                    <SelectItem value="c5be1e3b-6453-46f4-ade7-de5e24a166fd">
                      PayPal
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.account && (
                  <p className="text-sm text-red-600">
                    {errors.account.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="note">note</Label>
                <Input id="note" {...register('note')} />
                {errors.note && (
                  <p className="text-sm text-red-600">{errors.note.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">Save Expense</Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
