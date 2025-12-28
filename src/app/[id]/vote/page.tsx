'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import VotingCalendar from "@/components/VotingCalendar"
import AvailabilityTable from "@/components/AvailabilityTable"

import type { EventData, Person, VotingSettings } from '@/types/type';
import { eventAPI } from '@/lib/api';
import { isoStringToDateString, isoStringToTimeString } from '@/lib/dateUtils';
import { loadSettingsFromStorage } from '@/lib/loadSettings';

// バックエンドの設定をフロントエンド形式に変換
function convertBackendSettingsToFrontend(eventData: EventData): VotingSettings {
    const deadlineEnable = eventData.deadline !== null && eventData.deadline !== undefined;
    let deadlineDate = '2025-12-31';
    let deadlineTime = '23:59';
    
    if (deadlineEnable && eventData.deadline) {
        deadlineDate = isoStringToDateString(eventData.deadline);
        deadlineTime = isoStringToTimeString(eventData.deadline);
    }
    
    return {
        allowSettingChanges: eventData.allow_setting_changes,
        deadline: {
            enable: deadlineEnable,
            date: deadlineDate,
            time: deadlineTime,
        },
        autoDecision: {
            enable: eventData.auto_decision_enable,
            threshold: eventData.auto_decision_threshold === 0 ? null : eventData.auto_decision_threshold,
        },
        rss: {
            enable: eventData.rss_enabled || false,
        },
    };
}

