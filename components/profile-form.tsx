'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from './ui/use-toast';
import { updateProfile } from '@/lib/api/auth';

// Minimal user shape for this form
interface ProfileUser {
  id: string;
  email: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

interface ProfileFormProps {
  userData: ProfileUser;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ userData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultFirst = userData.first_name || (userData.name ? userData.name.split(' ')[0] : '') || '';
  const defaultLast = userData.last_name || (userData.name ? userData.name.split(' ').slice(1).join(' ') : '') || '';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: defaultFirst,
      lastName: defaultLast,
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      await updateProfile({ name: fullName });

      toast({ title: 'Success', description: 'Profile updated successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error updating profile: ${error instanceof Error ? error.message : error}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...(form as any)}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter your first name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter your last name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input value={userData.email} disabled />
          </FormControl>
        </FormItem>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm;
