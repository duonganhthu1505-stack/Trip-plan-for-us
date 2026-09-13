import { TripStatus } from '../types';

/**
 * Parses YYYY-MM-DD safely into year, month (1-based), day without timezone shifting
 */
export function parseDateString(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || !dateStr.includes('-')) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Format YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateVN(dateStr?: string): string {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr || '---';
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  return `${dd}/${mm}/${parsed.year}`;
}

/**
 * Get today's date in YYYY-MM-DD using local time
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate trip duration in days
 */
export function calculateDurationDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  const pStart = parseDateString(startDate);
  const pEnd = parseDateString(endDate);
  if (!pStart || !pEnd) return 0;

  const startUtc = Date.UTC(pStart.year, pStart.month - 1, pStart.day);
  const endUtc = Date.UTC(pEnd.year, pEnd.month - 1, pEnd.day);

  if (endUtc < startUtc) return 0;
  const diffDays = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Determine trip status based on dates
 */
export function computeTripStatus(startDate?: string, endDate?: string): TripStatus {
  if (!startDate || !endDate) return 'Planning';
  const todayStr = getTodayDateString();

  if (todayStr < startDate) {
    return 'Upcoming';
  } else if (todayStr > endDate) {
    return 'Completed';
  } else {
    return 'Ongoing';
  }
}

/**
 * Days remaining until start date
 */
export function getDaysUntilTrip(startDate?: string): number | null {
  if (!startDate) return null;
  const pStart = parseDateString(startDate);
  if (!pStart) return null;

  const todayStr = getTodayDateString();
  const pToday = parseDateString(todayStr)!;

  const startUtc = Date.UTC(pStart.year, pStart.month - 1, pStart.day);
  const todayUtc = Date.UTC(pToday.year, pToday.month - 1, pToday.day);

  const diffDays = Math.round((startUtc - todayUtc) / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format currency in VND with readable grouping
 */
export function formatCurrency(amount: number, currency: string = '₫'): string {
  if (isNaN(amount)) return `0 ${currency}`;
  const formatted = Math.abs(amount).toLocaleString('vi-VN');
  if (amount < 0) {
    return `-${formatted} ${currency}`;
  }
  return `${formatted} ${currency}`;
}

/**
 * Format GAP with explicit sign
 */
export function formatGap(gap: number, currency: string = '₫'): { text: string; isOver: boolean; isUnder: boolean } {
  const isOver = gap > 0;
  const isUnder = gap < 0;
  const sign = isOver ? '+' : isUnder ? '-' : '';
  const absFormatted = Math.abs(gap).toLocaleString('vi-VN');
  return {
    text: `${sign}${absFormatted} ${currency}`,
    isOver,
    isUnder
  };
}

/**
 * Format a number with dot separator every 3 digits (e.g. 1000000 -> "1.000.000").
 * Returns empty string for 0, undefined, or empty to avoid unwanted '0' placeholders.
 */
export function formatNumberWithDots(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('vi-VN');
}

/**
 * Parse a dot-formatted number string back into a numeric value.
 */
export function parseNumberFromDots(val: string): number {
  if (!val) return 0;
  const digits = val.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Generate dates array between start and end date inclusive
 */
export function getDatesRange(startDate?: string, endDate?: string): string[] {
  if (!startDate) return [];
  if (!endDate) return [startDate];

  const pStart = parseDateString(startDate);
  const pEnd = parseDateString(endDate);
  if (!pStart || !pEnd) return [startDate];

  const dates: string[] = [];
  const current = new Date(Date.UTC(pStart.year, pStart.month - 1, pStart.day));
  const end = new Date(Date.UTC(pEnd.year, pEnd.month - 1, pEnd.day));

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates.length > 0 ? dates : [startDate];
}
