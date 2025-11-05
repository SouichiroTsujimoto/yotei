'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { VotingSettings } from '@/types/type';
import { eventAPI } from '@/lib/api';
import {
  normalizeDateFormat,
  normalizeTimeFormat,
  isValidDate,
  isValidTime,
  dateTimeStringsToISO,
  dateToDateString,
  isPastDateTime,
} from '@/lib/dateUtils';

// デフォルト設定（7日後の23:59を締切に）
const getDefaultDeadline = () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  return dateToDateString(futureDate);
};

const defaultSettings: VotingSettings = {
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
function loadSettingsFromStorage(eventId: string | null): VotingSettings {
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

export default function SettingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  
  // 一意なIDを生成
  const autoDecisionId = useId();
  const thresholdId = useId();
  const enableDeadlineId = useId();
  const deadlineDateId = useId();
  const deadlineTimeId = useId();
  const allowSettingChangesId = useId();
  const enableRssId = useId();

  // 初期設定を読み込む（イベントIDを考慮）
  const [initialSettings] = useState(() => loadSettingsFromStorage(eventId));

  // UI用のstate
  const [enableAutoDecision, setEnableAutoDecision] = useState(initialSettings.autoDecision.enable);
  const [threshold, setThreshold] = useState<number>(initialSettings.autoDecision.threshold || 3);
  const [enableDeadline, setEnableDeadline] = useState(initialSettings.deadline.enable);
  const [deadlineDate, setDeadlineDate] = useState(initialSettings.deadline.date);
  const [deadlineTime, setDeadlineTime] = useState(initialSettings.deadline.time);
  const [allowSettingChanges, setAllowSettingChanges] = useState(initialSettings.allowSettingChanges);
  const [enableRss, setEnableRss] = useState(initialSettings.rss.enable);
  
  // JSON編集用のstate
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [isJsonEditing, setIsJsonEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 読み取り専用モード（設定変更が許可されていない場合）
  const isReadOnly = eventId !== null && !initialSettings.allowSettingChanges;

  // UIの値からJSON文字列を生成
  const updateJsonFromUI = useCallback(() => {
    const settings: VotingSettings = {
      allowSettingChanges: allowSettingChanges,
      deadline: {
        enable: enableDeadline,
        date: deadlineDate,
        time: deadlineTime,
      },
      autoDecision: {
        enable: enableAutoDecision,
        threshold: threshold,
      },
      rss: {
        enable: enableRss,
      },
    };
    setJsonText(JSON.stringify(settings, null, 2));
    setJsonError('');
  }, [enableAutoDecision, threshold, enableDeadline, deadlineDate, deadlineTime, allowSettingChanges, enableRss]);

  // 初期化：UIからJSONを生成
  useEffect(() => {
    if (!isJsonEditing) {
      updateJsonFromUI();
    }
  }, [isJsonEditing, updateJsonFromUI]);

  // JSONテキストの変更ハンドラ
  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setIsJsonEditing(true);
    
    try {
      const parsed = JSON.parse(value) as VotingSettings;
      
      // バリデーション
      if (typeof parsed.allowSettingChanges !== 'boolean') {
        setJsonError('allowSettingChanges must be a boolean');
        return;
      }
      
      if (!parsed.deadline) {
        setJsonError('deadline object is required');
        return;
      }
      
      if (typeof parsed.deadline.enable !== 'boolean') {
        setJsonError('deadline.enable must be a boolean');
        return;
      }
      
      // 締切が有効な場合のみ日時をバリデーション
      if (parsed.deadline.enable) {
        if (typeof parsed.deadline.date !== 'string') {
          setJsonError('deadline.date must be a string');
          return;
        }
        
        // 日付形式のバリデーション
        if (!isValidDate(parsed.deadline.date)) {
          setJsonError('deadline.date must be a valid date in YYYY-MM-DD format');
          return;
        }
        
        if (typeof parsed.deadline.time !== 'string') {
          setJsonError('deadline.time must be a string');
          return;
        }
        
        // 時刻形式のバリデーション
        if (!isValidTime(parsed.deadline.time)) {
          setJsonError('deadline.time must be a valid time in HH:mm format');
          return;
        }
        
        // 締切が過去の日時でないかチェック
        if (isPastDateTime(parsed.deadline.date, parsed.deadline.time)) {
          setJsonError('deadline must be a future date and time');
          return;
        }
      }
      
      if (!parsed.autoDecision || typeof parsed.autoDecision.enable !== 'boolean') {
        setJsonError('autoDecision.enable must be a boolean');
        return;
      }
      
      if (parsed.autoDecision.threshold !== null && typeof parsed.autoDecision.threshold !== 'number') {
        setJsonError('autoDecision.threshold must be a number or null');
        return;
      }
      
      if (!parsed.rss || typeof parsed.rss.enable !== 'boolean') {
        setJsonError('rss.enable must be a boolean');
        return;
      }
      
      // 日付フォーマットを正規化
      const normalizedDate = normalizeDateFormat(parsed.deadline.date);
      const normalizedTime = normalizeTimeFormat(parsed.deadline.time);
      // UIを更新
      setAllowSettingChanges(parsed.allowSettingChanges);
      setEnableDeadline(parsed.deadline.enable);
      setDeadlineDate(normalizedDate);
      setDeadlineTime(normalizedTime);
      setEnableAutoDecision(parsed.autoDecision.enable);
      if (parsed.autoDecision.threshold !== null) {
        setThreshold(parsed.autoDecision.threshold);
      }
      setEnableRss(parsed.rss.enable);
      setJsonError('');
      
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  // JSONエディタのフォーカスが外れた時
  const handleJsonBlur = () => {
    setIsJsonEditing(false);
    if (!jsonError) {
      updateJsonFromUI(); // フォーマットを整える
    }
  };

  // 設定を保存
  const handleSave = async () => {
    if (jsonError) {
      alert('JSONにエラーがあります。修正してください。');
      return;
    }
    
    // イベント編集時に設定変更が許可されていない場合はブロック
    if (eventId && !initialSettings.allowSettingChanges) {
      alert('このイベントは設定の変更が許可されていません。');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const settings = JSON.parse(jsonText) as VotingSettings;
      
      // 締切が有効な場合のみ過去でないかチェック
      if (settings.deadline.enable && isPastDateTime(settings.deadline.date, settings.deadline.time)) {
        alert('締切は未来の日時を設定してください。');
        setIsSaving(false);
        return;
      }
      
      // 締切日時をISO形式に変換（締切が有効な場合のみ）
      const deadlineDateTime = settings.deadline.enable 
        ? dateTimeStringsToISO(settings.deadline.date, settings.deadline.time)
        : '';
      
      // sessionStorageに保存（イベントIDと紐づけて管理）
      const storageKey = eventId ? `votingSettings_${eventId}` : 'votingSettings';
      sessionStorage.setItem(storageKey, jsonText);
      
      // イベントIDがある場合はバックエンドにも送信
      if (eventId) {
        
        await eventAPI.updateSettings(eventId, {
          allow_setting_changes: settings.allowSettingChanges,
          deadline_enable: settings.deadline.enable,
          deadline: deadlineDateTime,
          auto_decision_enable: settings.autoDecision.enable,
          auto_decision_threshold: settings.autoDecision.threshold || 0,
          rss_enabled: settings.rss.enable,
        });
      }
      
      // 前のページに戻る
      router.back();
    } catch (err) {
      console.error('設定の保存エラー:', err);
      alert(
        err instanceof Error 
          ? `エラー: ${err.message}` 
          : '設定の保存に失敗しました。'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 戻るボタンのハンドラ
  const handleBack = () => {
    router.back();
  };

  // リセット処理
  const handleReset = () => {
    if (window.confirm('デフォルト設定に戻しますか？')) {
      setAllowSettingChanges(defaultSettings.allowSettingChanges);
      setEnableDeadline(defaultSettings.deadline.enable);
      setDeadlineDate(defaultSettings.deadline.date);
      setDeadlineTime(defaultSettings.deadline.time);
      setEnableAutoDecision(defaultSettings.autoDecision.enable);
      setThreshold(defaultSettings.autoDecision.threshold || 3);
      setEnableRss(defaultSettings.rss.enable);
      setJsonError('');
      setIsJsonEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <main className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">
              投票設定
            </h1>
            <p className="text-slate-400">
              投票の詳細な条件を設定します
            </p>
            {eventId && (
              <p className="text-lime-400 text-sm mt-2">
                イベントID: {eventId} の設定を編集中
              </p>
            )}
            {eventId && !initialSettings.allowSettingChanges && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-500 rounded">
                <p className="text-red-400 text-sm font-medium">
                  ⚠️ このイベントは設定の変更が許可されていません。閲覧のみ可能です。
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleBack}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>戻る</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            戻る
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 左側：UI設定 */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white">
                UI設定
              </h2>
              {/* リセットボタン */}
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving || isReadOnly}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-slate-600 text-white text-sm rounded hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>初期設定に戻す</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                初期設定に戻す
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 設定変更可否の設定 */}
              <div className="space-y-2 border-slate-700">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id={allowSettingChangesId}
                    checked={allowSettingChanges}
                    onChange={(e) => setAllowSettingChanges(e.target.checked)}
                    disabled={isReadOnly}
                    className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-lime-400 focus:ring-lime-400 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor={allowSettingChangesId} className="ml-3 flex-1">
                    <div className="text-white font-medium">
                      設定の変更を許可
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      投票開始後に設定を変更できるようにします
                    </div>
                  </label>
                </div>
              </div>
              
              {/* 締切日時の設定 */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id={enableDeadlineId}
                    checked={enableDeadline}
                    onChange={(e) => setEnableDeadline(e.target.checked)}
                    disabled={isReadOnly}
                    className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-lime-400 focus:ring-lime-400 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor={enableDeadlineId} className="ml-3 flex-1">
                    <div className="text-white font-medium">
                      締切を有効化する
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      指定した日時までに投票を締め切ります
                    </div>
                  </label>
                </div>

                {enableDeadline && (
                  <div className="ml-7 space-y-3">
                    <div className="text-sm text-slate-300 font-medium">
                      締切日時
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={deadlineDateId} className="block text-sm text-slate-300 mb-1">
                          日付
                        </label>
                        <input
                          type="date"
                          id={deadlineDateId}
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                          disabled={isReadOnly}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label htmlFor={deadlineTimeId} className="block text-sm text-slate-300 mb-1">
                          時刻
                        </label>
                        <input
                          type="time"
                          id={deadlineTimeId}
                          value={deadlineTime}
                          onChange={(e) => setDeadlineTime(e.target.value)}
                          disabled={isReadOnly}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 閾値の設定 */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id={autoDecisionId}
                    checked={enableAutoDecision}
                    onChange={(e) => setEnableAutoDecision(e.target.checked)}
                    disabled={isReadOnly}
                    className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-lime-400 focus:ring-lime-400 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor={autoDecisionId} className="ml-3 flex-1">
                    <div className="text-white font-medium">
                      投票数による自動決定を有効にする
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      指定した人数以上が投票した時に最も多く投票された日を通知します
                    </div>
                  </label>
                </div>

                {enableAutoDecision && (
                  <div className="ml-7 space-y-2">
                    <label htmlFor={thresholdId} className="block">
                      <span className="text-white font-medium">
                        自動決定の閾値
                      </span>
                      <span className="text-sm text-slate-400 ml-2">
                        (人数)
                      </span>
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        id={thresholdId}
                        min="1"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        disabled={isReadOnly}
                        className="w-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-slate-400">
                        人以上が投票した時に通知
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* RSS通知の設定 */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id={enableRssId}
                    checked={enableRss}
                    onChange={(e) => setEnableRss(e.target.checked)}
                    disabled={isReadOnly}
                    className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-lime-400 focus:ring-lime-400 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor={enableRssId} className="ml-3 flex-1">
                    <div className="text-white font-medium">
                      RSS通知を有効化する
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      日程決定時にRSSフィードで通知を配信します
                    </div>
                  </label>
                </div>

                {enableRss && eventId && (
                  <div className="ml-7 space-y-2">
                    <div className="text-sm text-slate-300 font-medium">
                      RSSフィードURL
                    </div>
                    <div className="bg-slate-950 border border-slate-600 rounded p-3">
                      <p className="text-lime-400 text-sm font-mono break-all">
                        {`${window.location.origin}/api/v1/rss/${eventId}/feed`}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>• このURLをRSSリーダーに登録してください</p>
                      <p>• Slack: RSSアプリを追加し、/feed subscribe コマンドで登録</p>
                      <p>• Discord: RSS Botを追加してURLを登録</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右側：JSON編集 */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-3">
              JSON編集
            </h2>
            
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  onBlur={handleJsonBlur}
                  readOnly={isReadOnly}
                  className={`w-full h-96 px-4 py-3 bg-slate-950 border rounded font-mono text-sm text-slate-200 focus:outline-none focus:border-lime-400 ${
                    jsonError ? 'border-red-500' : 'border-slate-600'
                  } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                  spellCheck={false}
                  placeholder="JSON設定を直接編集できます"
                />
                
                {jsonError && (
                  <div className="mt-2 p-3 bg-red-900/20 border border-red-500 rounded">
                    <p className="text-red-400 text-sm font-mono">
                      {jsonError}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-800 rounded text-sm text-slate-300">
                <p className="font-medium text-white mb-2">設定項目の説明：</p>
                <ul className="space-y-1 text-slate-400 text-xs">
                  <li className="ml-2">
                    <span className="font-mono text-lime-400">allowSettingChanges</span>
                    : 設定変更を許可するか (boolean)
                  </li>
                  <li className="ml-2">
                    <span className="font-mono text-lime-400">deadline.enable</span>
                    : 締切を有効にするか (boolean)
                  </li>
                  <li className="ml-2">
                    <span className="font-mono text-lime-400">deadline.date</span>
                    : 締切日 (YYYY-MM-DD形式)
                  </li>
                  <li className="ml-2">
                    <span className="font-mono text-lime-400">deadline.time</span>
                    : 締切時刻 (HH:mm形式)
                  </li>
                  <li className="ml-2">
                    <span className="font-mono text-lime-400">autoDecision.enable</span>
                    : 自動決定機能を有効にするか (boolean)
                  </li>
                  <li className="ml-2">
                    <span className="font-mono text-lime-400">autoDecision.threshold</span>
                    : 自動決定の閾値（number | null）
                  </li>
                  <li className="ml-2">
                    <span className="font-mono text-lime-400">rss.enable</span>
                    : RSS通知を有効にするか (boolean)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 保存・キャンセルボタン */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSaving}
            className="px-8 py-3 rounded-lg font-bold text-lg shadow-lg transition-colors bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!!jsonError || isSaving || isReadOnly}
            className={`px-8 py-3 rounded-lg font-bold text-lg shadow-lg transition-colors ${
              jsonError || isSaving || isReadOnly
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-lime-400 text-slate-950 hover:bg-lime-300'
            }`}
          >
            {isSaving ? '保存中...' : isReadOnly ? '閲覧専用' : '設定を保存'}
          </button>
        </div>
      </main>
    </div>
  );
}

