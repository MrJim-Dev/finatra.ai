'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'
import { IconGitHub, IconSpinner } from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'

interface LoginButtonProps extends ButtonProps {
  showGithubIcon?: boolean
  className?: string
  text?: string
}

export function LoginButton({
  text = 'Login with GitHub',
  showGithubIcon = true,
  className,
  ...props
}: LoginButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  // Create a Supabase client configured to use cookies
  const supabase = createClient()

  if (process.env.NEXT_PUBLIC_AUTH_GITHUB !== 'true') {
    return null
  }

  return (
    <Button
      variant="outline"
      onClick={async () => {
        setIsLoading(true)
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo: `${location.origin}/api/auth/callback` }
        })
      }}
      disabled={isLoading}
      className={cn(className)}
      {...props}
    >
      {isLoading ? (
        <IconSpinner className="mr-2 animate-spin" />
      ) : showGithubIcon ? (
        <IconGitHub className="mr-2" />
      ) : null}
      {text}
    </Button>
  )
}
