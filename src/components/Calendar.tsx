'use client';

import React, { useState, useId, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import type { VotingSettings } from '@/types/type';
import { eventAPI } from '@/lib/api';
import { dateTimeStringsToISO, defaultSettings } from '@/lib/dateUtils';

type CalendarItem = {
  type: 'empty' | 'day';
  day: number; // emptyの場合は-1
  id: string;
};

type DraftData = {
  selectedDates: Set<string>;
  currentDate: Date;
  eventTitle: string;
}


export default function Calendar() {
  const router = useRouter();
  const eventTitleId = useId();

  const [draftData, setDraftData] = useState<DraftData>();

  useEffect(() => {
    try {
      const draftData = sessionStorage.getItem('eventDraft');
      if (draftData) {
        const parsed = JSON.parse(draftData);
        setDraftData({
          selectedDates: new Set(parsed.selectedDates),
          currentDate: new Date(parsed.currentDate),
          eventTitle: parsed.eventTitle,
        });
      }
    } catch (err) {
      console.error('ドラフトの読み込みエラー:', err);
    }
  }, []);

  useEffect(() => {
    if (draftData) {
      setSelectedDates(draftData.selectedDates);
      setCurrentDate(draftData.currentDate);
      setEventTitle(draftData.eventTitle);
    }
  }, [draftData]);

  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [eventTitle, setEventTitle] = useState<string>("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<VotingSettings>(defaultSettings);

  // sessionStorageから設定を読み込む
  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem('votingSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as VotingSettings;
        setSettings(parsed);
      }
    } catch (err) {
      console.error('設定の読み込みエラー:', err);
      // エラーの場合はデフォルト設定を使用
    }
  }, []);

  // ドラフトを保存する関数
  const saveDraft = useCallback(() => {
    try {
      const draft = {
        eventTitle,
        selectedDates: Array.from(selectedDates),
        currentDate: currentDate.toISOString(),
      };
      sessionStorage.setItem('eventDraft', JSON.stringify(draft));
    } catch (err) {
      console.error('ドラフトの保存エラー:', err);
    }
  }, [eventTitle, selectedDates, currentDate]);

  // ページをリロードや離脱する時にドラフトを保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveDraft();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveDraft]);

  // 月の最初の日と最後の日を取得
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 月の最初の日の曜日（0: 日曜日）
  const firstDayOfWeek = firstDay.getDay();
  
  // カレンダーの日付を生成
  const daysInMonth = lastDay.getDate();
  const days: Array<CalendarItem> = [];
  
  // 空白のセルを追加
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ type: 'empty', day: -1, id: `empty-${year}-${month}-${i}` });
  }
  
  // 日付を追加
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ type: 'day', day, id: `${year}-${month}-${day}` });
  }

  // 日付をクリックした時の処理
  const handleDateClick = (day: number) => {
    const dateKey = `${year}-${month}-${day}`;
    const newSelected = new Set(selectedDates);
    
    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey);
    } else {
      newSelected.add(dateKey);
    }
    
    setSelectedDates(newSelected);
  };
  
  const handleDayOfWeekClick = (index: number) => {
    const newSelected = new Set(selectedDates);
    
    for (let i = 0; index + i - firstDayOfWeek + 1 <= daysInMonth; i+=7) {
      const day = index + i - firstDayOfWeek + 1;
      if (day > 0) {
        const dateKey = `${year}-${month}-${day}`;
        if (newSelected.has(dateKey)) {
          newSelected.delete(dateKey);
        } else {
          newSelected.add(dateKey);
        }
      }
    }
    
    setSelectedDates(newSelected);
  };

  // 週をクリックした時の処理
  const handleWeekClick = (weekIndex: number) => {
    const newSelected = new Set(selectedDates);
    const startIndex = weekIndex * 7;
    const endIndex = Math.min(startIndex + 7, days.length);
    
    // その週に含まれる日付を取得
    for (let i = startIndex; i < endIndex; i++) {
      const item = days[i];
      if (item.type === 'day') {
        const dateKey = item.id;
        if (newSelected.has(dateKey)) {
          newSelected.delete(dateKey);
        } else {
          newSelected.add(dateKey);
        }
      }
    }
    
    setSelectedDates(newSelected);
  };

  // 前の月へ
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 次の月へ
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 選択された日付をISO形式の配列に変換
  const getSelectedDatesArray = (): string[] => {
    const dates: string[] = [];
    selectedDates.forEach(dateKey => {
      const [yearStr, monthStr, dayStr] = dateKey.split('-');
      // デフォルトで19:00に設定
      const date = new Date(
        parseInt(yearStr),
        parseInt(monthStr),
        parseInt(dayStr),
        19,
        0,
        0
      );
      dates.push(date.toISOString());
    });
    return dates.sort();
  };

  // イベント作成処理
  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      setError('イベント名を入力してください');
      return;
    }

    if (selectedDates.size === 0) {
      setError('候補日を選択してください');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const candidateDates = getSelectedDatesArray();
      
      // 締切日時をISO形式に変換
      const deadlineDateTime = dateTimeStringsToISO(settings.deadline.date, settings.deadline.time);
      
      const data = await eventAPI.create({
        title: eventTitle,
        candidate_dates: candidateDates,
        settings: {
          allow_setting_changes: settings.allowSettingChanges,
          deadline_enable: settings.deadline.enable,
          deadline: deadlineDateTime,
          auto_decision_enable: settings.autoDecision.enable,
          auto_decision_threshold: settings.autoDecision.threshold,
          rss_enabled: settings.rss.enable,
        },
      });

      
      // ドラフトと設定をクリア（次回のイベント作成時にデフォルト設定を使用するため）
      sessionStorage.removeItem('eventDraft');
      sessionStorage.removeItem('votingSettings');
      
      // 投票ページに遷移
      router.push(`/${data.id}/vote`);
      
    } catch (err) {
      console.error('イベント作成エラー:', err);
      setError(
        err instanceof Error 
          ? `エラー: ${err.message}` 
          : 'イベントの作成に失敗しました'
      );
    } finally {
      setIsCreating(false);
    }
  };

  // リセット処理
  const handleReset = () => {
    if (window.confirm('イベント名と候補日選択をリセットしますか？')) {
      setSelectedDates(new Set());
      setEventTitle('');
      setError('');
      sessionStorage.removeItem('eventDraft');
    }
  };

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  
  // 週の数を計算
  const totalWeeks = Math.ceil(days.length / 7);

  return (
    <div className="max-w-2xl mx-auto relative">
      {/* リセットボタン */}
      <button
        type="button"
        onClick={handleReset}
        disabled={isCreating}
        className="absolute -top-12 right-0 flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-slate-700 text-white text-sm rounded hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>リセットアイコン</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        リセット
      </button>

      <div className="p-6 bg-slate-950 border border-lime-400 rounded-lg">
        {/* イベント名入力 */}
        <div className="mb-6">
          <label htmlFor={eventTitleId} className="block text-white font-bold mb-2">
            イベント名
          </label>
          <input
            id={eventTitleId}
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="例: 上映会"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-lime-400"
          />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={prevMonth}
            className="px-4 py-2 bg-slate-950 text-white hover:text-slate-950 rounded hover:bg-lime-400 transition-colors"
          >
            ←
          </button>
          <h2 className="text-2xl text-white font-bold">
            {year}年 {monthNames[month]}
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="px-4 py-2 bg-slate-950 text-white hover:text-slate-950 rounded hover:bg-lime-400 transition-colors"
          >
            →
          </button>
        </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-8 gap-2 mb-2">
        {/* 週選択列のヘッダー */}
        <div className="text-center font-semibold text-white text-sm flex items-center justify-center">
          
        </div>
        {weekDays.map((day, index) => {
            return (
            <button
                key={day}
                onClick={() => handleDayOfWeekClick(index)}
                className={`text-center font-semibold aspect-square rounded-lg font-medium transition-all duration-100
                hover:scale-110 hover:shadow-md border-lime-400 hover:border  ${
                index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-white'
                }`}
                type="button"
            >
                {day}
            </button>
        )})}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: totalWeeks }, (_, weekIndex) => {
          const weekStart = weekIndex * 7;
          const weekEnd = Math.min(weekStart + 7, days.length);
          const weekDays = days.slice(weekStart, weekEnd);
          const weekKey = `week-${year}-${month}-${weekIndex}`;
          
          return (
            <React.Fragment key={weekKey}>
              {/* 週選択ボタン */}
              <button
                type="button"
                onClick={() => handleWeekClick(weekIndex)}
                className="aspect-square rounded-lg font-medium transition-all duration-100 hover:scale-110 hover:shadow-md border-lime-400 hover:border bg-slate-950 text-slate-400 text-sm"
              >
                W{weekIndex + 1}
              </button>
              
              {/* その週の日付 */}
              {weekDays.map((item, dayIndex) => {
                if (item.type === 'empty') {
                  return <div key={item.id} className="aspect-square" />;
                }

                const day = item.day;
                const dateKey = item.id;
                const isSelected = selectedDates.has(dateKey);
                const absoluteIndex = weekStart + dayIndex;
                const dayOfWeek = absoluteIndex % 7;
                
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`
                      aspect-square rounded-lg font-medium transition-all duration-100
                      hover:scale-110 hover:shadow-md
                      ${
                        isSelected
                          ? 'bg-lime-400 text-slate-950 shadow-lg scale-105'
                          : 'bg-slate-950 hover:border border-lime-400'
                      }
                      ${
                        !isSelected && dayOfWeek === 0
                          ? 'text-red-500'
                          : !isSelected && dayOfWeek === 6
                          ? 'text-blue-500'
                          : !isSelected
                          ? 'text-white'
                          : ''
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
              
              {/* 週の最後の空セルを埋める */}
              {Array.from({ length: 7 - weekDays.length }, (_, emptyIndex) => {
                const emptyKey = `empty-end-${year}-${month}-${weekStart}-${weekDays.length + emptyIndex}`;
                return <div key={emptyKey} className="aspect-square" />;
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* イベント名の入力を促す */}
      <div className="mt-4 text-center text-slate-500 text-sm">
        {eventTitle.trim() ? eventTitle : 'イベント名を入力してください'}
      </div>

      {/* 選択状態の表示 */}
      <div className="mt-4 text-center text-slate-500 text-sm">
        選択された候補日の数: {selectedDates.size} 
      </div>

      {/* ボタンエリア */}
      <div className="flex items-center justify-center gap-4 mt-6">
        {/* 設定編集ボタン */}
        <Link
          href="/setting"
          onClick={saveDraft}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 border border-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>設定アイコン</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          設定を編集
        </Link>

        {/* イベント作成ボタン */}
        <button 
          onClick={handleCreateEvent}
          disabled={isCreating || selectedDates.size === 0 || !eventTitle.trim()}
          className={`
            px-6 py-3 rounded-lg font-extrabold transition-all
            ${selectedDates.size > 0 && eventTitle.trim() && !isCreating
              ? "bg-lime-400 text-slate-950 hover:bg-lime-300" 
              : "bg-slate-700 text-gray-500 cursor-not-allowed"}
          `} 
          type="button"
        >
          {isCreating ? '作成中...' : 'イベントを作成'}
        </button>
      </div>
      </div>
    </div>
  );
}