export default function VotePage() {
    const params = useParams();
    const eventId = params.id as string;
    
    const [eventData, setEventData] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [candidateDates, setCandidateDates] = useState<Set<string>>(new Set());
    const [candidateDateIdMap, setCandidateDateIdMap] = useState<Map<number, string>>(new Map());
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [people, setPeople] = useState<Person[]>([]);
    const [newPersonName, setNewPersonName] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<VotingSettings | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            const url = window.location.href;
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('リンクのコピーに失敗しました:', err);
        }
    };

    const handleSettingsOpen = () => {
        setIsSettingsOpen(true);
    };

    // イベントデータを取得する関数
    const fetchEventData = useCallback(async () => {
        try {
            const data: EventData = await eventAPI.get(eventId);
            setEventData(data);
            
            // バックエンドの設定情報をフロントエンド形式に変換してsessionStorageに保存
            const convertedSettings: VotingSettings = convertBackendSettingsToFrontend(data);
            // イベントIDと紐づけて保存
            sessionStorage.setItem(`votingSettings_${eventId}`, JSON.stringify(convertedSettings));
            setSettings(convertedSettings);
            
            // candidate_datesを"year-month-day"形式に変換し、IDとのマッピングも作成
            const dates = new Set<string>();
            const idMap = new Map<number, string>();
            
            data.candidate_dates.forEach(cd => {
                const date = new Date(cd.date_time);
                const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                dates.add(dateStr);
                idMap.set(cd.id, dateStr);
            });
            
            setCandidateDates(dates);
            setCandidateDateIdMap(idMap);
            
            // participantsをフロントエンド用のpeople形式に変換
            if (data.participants && data.participants.length > 0) {
                const convertedPeople: Person[] = data.participants.reverse().map(participant => {
                    const availability = new Set<string>();
                    
                    // responsesからavailableな日付を抽出
                    if (participant.responses) {
                        participant.responses.forEach(response => {
                            if (response.status === 'available') {
                                const dateStr = idMap.get(response.candidate_date_id);
                                if (dateStr) {
                                    availability.add(dateStr);
                                }
                            }
                        });
                    }
                    
                    return {
                        id: participant.id.toString(),
                        name: participant.name,
                        availability,
                    };
                });
                
                setPeople(convertedPeople);
            } else {
                // 参加者がいない場合は空配列をセット
                setPeople([]);
            }
            
        } catch (err) {
            console.error('イベント取得エラー:', err);
            setError(
                err instanceof Error 
                    ? `エラー: ${err.message}` 
                    : 'イベントの取得に失敗しました'
            );
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    // 初回読み込み
    useEffect(() => {
        if (eventId) {
            fetchEventData();
        }
    }, [eventId, fetchEventData]);

    // 登録ボタンのハンドラ
    const handleRegister = async () => {
        setIsSending(true);

        if (!newPersonName.trim()) {
            alert('名前を入力してください');
            return;
        }
        
        if (selectedDates.size === 0) {
            if (!window.confirm('日程を選択していません。このまま投票しますか？')) {
                return;
            }
        }

        if (!eventData) {
            alert('イベント情報が読み込まれていません');
            return;
        }
        
        try {
            // 選択された日付に対応するcandidate_date IDを取得
            const availableCandidateDateIds: number[] = [];
            const unavailableCandidateDateIds: number[] = [];
            
            // candidateDateIdMapの逆マッピングを作成
            const dateToIdMap = new Map<string, number>();
            candidateDateIdMap.forEach((dateStr, id) => {
                dateToIdMap.set(dateStr, id);
            });
            
            // 全ての候補日をチェック
            candidateDates.forEach(dateStr => {
                const candidateDateId = dateToIdMap.get(dateStr);
                if (candidateDateId) {
                    if (selectedDates.has(dateStr)) {
                        availableCandidateDateIds.push(candidateDateId);
                    } else {
                        unavailableCandidateDateIds.push(candidateDateId);
                    }
                }
            });
            
            // バックエンドAPIに送信
            const requestBody = {
                event_id: eventId,
                participant_id: Date.now(), // 一時的なID
                name: newPersonName.trim(),
                available_candidate_dates: availableCandidateDateIds.map(id => ({ id })),
                unavailable_candidate_dates: unavailableCandidateDateIds.map(id => ({ id })),
            };
            
            const registeredParticipant = await eventAPI.addParticipant(eventId, requestBody);
            
            // 入力フォームをクリア
            setNewPersonName('');
            setSelectedDates(new Set());
            
            // 最新のイベントデータを取得して投票状況を更新
            await fetchEventData();
            
        } catch (err) {
            console.error('参加者登録エラー:', err);
            alert(
                err instanceof Error 
                    ? `エラー: ${err.message}` 
                    : '参加者の登録に失敗しました'
            );
        } finally {
            setIsSending(false);
        }
    };

    // Setを配列に変換してソート
    const candidateDatesArray = Array.from(candidateDates).sort((a, b) => {
        const [yearA, monthA, dayA] = a.split('-').map(Number);
        const [yearB, monthB, dayB] = b.split('-').map(Number);
        const dateA = new Date(yearA, monthA, dayA);
        const dateB = new Date(yearB, monthB, dayB);
        return dateA.getTime() - dateB.getTime();
    });

    // ローディング中
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 py-8 flex items-center justify-center">
                <div className="text-white text-xl">読み込み中...</div>
            </div>
        );
    }

    // エラー時
    if (error || !eventData) {
        return (
            <div className="min-h-screen bg-slate-950 py-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error || 'イベントが見つかりません'}</div>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-lime-400 text-slate-950 rounded-lg font-bold hover:bg-lime-300 transition-colors"
                    >
                        ホームに戻る
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <header className="text-center mb-8">
                {/* <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-6xl text-lime-400 hover:text-lime-300 transition-colors tracking-tighter"
                >
                    
                </Link> */}
            </header>
            <main className="container mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">
                            {eventData.title}
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            イベントID: {eventData.id}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* リンクコピーボタン */}
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className={`flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 border rounded-lg transition-colors ${
                                isCopied
                                    ? 'bg-lime-400 border-lime-400 text-slate-950'
                                    : 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700'
                            }`}
                            title="リンクをコピー"
                        >
                            {isCopied ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <title>コピー完了</title>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <title>共有アイコン</title>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            )}
                            <span className="hidden sm:inline">
                                {isCopied ? 'コピー済み' : '共有'}
                            </span>
                        </button>
                        {/* 設定ボタン */}
                        <button
                            type="button"
                            onClick={handleSettingsOpen}
                            className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 bg-slate-800 border border-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <title>設定アイコン</title>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="hidden sm:inline">設定</span>
                        </button>
                    </div>
                </div>
                
                {/* 左右分割レイアウト */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* 左側：カレンダー */}
                    <div className="w-full">
                        <VotingCalendar
                            candidateDates={candidateDates}
                            selectedDates={selectedDates}
                            setSelectedDates={setSelectedDates}
                        />
                    </div>
                    
                    {/* 右側：予定表 */}
                    <div className="w-full space-y-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-bold text-white mb-4">参加可否表</h2>
                            <AvailabilityTable 
                                candidateDates={candidateDatesArray}
                                people={people}
                                selectedDates={selectedDates}
                                newPersonName={newPersonName}
                                setNewPersonName={setNewPersonName}
                            />
                        </div>
                        {/* 登録ボタン */}
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={handleRegister}
                                disabled={isSending}
                                className={`bg-lime-400 text-slate-950 px-8 py-3 rounded-lg font-bold hover:bg-lime-300 transition-colors shadow-lg text-lg ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSending ? '登録中...' : '日程登録'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 設定確認ポップアップ */}
                {isSettingsOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-lime-400">
                            {/* ヘッダー */}
                            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-white">投票設定</h2>
                                <button
                                    type="button"
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <title>閉じる</title>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* コンテンツ */}
                            <div className="p-6">
                                {settings ? (
                                    <div className="space-y-6">
                                        {/* 設定変更可否 */}
                                        <div className="pb-4 border-b border-slate-700">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-white font-medium">設定の変更を許可</h3>
                                                    <p className="text-sm text-slate-400 mt-1">
                                                        投票開始後に設定を変更できるようにします
                                                    </p>
                                                </div>
                                                <div className={`px-3 py-1 rounded text-sm font-medium ${
                                                    settings.allowSettingChanges 
                                                        ? 'bg-lime-400/20 text-lime-400' 
                                                        : 'bg-slate-700 text-slate-400'
                                                }`}>
                                                    {settings.allowSettingChanges ? '有効' : '無効'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 締切日時 */}
                                        <div className="pb-4 border-b border-slate-700">
                                            <h3 className="text-white font-medium mb-3">締切日時</h3>
                                            <div className="bg-slate-800 rounded-lg p-4">
                                                {settings.deadline.enable ? (
                                                    <div className="flex items-center gap-3 text-slate-300">
                                                        <svg className="w-5 h-5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <title>カレンダー</title>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-xl text-lime-400 font-mono">
                                                            {settings.deadline.date} {settings.deadline.time}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-400">
                                                        締切なし
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* 閾値設定 */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-white font-medium">閾値設定</h3>
                                                <div className={`px-3 py-1 rounded text-sm font-medium ${
                                                    settings.autoDecision.enable 
                                                        ? 'bg-lime-400/20 text-lime-400' 
                                                        : 'bg-slate-700 text-slate-400'
                                                }`}>
                                                    {settings.autoDecision.enable ? '有効' : '無効'}
                                                </div>
                                            </div>
                                            {settings.autoDecision.enable && settings.autoDecision.threshold !== null && (
                                                <div className="bg-slate-800 rounded-lg p-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-3xl font-bold text-lime-400">
                                                            {settings.autoDecision.threshold}
                                                        </span>
                                                        <span className="text-slate-300">人以上で決定</span>
                                                    </div>
                                                    <p className="text-sm text-slate-400 mt-2">
                                                        {settings.autoDecision.threshold}人以上が投票した時に最も多く投票された日を通知します
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* RSS通知 */}
                                        <div className="pt-4 border-t border-slate-700">
                                            <h3 className="text-white font-medium mb-3">RSS通知</h3>
                                            <div className="bg-slate-800 rounded-lg p-4">
                                                {settings.rss.enable ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-5 h-5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <title>RSS有効</title>
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                            </svg>
                                                            <span className="text-lime-400 font-medium">有効</span>
                                                        </div>
                                                        <div className="bg-slate-950 border border-slate-600 rounded p-3">
                                                            <p className="text-xs text-slate-400 mb-1">RSSフィードURL:</p>
                                                            <p className="text-lime-400 text-sm font-mono break-all">
                                                                {`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/rss/${eventId}/feed`}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            このURLをRSSリーダーやSlack/Discord Botに登録すると、日程決定時に通知を受け取れます
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-400">
                                                        無効
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* JSON表示 */}
                                        <div className="pt-4 border-t border-slate-700">
                                            <h3 className="text-white font-medium mb-3">JSON設定</h3>
                                            <pre className="bg-slate-950 border border-slate-600 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">
                                                {JSON.stringify(settings, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <title>設定が見つかりません</title>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="text-slate-400 text-lg mb-4">設定が見つかりません</p>
                                        <p className="text-slate-500 text-sm mb-6">
                                            設定ページで投票の条件を設定してください
                                        </p>
                                        <Link
                                            href={`/${eventId}/setting`}
                                            className="inline-block px-6 py-3 bg-lime-400 text-slate-950 rounded-lg font-bold hover:bg-lime-300 transition-colors"
                                        >
                                            設定ページへ移動
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* フッター */}
                            {settings && (
                                <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-6 flex justify-between items-center">
                                    {settings.allowSettingChanges && (
                                        <Link
                                            href={`/${eventId}/setting`}
                                            className="text-lime-400 hover:text-lime-300 transition-colors font-medium"
                                        >
                                            設定を編集
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsSettingsOpen(false)}
                                        className={`px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors ${!settings.allowSettingChanges ? 'ml-auto' : ''}`}
                                    >
                                        閉じる
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}