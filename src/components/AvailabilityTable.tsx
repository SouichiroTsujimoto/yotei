'use client';

import { AvailabilityTableProps, Person } from '@/types/type';

export default function AvailabilityTable({ candidateDates, people, selectedDates, newPersonName, setNewPersonName }: AvailabilityTableProps) {

  if (candidateDates.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <p>左のカレンダーで日程を選択してください</p>
      </div>
    );
  }

  // 日付をフォーマット（月/日）
  const formatDate = (dateKey: string) => {
    const [, month, day] = dateKey.split('-');
    return `${parseInt(month)}/${day}`;
  };

  // 各日付の○の数を計算
  const dateAvailabilityCount = candidateDates.map((dateKey: string) => {
    const count = people.filter((person: Person) => person.availability.has(dateKey)).length;
    // 新規入力行の選択も含める
    const includeNewPerson = selectedDates.has(dateKey) ? 1 : 0;
    return {
      dateKey,
      count: count + includeNewPerson,
    };
  });
  
  // 日付ごとのグローエフェクトクラスを決定する関数
  const getDateGlowClass = (dateKey: string) => {
    const maxCount = people.length + 1;
    const currentCount = dateAvailabilityCount.find((item: { dateKey: string; count: number }) => item.dateKey === dateKey)?.count || 0;
    
    if (maxCount === 0) return '';
    
    // ○の数に応じてグローの強さを変える
    const intensity = currentCount / maxCount;
    
    if (intensity >= 1.0) return 'border-glow-strong';
    if (intensity >= 0.8) return 'border-glow-light';
    return '';
  };

  return (
    <div className="w-full h-full overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-lime-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-lime-300">
      <div className="min-w-full">
        <table className="w-full border-collapse">
          <thead>
              <tr className="bg-slate-950">
                <th className="bg-slate-950 border border-slate-600 px-2 sm:px-4 py-3 text-white font-bold sticky left-0 z-10 w-24 sm:w-32 md:w-40 lg:w-48">
                  名前
                </th>
              {candidateDates.map((dateKey: string) => {
                const glowClass = getDateGlowClass(dateKey);
                return (
                  <th
                    key={dateKey}
                    className={`border border-slate-600 px-3 py-3 text-white font-semibold text-sm whitespace-nowrap ${glowClass}`}
                  >
                    {formatDate(dateKey)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* 新規入力行 */}
            <tr className="group bg-slate-950 hover:bg-slate-800 transition-colors">
              <td className="bg-slate-950 border border-slate-600 px-2 sm:px-4 py-3 sticky left-0 group-hover:bg-slate-800 transition-colors z-10 w-24 sm:w-32 md:w-40 lg:w-48">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="名前を入力"
                  className="bg-slate-900 text-white px-2 py-1 rounded border border-slate-700 focus:border-lime-400 focus:outline-none"
                />
              </td>
              {candidateDates.map((dateKey: string) => {
                const isSelected = selectedDates.has(dateKey);
                const glowClass = getDateGlowClass(dateKey);
                return (
                  <td
                    key={`new-person-${dateKey}`}
                    className={`border border-slate-600 px-3 py-3 text-center font-bold text-xl ${
                      isSelected ? 'text-lime-400' : 'text-red-500'
                    } ${glowClass}`}
                  >
                    {isSelected ? '○' : '×'}
                  </td>
                );
              })}
            </tr>
            {people.map((person: Person) => (
              <tr key={person.id} className="group bg-slate-950 hover:bg-slate-800 transition-colors">
                <td className="bg-slate-950 border border-slate-600 px-2 sm:px-4 py-3 text-white font-semibold sticky left-0 group-hover:bg-slate-800 transition-colors z-10 w-24 sm:w-32 md:w-40 lg:w-48">
                  {person.name}
                </td>
                {candidateDates.map((dateKey: string) => {
                  const isAvailable = person.availability.has(dateKey);
                  const glowClass = getDateGlowClass(dateKey);
                  return (
                    <td
                      key={`${person.id}-${dateKey}`}
                      className={`border border-slate-600 px-3 py-3 text-center font-bold text-xl ${
                        isAvailable ? 'text-lime-400' : 'text-red-500'
                      } ${glowClass}`}
                    >
                      {isAvailable ? '○' : '×'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

