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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { getPortfolioBySlug, getActivePortfolioClient } from '@/lib/portfolio';
import { getPortfoliosClient } from '@/lib/api/finance';
import { createAccountGroupAuthenticated } from '@/lib/api/auth-proxy';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

interface NewGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  group_name: z.string().min(1, 'Group name is required'),
  group_type: z.enum(['default', 'credit']),
});

type FormValues = z.infer<typeof formSchema>;

export function NewGroupForm({ open, onOpenChange }: NewGroupFormProps) {
  const { slug } = useParams();

  const { toast } = useToast();

  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      group_name: '',
      group_type: 'default',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Get port_id from slug
      console.log('[NewGroupForm] submit -> slug:', slug);
      // Try cookie first for fast port_id resolution
      const cached = getActivePortfolioClient();
      console.log('[NewGroupForm] cookie portfolio:', cached);
      let portId: string | undefined = cached?.port_id;
      if (!portId) {
        const portfolio = await getPortfolioBySlug(slug as string);
        console.log('[NewGroupForm] resolved portfolio:', portfolio);
        portId = portfolio?.port_id;
      }

      if (!portId) {
        // Fallback to first portfolio if slug is missing or not found
        const list = await getPortfoliosClient();
        console.log(
          '[NewGroupForm] fallback portfolios length:',
          list?.data?.length ?? 0
        );
        portId = (list?.data?.[0]?.port_id as string) || '';
      }
      if (!portId) {
        console.error('[NewGroupForm] No portfolio found for group creation');
        toast({
          title: 'No portfolio',
          description: 'Create a portfolio first to add groups.',
          variant: 'destructive',
        });
        return;
      }

      await createAccountGroupAuthenticated({
        group_name: values.group_name,
        group_type: values.group_type,
        port_id: portId,
      });

      toast({
        title: 'Success',
        description: 'Account group created successfully',
      });

      onOpenChange(false);
      router.refresh();
      form.reset();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create account group',
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
          <DialogTitle>Create New Account Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="group_name">Account Group Name</Label>
            <Input
              {...form.register('group_name')}
              id="group_name"
              placeholder="Enter group name"
            />
            {form.formState.errors.group_name && (
              <p className="text-sm text-red-500">
                {form.formState.errors.group_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Group Type</Label>
            <RadioGroup
              defaultValue="default"
              onValueChange={(value) =>
                form.setValue('group_type', value as 'default' | 'credit')
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit">Account group for credit cards</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
