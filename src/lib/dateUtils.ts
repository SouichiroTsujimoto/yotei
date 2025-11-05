import type { VotingSettings } from '@/types/type';

/**
 * 日付・時刻のフォーマット変換ユーティリティ
 */

/**
 * yyyy-mm-dd形式の文字列を正規化（月日を2桁に）
 * @param dateStr yyyy-mm-dd形式の文字列（例: "2025-1-5"）
 * @returns 正規化された文字列（例: "2025-01-05"）
 */
export function normalizeDateFormat(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const [year, month, day] = parts;
  const normalizedMonth = month.padStart(2, '0');
  const normalizedDay = day.padStart(2, '0');
  
  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

/**
 * HH:mm形式の文字列を正規化（時分を2桁に）
 * @param timeStr HH:mm形式の文字列（例: "9:5"）
 * @returns 正規化された文字列（例: "09:05"）
 */
export function normalizeTimeFormat(timeStr: string): string {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return timeStr;
  
  const [hour, minute] = parts;
  const normalizedHour = hour.padStart(2, '0');
  const normalizedMinute = minute.padStart(2, '0');
  
  return `${normalizedHour}:${normalizedMinute}`;
}

/**
 * yyyy-mm-dd形式の文字列が有効な日付かバリデーション
 * @param dateStr yyyy-mm-dd形式の文字列
 * @returns 有効な日付の場合true
 */
export function isValidDate(dateStr: string): boolean {
  // yyyy-mm-dd形式のチェック
  const datePattern = /^\d{4}-\d{1,2}-\d{1,2}$/;
  if (!datePattern.test(dateStr)) {
    return false;
  }
  
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  // 月の範囲チェック
  if (month < 1 || month > 12) {
    return false;
  }
  
  // 日の範囲チェック（月ごとの日数を考慮）
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }
  
  // 実際の日付として解釈可能かチェック
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * HH:mm形式の文字列が有効な時刻かバリデーション
 * @param timeStr HH:mm形式の文字列
 * @returns 有効な時刻の場合true
 */
export function isValidTime(timeStr: string): boolean {
  // HH:mm形式のチェック
  const timePattern = /^\d{1,2}:\d{1,2}$/;
  if (!timePattern.test(timeStr)) {
    return false;
  }
  
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  
  // 時刻の範囲チェック
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/**
 * yyyy-mm-dd形式とHH:mm形式の文字列からDate型を生成
 * @param dateStr yyyy-mm-dd形式の文字列
 * @param timeStr HH:mm形式の文字列
 * @returns Date型オブジェクト
 */
export function dateTimeStringsToDate(dateStr: string, timeStr: string): Date {
  const dateParts = dateStr.split('-');
  const timeParts = timeStr.split(':');
  
  return new Date(
    parseInt(dateParts[0], 10),      // year
    parseInt(dateParts[1], 10) - 1,  // month (0-indexed)
    parseInt(dateParts[2], 10),      // day
    parseInt(timeParts[0], 10),      // hour
    parseInt(timeParts[1], 10),      // minute
    0                                 // second
  );
}

/**
 * yyyy-mm-dd形式の文字列からDate型を生成（時刻は00:00:00）
 * @param dateStr yyyy-mm-dd形式の文字列
 * @returns Date型オブジェクト
 */
export function dateStringToDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(
    parseInt(parts[0], 10),      // year
    parseInt(parts[1], 10) - 1,  // month (0-indexed)
    parseInt(parts[2], 10),      // day
    0,                            // hour
    0,                            // minute
    0                             // second
  );
}

/**
 * yyyy-mm-dd形式とHH:mm形式の文字列からISO形式の文字列を生成
 * @param dateStr yyyy-mm-dd形式の文字列
 * @param timeStr HH:mm形式の文字列
 * @returns ISO形式の文字列
 */
export function dateTimeStringsToISO(dateStr: string, timeStr: string): string {
  const date = dateTimeStringsToDate(dateStr, timeStr);
  return date.toISOString();
}

/**
 * Date型からyyyy-mm-dd形式の文字列を生成
 * @param date Date型オブジェクト
 * @returns yyyy-mm-dd形式の文字列
 */
export function dateToDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Date型からHH:mm形式の文字列を生成
 * @param date Date型オブジェクト
 * @returns HH:mm形式の文字列
 */
export function dateToTimeString(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  
  return `${hour}:${minute}`;
}

/**
 * ISO形式の文字列からDate型を生成
 * @param isoStr ISO形式の文字列
 * @returns Date型オブジェクト
 */
export function isoStringToDate(isoStr: string): Date {
  return new Date(isoStr);
}

/**
 * ISO形式の文字列からyyyy-mm-dd形式の文字列を生成
 * @param isoStr ISO形式の文字列
 * @returns yyyy-mm-dd形式の文字列
 */
export function isoStringToDateString(isoStr: string): string {
  const date = new Date(isoStr);
  return dateToDateString(date);
}

/**
 * ISO形式の文字列からHH:mm形式の文字列を生成
 * @param isoStr ISO形式の文字列
 * @returns HH:mm形式の文字列
 */
export function isoStringToTimeString(isoStr: string): string {
  const date = new Date(isoStr);
  return dateToTimeString(date);
}

/**
 * 指定した日時が過去かどうかをチェック
 * @param dateStr yyyy-mm-dd形式の文字列
 * @param timeStr HH:mm形式の文字列
 * @returns 過去の場合true、未来または現在の場合false
 */
export function isPastDateTime(dateStr: string, timeStr: string): boolean {
  const targetDate = dateTimeStringsToDate(dateStr, timeStr);
  const now = new Date();
  return targetDate <= now;
}

/**
 * Date型が過去かどうかをチェック
 * @param date Date型オブジェクト
 * @returns 過去の場合true、未来または現在の場合false
 */
export function isPastDate(date: Date): boolean {
  const now = new Date();
  return date <= now;
}

const getDefaultDeadline = () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  return dateToDateString(futureDate);
};

// デフォルト設定
export const defaultSettings: VotingSettings = {
  allowSettingChanges: true,
  deadline: {
    enable: true,
    date: getDefaultDeadline(),
    time: '23:59',
  },
  autoDecision: {
    enable: true,
    threshold: 3,
  },
  rss: {
    enable: false,
  },
};

