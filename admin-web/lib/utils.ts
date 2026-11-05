import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}p` : `${h}h`;
}

export function difficultyLabel(d: string): string {
  const map: Record<string, string> = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' };
  return map[d] ?? d;
}

export function difficultyColor(d: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'bg-green-100 text-green-700',
    INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
    ADVANCED: 'bg-red-100 text-red-700',
  };
  return map[d] ?? 'bg-gray-100 text-gray-700';
}

export function riskColor(r: string): string {
  const map: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
  };
  return map[r] ?? 'bg-gray-100 text-gray-700';
}

export function roleColor(r: string): string {
  const map: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    TEACHER: 'bg-blue-100 text-blue-700',
    STUDENT: 'bg-gray-100 text-gray-700',
  };
  return map[r] ?? 'bg-gray-100 text-gray-700';
}

export function statusColor(s: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    LOCKED: 'bg-red-100 text-red-700',
    DISABLED: 'bg-gray-100 text-gray-500',
  };
  return map[s] ?? 'bg-gray-100 text-gray-700';
}

export function truncate(s: string, max = 60): string {
  return s.length <= max ? s : s.slice(0, max) + '…';
}

