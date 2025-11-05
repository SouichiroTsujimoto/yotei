// バックエンドのレスポンスの型定義
export type Response = {
  id: number;
  participant_id: number;
  candidate_date_id: number;
  status: string; // "available", "maybe", "unavailable"
  created_at: string;
  updated_at: string;
}

export type Participant = {
  id: number;
  event_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  responses?: Response[];
}

export type CandidateDate = {
  id: number;
  event_id: string;
  date_time: string;
  created_at: string;
  updated_at: string;
}

export type EventData = {
  id: string;
  title: string;
  description?: string;
  creator_name?: string;
  candidate_dates: CandidateDate[];
  participants?: Participant[];
  created_at: string;
  updated_at: string;
  // 設定情報
  allow_setting_changes: boolean;
  deadline: string | null;
  auto_decision_enable: boolean;
  auto_decision_threshold: number;
  rss_enabled: boolean;
}

// フロントエンド用の型定義
export type Person = {
  id: string;
  name: string;
  availability: Set<string>;
}

export type AvailabilityTableProps = {
  candidateDates: string[]; // 選択された日付のリスト
  people: Person[];
  selectedDates: Set<string>; // カレンダーで選択された日付
  newPersonName: string;
  setNewPersonName: (name: string) => void;
};

// 設定の型定義
export type VotingSettings = {
  allowSettingChanges: boolean;
  deadline: {
    enable: boolean;
    date: string;
    time: string;
  };
  autoDecision: {
    enable: boolean;
    threshold: number | null;
  };
  rss: {
    enable: boolean;
  };
};
