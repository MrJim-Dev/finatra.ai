'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { ToastAction } from '@radix-ui/react-toast';

const supabase = createClient();

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const notifyMe = async () => {
    if (!email) {
      toast({
        description: 'Please enter your email address.',
      });
      return;
    }

    // Email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        description: 'Please enter a valid email address.',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .insert([{ email: email }])
        .select();

      if (!error) {
        toast({
          description: "You've been added to our newsletter.",
        });
        setEmail(''); // Clear the input field
      } else if (error.code == '23505') {
        toast({
          description: 'Email is already subscribed to our newsletter.',
        });
      } else {
        toast({
          description:
            'Something went wrong while trying to subscribe you to our newsletter.',
        });
      }
    } catch (error) {
      console.error('Error subscribing to the newsletter:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was an error. Please try again later.',
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    }
  };

  return (
    <div className="flex gap-2 max-w-md mx-auto">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
      />
      <Button onClick={notifyMe}>Notify Me</Button>
    </div>
  );
}
