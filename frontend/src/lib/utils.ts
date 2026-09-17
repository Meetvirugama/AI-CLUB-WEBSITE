import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseLocalDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return trimmed;
};

export const parseLocalDateTime = (dateTimeStr: string | null | undefined): string | null => {
  if (!dateTimeStr) return null;
  const trimmed = dateTimeStr.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?.*$/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }

  const formatMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (formatMatch) {
    const day = parseInt(formatMatch[1], 10);
    const month = parseInt(formatMatch[2], 10) - 1;
    const year = parseInt(formatMatch[3], 10);
    let hour = parseInt(formatMatch[4], 10);
    const minute = parseInt(formatMatch[5], 10);
    const ampm = formatMatch[6]?.toUpperCase();

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const date = new Date(year, month, day, hour, minute);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return trimmed;
};

