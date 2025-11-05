import type { EventData, Participant } from '@/types/type';

// APIのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000';

// 共通のfetchラッパー
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTPエラー: ${response.status}`);
  }
  
  return response.json();
}

// APIレスポンスの型定義
type CreateEventResponse = {
  id: string;
};

type UpdateSettingsResponse = {
  message?: string;
};

// イベント関連のAPI
export const eventAPI = {
  // イベントを作成
  create: async (data: {
    title: string;
    candidate_dates: string[];
    settings: {
      allow_setting_changes: boolean;
      deadline_enable: boolean;
      deadline: string;
      auto_decision_enable: boolean;
      auto_decision_threshold: number | null;
      rss_enabled: boolean;
    };
  }) => {
    return apiFetch<CreateEventResponse>('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // イベントを取得
  get: async (eventId: string) => {
    return apiFetch<EventData>(`/api/v1/events/${eventId}`, {
      method: 'GET',
    });
  },

  // イベントの設定を更新
  updateSettings: async (
    eventId: string,
    settings: {
      allow_setting_changes: boolean;
      deadline_enable: boolean;
      deadline: string;
      auto_decision_enable: boolean;
      auto_decision_threshold: number;
      rss_enabled: boolean;
    }
  ) => {
    return apiFetch<UpdateSettingsResponse>(`/api/v1/events/${eventId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // 参加者を登録
  addParticipant: async (
    eventId: string,
    data: {
      event_id: string;
      participant_id: number;
      name: string;
      available_candidate_dates: { id: number }[];
      unavailable_candidate_dates: { id: number }[];
    }
  ) => {
    return apiFetch<Participant>(`/api/v1/events/${eventId}/participant`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

