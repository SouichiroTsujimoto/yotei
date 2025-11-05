'use client';

import React, { useState } from 'react';

type CalendarItem = {
  type: 'empty' | 'day';
  day: number; // emptyの場合は-1
  id: string;
};

type VotingCalendarProps = {
  candidateDates: Set<string>;
  selectedDates: Set<string>;
  setSelectedDates: (dates: Set<string>) => void;
};

export default function VotingCalendar({ candidateDates, selectedDates, setSelectedDates }: VotingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

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
    days.push({ type: 'empty', day: -1, id: `empty-${year}-${month+1}-${i}` });
  }
  
  // 日付を追加
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ type: 'day', day, id: `${year}-${month+1}-${day}` });
  }

  // 日付をクリックした時の処理
  const handleDateClick = (day: number) => {
    const dateKey = `${year}-${month+1}-${day}`;
    const newSelected = new Set(selectedDates);
    
    if (!candidateDates.has(dateKey)) {
      return;
    }

    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey);
    } else {
      newSelected.add(dateKey);
    }
    
    setSelectedDates(newSelected);
  };
  
  const handleDayOfWeekClick = (index: number) => {
    const newSelected = new Set(selectedDates);
    
    const topDateIndex = index;
    for (let i = 0; i < daysInMonth - index; i+=7) {
      const item = days[i + topDateIndex];
      
      
      if (item.type === 'day') {
        const dateKey = item.id;
        if (!candidateDates.has(dateKey)) {
          continue;
        }

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
        if (!candidateDates.has(dateKey)) {
            continue;
        }
        
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

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  
  // 週の数を計算
  const totalWeeks = Math.ceil(days.length / 7);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-950 border border-lime-400 rounded-lg">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={prevMonth}
          className="px-4 py-2 bg-slate-950 text-white hover:text-slate-950 rounded hover:bg-white transition-colors"
        >
          ←
        </button>
        <h2 className="text-2xl text-white font-bold">
          {year}年 {monthNames[month]}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          className="px-4 py-2 bg-slate-950 text-white hover:text-slate-950 rounded hover:bg-white transition-colors"
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
          const weekKey = `week-${year}-${month+1}-${weekIndex}`;
          
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

                const isCandidate = candidateDates.has(dateKey);
                
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`
                      aspect-square rounded-lg font-medium transition-all duration-100
                      hover:scale-110 hover:shadow-md
                      ${
                        isCandidate ? 'border border-lime-400' : ''
                      }
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
    </div>
  );
}

