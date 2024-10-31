'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../ui/use-toast';

const formSchema = z.object({
  comment_text: z.string().min(2, {
    message: 'comment must be at least 2 characters.',
  }),
});

export default function CommentForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment_text: '',
    },
  });

  const { toast } = useToast();
  const { reset } = form;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClient();

    const { comment_text } = values;

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        comment_text,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add comment',
        description: "We couldn't add your comment. Please try again.",
      });
      return;
    }

    toast({
      title: 'Comment added.',
      description: "We've added your comment to the project.",
    });

    reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex">
        <FormField
          control={form.control}
          name="comment_text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Comment here..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
