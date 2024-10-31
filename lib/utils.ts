import { type ClassValue, clsx } from "clsx";
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
