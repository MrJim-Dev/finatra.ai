'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Toaster } from '../ui/toaster';
import { ToastAction } from '@radix-ui/react-toast';
import NewsletterForm from '../newsletter-form';

const dynamicData = {
  logo: {
    src: '',
    alt: 'Featurize',
  },
  title: 'Give Your Users a Voice and Elevate Your Product!',
  descriptions: [
    'Listen to your users like never before. Featurize is the ultimate platform that enables startups, software developers, and businesses to seamlessly set up a feature request system. Give your users a voice, gather valuable insights, and prioritize features that truly matter',
    'Stay ahead of the curve with a tool designed to transform user feedback into actionable enhancements, helping you build a product that your users will love.',
  ],
  inputPlaceholder: 'Enter your email',
  buttonText: 'Notify Me',
  footerText:
    'Get notified when we launch and be the first to experience Featurize!',
  socialLinks: {
    twitter: 'https://x.com/MrJim_Dev',
    instagram: '',
    facebook: '',
    linkedin: '',
    github: '#',
    discord: '',
  },
};

const supabase = createClient();

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <Toaster />
      <div className="container max-w-4xl px-4 py-12 space-y-10">
        <div className="flex justify-center ">
          <Link href="#" prefetch={false} className="flex gap-2 items-center">
            {dynamicData.logo.src && (
              <img
                className="h-10 w-10"
                src={dynamicData.logo.src}
                alt={dynamicData.logo.alt}
              />
            )}

            <p className="text-2xl font-bold">{dynamicData.logo.alt}</p>
          </Link>
        </div>
        <div className="space-y-8 text-center">
          <h1 className="text-6xl font-bold tracking-tight">
            {dynamicData.title}
          </h1>
          {dynamicData.descriptions.map((desc, index) => (
            <p key={index} className="text-muted-foreground text-lg">
              {desc}
            </p>
          ))}
          <NewsletterForm />
          <p className="text-lg">{dynamicData.footerText}</p>
        </div>
        <div className="flex justify-center gap-4">
          {dynamicData.socialLinks.twitter && (
            <Link
              href={dynamicData.socialLinks.twitter}
              className="text-muted-foreground hover:text-foreground"
              prefetch={false}
            >
              <TwitterIcon className="h-6 w-6" />
              <span className="sr-only">Twitter</span>
            </Link>
          )}
          {dynamicData.socialLinks.instagram && (
            <Link
              href={dynamicData.socialLinks.instagram}
              className="text-muted-foreground hover:text-foreground"
              prefetch={false}
            >
              <InstagramIcon className="h-6 w-6" />
              <span className="sr-only">Instagram</span>
            </Link>
          )}
          {dynamicData.socialLinks.facebook && (
            <Link
              href={dynamicData.socialLinks.facebook}
              className="text-muted-foreground hover:text-foreground"
              prefetch={false}
            >
              <FacebookIcon className="h-6 w-6" />
              <span className="sr-only">Facebook</span>
            </Link>
          )}

          {dynamicData.socialLinks.linkedin && (
            <Link
              href={dynamicData.socialLinks.linkedin}
              className="text-muted-foreground hover:text-foreground"
              prefetch={false}
            >
              <LinkedinIcon className="h-6 w-6" />
              <span className="sr-only">LinkedIn</span>
            </Link>
          )}

          {dynamicData.socialLinks.github && (
            <Link
              href={dynamicData.socialLinks.github}
              className="text-muted-foreground hover:text-foreground"
              prefetch={false}
            >
              <GithubIcon className="h-6 w-6" />
              <span className="sr-only">Github</span>
            </Link>
          )}

          {dynamicData.socialLinks.discord && (
            <Link
              href={dynamicData.socialLinks.discord}
              className="text-muted-foreground hover:text-foreground"
              prefetch={false}
            >
              <DiscIcon className="h-6 w-6" />
              <span className="sr-only">Discord</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function FacebookIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function GithubIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function InstagramIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function MountainIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function TwitterIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}
