import React, { useState, useMemo } from 'react';
import { User, CheckInRecord, UserRole } from './types';
import { TaskService } from './taskService';
import { TrashIcon, FunnelIcon } from './Icons';

interface TimesheetViewProps {
    currentUser: User;
    users: User[];
    records: CheckInRecord[];
    onUpdate: () => void;
    onClose: () => void;
}

const ChartIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
);

const ListIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const HEATMAP_COLORS = [
    { label: '0h',    bg: 'bg-gray-200/50' },
    { label: '1–5h',  bg: 'bg-green-300/50' },
    { label: '5–8h',  bg: 'bg-green-500/50' },
    { label: '8–10h', bg: 'bg-green-700/50' },
    { label: '10h+',  bg: 'bg-orange-500/50' },
];

const getHeatmapBg = (hours: number): string => {
    if (hours <= 0) return 'bg-gray-200/50';
    if (hours < 5)  return 'bg-green-300/50';
    if (hours < 8)  return 'bg-green-500/50';
    if (hours < 10) return 'bg-green-700/50';
    return 'bg-orange-500/50';
};

export const TimesheetView: React.FC<TimesheetViewProps> = ({ currentUser, users, records, onUpdate, onClose }) => {
    const isSupervisor = currentUser.role === UserRole.SUPERVISOR || currentUser.role === UserRole.BOSS;

    const [targetUserId, setTargetUserId] = useState<string>(isSupervisor ? 'ALL' : currentUser.id);
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
    const [showHeatmap, setShowHeatmap] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const [editBreak, setEditBreak] = useState(1);

    const bossIds = useMemo(() => new Set(users.filter(u => u.role === UserRole.BOSS).map(u => u.id)), [users]);
    const nonBossUsers = useMemo(() => users.filter(u => !bossIds.has(u.id)), [users, bossIds]);

    const isMultiMode = targetUserId === 'ALL';

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (bossIds.has(r.userId)) return false;
            if (!isMultiMode && r.userId !== targetUserId) return false;
            if (!r.date.startsWith(monthFilter)) return false;
            return true;
        }).sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    }, [records, targetUserId, monthFilter, bossIds, isMultiMode]);

    const totalHours = useMemo(() => filteredRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0), [filteredRecords]);

    // 個人月曆熱力圖：每天工時加總
    const dailyHours = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRecords.forEach(r => {
            map[r.date] = (map[r.date] || 0) + (r.totalHours || 0);
        });
        return map;
    }, [filteredRecords]);

    // 多人熱力圖：{ userId → { date → hours } }
    const userDailyHours = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        records.filter(r => !bossIds.has(r.userId) && r.date.startsWith(monthFilter)).forEach(r => {
            if (!map[r.userId]) map[r.userId] = {};
            map[r.userId][r.date] = (map[r.userId][r.date] || 0) + (r.totalHours || 0);
        });
        return map;
    }, [records, monthFilter, bossIds]);

    // 當月天數與日曆週（個人模式用）
    const { daysInMonth, calendarWeeks } = useMemo(() => {
        const [year, month] = monthFilter.split('-').map(Number);
        const dim = new Date(year, month, 0).getDate();
        const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
        const cells: (number | null)[] = Array(firstDayOfWeek).fill(null);
        for (let d = 1; d <= dim; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        const weeks: (number | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
        return { daysInMonth: dim, calendarWeeks: weeks };
    }, [monthFilter]);

    const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    const calculateHours = (start: string, end: string, breakH: number) => {
        if (!start || !end) return 0;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const minutes = (eh * 60 + em) - (sh * 60 + sm);
        let hours = minutes / 60 - breakH;
        if (hours < 0) hours = 0;
        return Math.floor(hours * 2) / 2;
    };

    const handleSaveEdit = async (record: CheckInRecord) => {
        const newTotal = calculateHours(editStart, editEnd, editBreak);
        const updated: CheckInRecord = { ...record, date: editDate, startTime: editStart, endTime: editEnd, breakHours: editBreak, totalHours: newTotal };
        await TaskService.updateCheckIn(updated);
        setEditingId(null);
        onUpdate();
    };

    const handleDelete = async (id: string) => {
        if (confirm('確定刪除此筆紀錄？')) {
            await TaskService.deleteCheckIn(id);
            onUpdate();
        }
    };

    const startEdit = (r: CheckInRecord) => {
        setEditingId(r.id);
        setEditDate(r.date);
        setEditStart(r.startTime);
        setEditEnd(r.endTime || '');
        setEditBreak(r.breakHours);
    };

    const Legend = () => (
        <div className="mt-4 pt-3 border-t flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-bold">工時區間</span>
            {HEATMAP_COLORS.map(({ label, bg }) => (
                <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded ${bg}`} />
                    <span className="text-xs text-gray-400">{label}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⏱️</span>
                        <h2 className="text-2xl font-bold text-gray-800">工時紀錄表</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                </div>

                {/* Filter Bar */}
                <div className="p-4 border-b bg-white flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                            <FunnelIcon className="w-5 h-5 text-gray-500" />
                            {isSupervisor ? (
                                <select
                                    value={targetUserId}
                                    onChange={e => { setTargetUserId(e.target.value); setShowHeatmap(false); }}
                                    className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer"
                                >
                                    <option value="ALL">全體人員</option>
                                    {users.filter(u => u.role !== UserRole.BOSS).map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.id === currentUser.id ? `${u.name} (自己)` : u.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <span className="font-bold text-gray-700">{currentUser.name}</span>
                            )}
                        </div>
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-base outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-xl font-bold text-lg">
                            總工時：{totalHours} <span className="text-sm">小時</span>
                        </div>
                        <button
                            onClick={() => setShowHeatmap(v => !v)}
                            title={showHeatmap ? '切換回列表' : (isMultiMode ? '顯示團隊熱力圖' : '顯示個人熱力圖')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition-colors border
                                ${showHeatmap
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                                    : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'
                                }`}
                        >
                            {showHeatmap ? <ListIcon className="w-4 h-4" /> : <ChartIcon className="w-4 h-4" />}
                            {showHeatmap ? '列表' : '熱力圖'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 custom-scrollbar ${showHeatmap ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    {showHeatmap ? (
                        isMultiMode ? (
                            /* 多人熱力圖：人員 × 日期 */
                            <div className="p-4">
                                <div className="flex items-center gap-1 mb-1.5">
                                    <div className="w-20 shrink-0" />
                                    {days.map(d => (
                                        <div key={d} className="flex-1 text-center text-xs font-bold text-gray-400">{d}</div>
                                    ))}
                                </div>
                                {nonBossUsers.map(user => (
                                    <div key={user.id} className="flex items-center gap-1 mb-1.5">
                                        <div className="w-20 shrink-0 text-sm font-bold text-gray-700 truncate pr-1">{user.name}</div>
                                        {days.map(d => {
                                            const dateStr = `${monthFilter}-${String(d).padStart(2, '0')}`;
                                            const hours = userDailyHours[user.id]?.[dateStr] || 0;
                                            return (
                                                <div key={d} className={`flex-1 h-8 rounded ${getHeatmapBg(hours)}`} />
                                            );
                                        })}
                                    </div>
                                ))}
                                <Legend />
                            </div>
                        ) : (
                            /* 個人熱力圖：月曆格式 */
                            <div className="p-4">
                                <div className="grid grid-cols-7 gap-1.5 mb-1">
                                    {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                                        <div key={d} className="text-center text-sm font-bold text-gray-400 py-1">{d}</div>
                                    ))}
                                </div>
                                {calendarWeeks.map((week, wi) => (
                                    <div key={wi} className="grid grid-cols-7 gap-1.5 mb-1.5">
                                        {week.map((day, di) => {
                                            if (!day) return <div key={di} />;
                                            const dateStr = `${monthFilter}-${String(day).padStart(2, '0')}`;
                                            const hours = dailyHours[dateStr] || 0;
                                            return (
                                                <div
                                                    key={di}
                                                    className={`${getHeatmapBg(hours)} rounded-xl h-10 flex items-center justify-center transition-all`}
                                                >
                                                    <span className="text-base font-bold text-gray-800">{day}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                                <Legend />
                            </div>
                        )
                    ) : (
                        /* 列表模式 */
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-4 font-bold text-gray-500 text-sm">人員</th>
                                    <th className="p-4 font-bold text-gray-500 text-sm">日期</th>
                                    <th className="p-4 font-bold text-gray-500 text-sm text-center">上班</th>
                                    <th className="p-4 font-bold text-gray-500 text-sm text-center">下班</th>
                                    <th className="p-4 font-bold text-gray-500 text-sm text-center">扣除午休</th>
                                    <th className="p-4 font-bold text-gray-500 text-sm text-center">小計工時</th>
                                    {isSupervisor && <th className="p-4 font-bold text-gray-500 text-sm text-center">操作</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.length === 0 ? (
                                    <tr><td colSpan={7} className="p-10 text-center text-gray-400">沒有符合的紀錄</td></tr>
                                ) : (
                                    filteredRecords.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold text-gray-700">{r.userName}</td>
                                            <td className="p-2 text-gray-600 font-mono">
                                                {editingId === r.id
                                                    ? <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="border rounded p-1 w-full text-center font-mono" />
                                                    : r.date
                                                }
                                            </td>
                                            {editingId === r.id ? (
                                                <>
                                                    <td className="p-2 text-center"><input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="border rounded p-1 w-full text-center" /></td>
                                                    <td className="p-2 text-center"><input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="border rounded p-1 w-full text-center" /></td>
                                                    <td className="p-2 text-center"><input type="number" step="0.5" value={editBreak} onChange={e => setEditBreak(Number(e.target.value))} className="border rounded p-1 w-16 text-center" /></td>
                                                    <td className="p-4 text-center font-bold text-blue-600">{calculateHours(editStart, editEnd, editBreak)}</td>
                                                    <td className="p-4 text-center flex gap-2 justify-center">
                                                        <button onClick={() => handleSaveEdit(r)} className="text-xs bg-green-500 text-white px-2 py-1 rounded">存</button>
                                                        <button onClick={() => setEditingId(null)} className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded">消</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-4 text-center font-mono text-gray-700">{r.startTime}</td>
                                                    <td className="p-4 text-center font-mono text-gray-700">{r.endTime || '--:--'}</td>
                                                    <td className="p-4 text-center text-gray-500">{r.breakHours} hr</td>
                                                    <td className="p-4 text-center font-bold text-blue-600 text-lg">{r.totalHours}</td>
                                                    {isSupervisor && (
                                                        <td className="p-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-blue-600 text-sm">編輯</button>
                                                                <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
