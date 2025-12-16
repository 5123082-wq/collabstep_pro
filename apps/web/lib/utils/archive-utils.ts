import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Форматирует дату закрытия организации
 */
export function formatClosedDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
}

/**
 * Форматирует дату истечения архива
 */
export function formatExpiresDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
}

/**
 * Получает время до удаления архива в человекочитаемом формате
 */
export function getTimeUntilDeletion(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  
  if (expires < now) {
    return 'Архив истёк';
  }
  
  const days = differenceInDays(expires, now);
  const hours = differenceInHours(expires, now) % 24;
  
  if (days > 0) {
    if (days === 1) {
      return 'Осталось менее суток';
    }
    if (days <= 7) {
      return `Осталось ${days} ${getDaysWord(days)}`;
    }
    return `Осталось ${days} ${getDaysWord(days)}`;
  }
  
  if (hours > 0) {
    return `Осталось ${hours} ${getHoursWord(hours)}`;
  }
  
  return 'Осталось менее часа';
}

/**
 * Получает цвет индикатора в зависимости от времени до удаления
 */
export function getExpiryColor(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  
  if (expires < now) {
    return 'text-red-400';
  }
  
  const days = differenceInDays(expires, now);
  
  if (days <= 1) {
    return 'text-red-400';
  }
  if (days <= 7) {
    return 'text-yellow-400';
  }
  return 'text-neutral-400';
}

/**
 * Форматирует размер файла в человекочитаемом формате
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getDaysWord(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дней';
  }
  
  if (lastDigit === 1) {
    return 'день';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }
  
  return 'дней';
}

function getHoursWord(hours: number): string {
  const lastDigit = hours % 10;
  const lastTwoDigits = hours % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'часов';
  }
  
  if (lastDigit === 1) {
    return 'час';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'часа';
  }
  
  return 'часов';
}
