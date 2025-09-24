import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// Format currency input with real-time thousands separators
export function formatCurrencyInput(value: string): string {
  // Remove all non-digit characters
  const numericValue = value.replace(/\D/g, '');
  
  // If empty, return empty string
  if (!numericValue) return '';
  
  // Parse and format with thousands separators using dot (.)
  const number = parseInt(numericValue);
  return number.toLocaleString('id-ID');
}

// Parse formatted currency input back to number
export function parseCurrencyInput(formattedValue: string): number {
  // Remove all non-digit characters and parse
  const numericValue = formattedValue.replace(/\D/g, '');
  return numericValue ? parseInt(numericValue) : 0;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function getStockStatus(current: number, min: number, max: number): 'critical' | 'low' | 'sufficient' {
  const percentage = (current / max) * 100;
  if (percentage <= 15) return 'critical';
  if (percentage <= 35) return 'low';
  return 'sufficient';
}

export function getStockColor(status: 'critical' | 'low' | 'sufficient'): string {
  switch (status) {
    case 'critical': return 'bg-red-600';
    case 'low': return 'bg-yellow-600';
    case 'sufficient': return 'bg-green-600';
    default: return 'bg-gray-400';
  }
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'preparing': return 'bg-blue-100 text-blue-800';
    case 'ready': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
