'use client';
import React, { useState } from 'react'; // Add useState
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FileInput from '@/components/ui/custom/file-input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { UserData } from '@/lib/types/user';
import { createClient } from '@/lib/supabase/client';
import { toast } from './ui/use-toast';

const formSchema = z.object({
  profilePicture: z.any().nullable().optional(), // Allow any type for profilePicture
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

interface ProfileFormProps {
  userData: UserData;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ userData }) => {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profilePicture: userData.avatar,
      firstName: userData.first_name,
      lastName: userData.last_name,
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true); // Set loading state
    try {
      if (data.profilePicture instanceof File) {
        // Check if profilePicture is a File
        const fileName = `${userData.id}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, data.profilePicture, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { error: updateError } = await supabase
          .from('users')
          .update({
            avatar: filePath,
            first_name: data.firstName,
            last_name: data.lastName,
          })
          .eq('id', userData.id);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            avatar: data.profilePicture,
            first_name: data.firstName,
            last_name: data.lastName,
          })
          .eq('id', userData.id);

        console.log('error', updateError);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error updating profile: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="profilePicture"
          render={({ field }) => (
            <FileInput
              label="Profile Picture"
              id="profile-picture"
              value={field.value}
              onChange={field.onChange}
              description="Upload a profile picture"
              className="!rounded-full"
              existingImageUrl={userData?.avatar_url}
            />
          )}
        />
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
