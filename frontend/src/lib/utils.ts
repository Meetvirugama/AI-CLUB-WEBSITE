import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string (YYYY-MM-DD or DD/MM/YYYY etc.) and return YYYY-MM-DD.
 * Returns null for empty/invalid input.
 */
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

/**
 * Parse a datetime-local string (from <input type="datetime-local">) and
 * return a UTC ISO 8601 string, treating the input as **IST (UTC+05:30)**.
 *
 * Browsers' datetime-local inputs yield strings like "2026-10-15T18:00" or
 * "2026-10-15T18:00:00" — they carry NO timezone. We must interpret them as
 * IST before sending to the backend so status computation is correct.
 *
 * Examples:
 *   "2026-10-15T18:00"    → "2026-10-15T12:30:00.000Z"  (6 PM IST = 12:30 PM UTC)
 *   "2026-10-15T23:59"    → "2026-10-15T18:29:00.000Z"
 */
export const parseLocalDateTime = (dateTimeStr: string | null | undefined): string | null => {
  if (!dateTimeStr) return null;
  const trimmed = dateTimeStr.trim();
  if (!trimmed) return null;

  // If already has explicit timezone offset (e.g. +05:30 or Z), honour it as-is
  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? trimmed : d.toISOString();
  }

  // datetime-local format: "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS"
  // Append +05:30 to treat as IST before converting to UTC ISO
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const withIST = trimmed.length === 16
      ? `${trimmed}:00+05:30`   // "YYYY-MM-DDTHH:MM" → append seconds + offset
      : `${trimmed}+05:30`;     // "YYYY-MM-DDTHH:MM:SS" → append offset
    const d = new Date(withIST);
    return isNaN(d.getTime()) ? trimmed : d.toISOString();
  }

  // DD/MM/YYYY, HH:MM [AM|PM] fallback
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

    // Build as IST explicitly: YYYY-MM-DDTHH:MM:SS+05:30
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');
    const mi = String(minute).padStart(2, '0');
    const istStr = `${year}-${mm}-${dd}T${hh}:${mi}:00+05:30`;
    const d = new Date(istStr);
    return isNaN(d.getTime()) ? trimmed : d.toISOString();
  }

  // Last resort — parse as-is
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return trimmed;
};

/**
 * Convert a UTC ISO string (from backend) to an IST datetime-local value
 * suitable for <input type="datetime-local"> (format: "YYYY-MM-DDTHH:MM").
 *
 * This ensures the admin always sees and edits times in IST.
 */
export const utcToISTInput = (isoStr: string | null | undefined): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';

  // Convert to IST offset (+05:30 = 330 minutes)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istMs = d.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);

  // Format as "YYYY-MM-DDTHH:MM"
  const yyyy = istDate.getUTCFullYear();
  const mo   = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(istDate.getUTCDate()).padStart(2, '0');
  const hh   = String(istDate.getUTCHours()).padStart(2, '0');
  const mi   = String(istDate.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mo}-${dd}T${hh}:${mi}`;
};
