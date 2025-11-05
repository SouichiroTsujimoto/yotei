import type { VotingSettings } from '@/types/type';
import { dateToDateString } from '@/lib/dateUtils';

// デフォルト設定（7日後の23:59を締切に）
const getDefaultDeadline = () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  return dateToDateString(futureDate);
};

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

// sessionStorageから設定を読み込む（イベントIDと紐づけて管理）
export function loadSettingsFromStorage(eventId: string | null): VotingSettings {
  try {
    // イベントIDがある場合は専用のキーで保存
    const storageKey = eventId ? `votingSettings_${eventId}` : 'votingSettings';
    const savedSettings = sessionStorage.getItem(storageKey);
    if (savedSettings) {
      return JSON.parse(savedSettings) as VotingSettings;
    }
  } catch (err) {
    console.error('設定の読み込みエラー:', err);
  }
  return defaultSettings;
}
