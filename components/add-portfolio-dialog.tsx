import * as React from 'react';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PortfolioIconPicker } from './ui/portfolio-icon-picker';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormMessage } from '@/components/ui/form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { useRouter } from 'next/navigation';

const supabase = createClient();

interface AddPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const portfolioSchema = z.object({
  title: z.string().min(1, 'Portfolio title is required'),
  icon: z
    .object({
      type: z.enum(['icon', 'emoji']),
      value: z.string().min(1, 'Please select an icon'),
    })
    .refine((data) => data.value !== '', {
      message: 'Please select an icon',
      path: ['value'],
    }),
  color: z.string().min(1, 'Please select a color'),
});

type PortfolioFormValues = z.infer<typeof portfolioSchema>;

export function AddPortfolioDialog({
  open,
  onOpenChange,
}: AddPortfolioDialogProps) {
  const { toast } = useToast();

  const router = useRouter();

  const form = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      title: '',
      icon: { type: 'icon', value: 'RiAccountCircleFill' },
      color: '#ffffff',
    },
  });

  const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
    const slug = baseSlug
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const { data: existing } = await supabase
      .from('portfolio')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (!existing) return slug;
    return `${slug}-${nanoid(6)}`;
  };

  const onSubmit = async (data: PortfolioFormValues) => {
    try {
      // Generate unique slug
      const slug = await generateUniqueSlug(data.title);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if slug exists again (double-check for race conditions)
      const { data: existingSlug } = await supabase
        .from('portfolio')
        .select('slug')
        .eq('slug', slug)
        .single();

      // If slug exists, generate a new one with random characters
      const finalSlug = existingSlug ? `${slug}-${nanoid(6)}` : slug;

      // Insert portfolio
      const { error } = await supabase.from('portfolio').insert({
        user_id: user.id,
        title: data.title,
        icon: data.icon,
        color: data.color,
        slug: finalSlug,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Portfolio created successfully',
      });

      onOpenChange(false);

      router.refresh();
      form.reset();
    } catch (error) {
      console.log(error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create portfolio',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Portfolio</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormControl>
                        <PortfolioIconPicker
                          icon={form.watch('icon')}
                          color={form.watch('color')}
                          onIconChange={(icon) =>
                            form.setValue('icon', icon, {
                              shouldValidate: true,
                            })
                          }
                          onColorChange={(color) =>
                            form.setValue('color', color, {
                              shouldValidate: true,
                            })
                          }
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        Choose an icon and color
                      </span>
                      {form.formState.errors.icon && (
                        <FormMessage>
                          {form.formState.errors.icon.value?.message ||
                            'Please select an icon'}
                        </FormMessage>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      {form.formState.errors.color && (
                        <FormMessage>
                          {form.formState.errors.color.message}
                        </FormMessage>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter portfolio title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Creating...'
                  : 'Create Portfolio'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
