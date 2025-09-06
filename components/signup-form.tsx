'use client';

import { buttonVariants } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from './ui/use-toast';
import { signUp } from '@/lib/auth-client';
import { useSearchParams, useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc'; // Import the Google icon

export const userAuthSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof userAuthSchema>;

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SignUpForm({ className, ...props }: UserAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const form = useForm<FormData>({
    resolver: zodResolver(userAuthSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isGitHubLoading, setIsGitHubLoading] = React.useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    const { data: result, error } = await signUp(
      data.email,
      data.password,
      data.firstName,
      data.lastName
    );

    if (error) {
      return toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: error,
      });
    }

    
    toast({
      title: 'Success!',
      description: 'Your account has been created successfully.',
    });

    const next = searchParams.get('next') || '/dashboard';
    window.location.href = next;
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-col">
                        <label
                          htmlFor="firstName"
                          className="mb-1 text-sm font-medium"
                        >
                          First Name
                        </label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          disabled={
                            isLoading || isGitHubLoading || isGoogleLoading
                          }
                          {...field}
                        />
                      </div>
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
                    <FormControl>
                      <div className="flex flex-col">
                        <label
                          htmlFor="lastName"
                          className="mb-1 text-sm font-medium"
                        >
                          Last Name
                        </label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          disabled={
                            isLoading || isGitHubLoading || isGoogleLoading
                          }
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col">
                      <label
                        htmlFor="email"
                        className="mb-1 text-sm font-medium"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        placeholder="name@example.com"
                        type="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        disabled={
                          isLoading || isGitHubLoading || isGoogleLoading
                        }
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col">
                      <label
                        htmlFor="password"
                        className="mb-1 text-sm font-medium"
                      >
                        Password
                      </label>
                      <Input
                        id="password"
                        placeholder="Enter your password"
                        type="password"
                        disabled={
                          isLoading || isGitHubLoading || isGoogleLoading
                        }
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button
              type="submit"
              className={cn(buttonVariants())}
              disabled={isLoading || isGitHubLoading || isGoogleLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </button>
          </div>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'outline' }))}
          disabled
        >
          <GitHubLogoIcon className="mr-2 h-4 w-4" />
          GitHub
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'outline' }))}
          disabled
        >
          <FcGoogle className="mr-2 h-4 w-4" />
          Google
        </button>
      </div>
    </div>
  );
}



