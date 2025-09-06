'use client';

import { Button } from '@/components/ui/button';
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
import { useToast } from '@/components/ui/use-toast';
import { getPortfolioBySlug, getActivePortfolioClient } from '@/lib/portfolio';
import { getPortfoliosClient } from '@/lib/api/finance';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import {
  getAccountGroupsByPortfolioAuthenticated,
  createAccountAuthenticated,
} from '@/lib/api/auth-proxy';

interface NewAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AccountGroup {
  group_id: string;
  group_name: string;
}

const formSchema = z.object({
  group_id: z.string().min(1, 'Group is required'),
  name: z.string().min(1, 'Account name is required'),
  amount: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : 0)),
  in_total: z.boolean().optional().default(true),
  hidden: z.boolean().optional().default(false),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function NewAccountForm({ open, onOpenChange }: NewAccountFormProps) {
  const { slug } = useParams();
  const { toast } = useToast();
  const router = useRouter();
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      amount: 0,
      in_total: true,
      hidden: false,
      description: '',
    },
  });

  useEffect(() => {
    async function fetchAccountGroups() {
      try {
        console.log('[NewAccountForm] open -> slug:', slug);
        const cached = getActivePortfolioClient();
        console.log('[NewAccountForm] cookie portfolio:', cached);
        let portId = cached?.port_id as string | undefined;
        if (!portId) {
          const portfolio = await getPortfolioBySlug(slug as string);
          console.log('[NewAccountForm] resolved portfolio:', portfolio);
          portId = portfolio?.port_id;
        }
        if (!portId) {
          const list = await getPortfoliosClient();
          console.log(
            '[NewAccountForm] fallback portfolios length:',
            list?.data?.length ?? 0
          );
          portId = (list?.data?.[0]?.port_id as string) || '';
        }
        if (!portId) throw new Error('Portfolio not found');

        const res = await getAccountGroupsByPortfolioAuthenticated(portId);
        setAccountGroups((res?.data as any[]) || []);
      } catch (error) {
        console.error('Error fetching account groups:', error);
        toast({
          title: 'Error',
          description: 'Failed to load account groups',
          variant: 'destructive',
        });
      }
    }

    if (open) {
      fetchAccountGroups();
    }
  }, [open, slug, toast]);

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const cached = getActivePortfolioClient();
      console.log('[NewAccountForm] submit -> cookie portfolio:', cached);
      let portId = cached?.port_id as string | undefined;
      if (!portId) {
        const portfolio = await getPortfolioBySlug(slug as string);
        console.log('[NewAccountForm] submit -> portfolio:', portfolio);
        portId = portfolio?.port_id;
      }
      if (!portId) {
        const list = await getPortfoliosClient();
        console.log(
          '[NewAccountForm] submit fallback portfolios length:',
          list?.data?.length ?? 0
        );
        portId = (list?.data?.[0]?.port_id as string) || '';
      }
      if (!portId) {
        console.error(
          '[NewAccountForm] No portfolio found for account creation'
        );
        toast({
          title: 'No portfolio',
          description: 'Create a portfolio first to add accounts.',
          variant: 'destructive',
        });
        return;
      }

      await createAccountAuthenticated({
        name: values.name,
        description: values.description,
        group_id: values.group_id,
        port_id: portId,
        amount:
          typeof values.amount === 'number'
            ? values.amount
            : Number(values.amount || 0),
        in_total: values.in_total ?? true,
        hidden: values.hidden ?? false,
      });

      toast({ title: 'Success', description: 'Account created successfully' });

      onOpenChange(false);
      router.refresh();
      methods.reset();
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error',
        description: 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Select
                onValueChange={(value) => methods.setValue('group_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {accountGroups.map((group) => (
                    <SelectItem key={group.group_id} value={group.group_id}>
                      {group.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {methods.formState.errors.group_id && (
                <p className="text-sm text-red-500">
                  {methods.formState.errors.group_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                {...methods.register('name')}
                id="name"
                placeholder="Enter account name"
              />
              {methods.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {methods.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Initial Amount</Label>
              <Input
                {...methods.register('amount')}
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              {methods.formState.errors.amount && (
                <p className="text-sm text-red-500">
                  {methods.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                {...methods.register('description')}
                id="description"
                placeholder="Enter account description"
                className="h-24"
              />
              {methods.formState.errors.description && (
                <p className="text-sm text-red-500">
                  {methods.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  id="in_total"
                  type="checkbox"
                  checked={methods.watch('in_total')}
                  onChange={(e) =>
                    methods.setValue('in_total', e.target.checked)
                  }
                />
                <label htmlFor="in_total" className="text-sm">
                  Include in totals
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="hidden"
                  type="checkbox"
                  checked={methods.watch('hidden')}
                  onChange={(e) => methods.setValue('hidden', e.target.checked)}
                />
                <label htmlFor="hidden" className="text-sm">
                  Hidden
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
