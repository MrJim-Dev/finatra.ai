'use server'
import { createClient } from '@/lib/supabase/server'
import { type Provider } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }) // Customizing the minimum length message
})

const signUpSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  first_name: z
    .string()
    .min(3, { message: 'First name must be at least 3 characters long' }), // Updated minimum length requirement
  last_name: z
    .string()
    .min(3, { message: 'Last name must be at least 3 characters long' }) // Updated minimum length requirement
})

function generateRandomUsername(length = 8) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return redirect('/')
}

export async function signInWithEmail(email: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      // set this to false if you do not want the user to be automatically signed up
      shouldCreateUser: false,
      emailRedirectTo: 'http://localhost:3000/'
    }
  })
}

export async function signInWithPassword(formData: FormData) {
  const result = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  })

  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message).join(', ')
    const errorParams = new URLSearchParams({ error: errors })
    return redirect(`/signin?${errorParams}`)
  }

  const { email, password } = result.data
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    const errorParams = new URLSearchParams({
      error: error.message || 'Invalid email or password'
    })
    return redirect(`/signin?${errorParams}`)
  }

  return redirect('/dashboard')
}

export async function signUp(formData: FormData) {
  const username = generateRandomUsername()
  const result = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name')
  })

  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message).join(', ')
    const errorParams = new URLSearchParams({ error: errors })
    return redirect(`/signup?${errorParams}`)
  }

  const { email, password, first_name, last_name } = result.data
  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name,
        last_name,
        username: generateRandomUsername()
      }
    }
  })

  if (error) {
    const errorParams = new URLSearchParams({
      error: error.message || 'Could not sign up'
    })
    return redirect(`/signup?${errorParams}`)
  }

  return redirect('/signup?success=Check your email to continue signing up.')
}

export async function signInWith(provider: Provider) {
  const origin = headers().get('origin')

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/api/auth/callback`
    }
  })

  if (error) {
    return redirect(
      `/signin?error=${error.message || 'Could not authenticate user'}`
    )
  }

  return redirect(data.url)
}

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
})

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email format.' })
})

export async function forgotPassword(formData: FormData) {
  const result = forgotPasswordSchema.safeParse({
    email: formData.get('email')
  })

  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message).join(', ')
    return redirect(`/forgot-password?error=${errors}`)
  }
  const { email } = result.data
  const origin = headers().get('origin')
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    return redirect(
      `/forgot-password?error=${error.message || 'Could not send email.'}`
    )
  }

  return redirect(
    `/forgot-password?success=Check your inbox for instructions to reset your password.`
  )
}

export async function resetPassword(formData: FormData) {
  const result = resetPasswordSchema.safeParse({
    password: formData.get('password')
  })

  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message).join(', ')
    return redirect(`/reset-password?error=${errors}`)
  }

  const { password } = result.data

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return redirect(
      `/reset-password?error=${error.message || 'Could not reset password.'}`
    )
  }

  return redirect('/dashboard?success=Password reset successfully.')
}
