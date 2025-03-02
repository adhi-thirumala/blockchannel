import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: number): string {
  try {
    return formatDistanceToNow(timestamp * 1000, { addSuffix: true });
  } catch (e) {
    return 'Unknown time';
  }
}

export function formatSolAmount(lamports: number): string {
  return (lamports / 1000000000).toFixed(4) + ' SOL';
}
