import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCHF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "CHF 0.00";
  return `CHF ${amount.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(percent: number | null | undefined): string {
  if (percent === null || percent === undefined || isNaN(percent)) return "0.0 %";
  return `${percent.toLocaleString("de-CH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}
