import { type ClassValue, clsx } from "clsx";
import React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function dateAndTimeFormat(date: string) {
  const dateObj = new Date(date);
  return dateObj.toLocaleString();
}

export function capitalizeWords(str: string) {
  if (!str) return "No string found."
  
  return str
    .split(' ')      
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function trimString(str: string) {
  if(!str) return "No string found."

  return str.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // Replace invalid characters with hyphens
        .replace(/(^-|-$)/g, ''); // Remove leading or trailing hyphens
}

export function toLowerCase(str: string) {
  if (!str) return "No string found.";

  return str
    .toLowerCase()
    .trim()
    .split('-') // Split the string by hyphens
    .map(word => word.charAt(0) + word.slice(1))
    .join(' '); // Join the words back with spaces
}

export function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case 'open':
      return 'secondary';
    case 'in progress':
      return 'default';
    case 'completed':
      return 'outline';
    default:
      return 'default';
  }
}


const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}