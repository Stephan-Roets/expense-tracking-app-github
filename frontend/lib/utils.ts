import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate SARS tax year based on current date
 * SARS tax year runs from March 1 to February 28/29 of the following year
 * @returns Object with tax year string and date range string
 */
export function getSarsTaxYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = January, 2 = March

  let startYear: number;
  let endYear: number;

  // If current month is January or February (0 or 1), tax year is previous year to current year
  // If current month is March or later (2+), tax year is current year to next year
  if (currentMonth < 2) {
    startYear = currentYear - 1;
    endYear = currentYear;
  } else {
    startYear = currentYear;
    endYear = currentYear + 1;
  }

  return {
    taxYear: `${startYear}/${endYear}`,
    dateRange: `Mar ${startYear} - Feb ${endYear}`,
  };
}
