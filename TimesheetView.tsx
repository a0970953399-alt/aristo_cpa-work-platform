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

export const TimesheetView: React.FC<TimesheetViewProps> = ({ currentUser, users, records, onUpdate, onClose }) => {
    const isSupervisor = currentUser.role === UserRole.SUPERVISOR;
    
    // 篩選狀態
    const [targetUserId, setTargetUserId] = useState<string>(isSupervisor ? 'ALL' : currentUser.id);
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7)); // 預設本月 (YYYY-MM)

    // 編輯狀態 (主管補登用)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const [editBreak, setEditBreak] = useState(1);

    // 計算與篩選邏輯
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (targetUserId !== 'ALL' && r.userId !== targetUserId) return false;
            if (!r.date.startsWith(monthFilter)) return false;
            return true;
        }).sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)); // 日期新到舊
    }, [records, targetUserId, monthFilter]);

    const totalHours = useMemo(() => {
        return filteredRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    }, [filteredRecords]);

    // 工具：計算工時 (無條件捨去小數點後一位，即 0.5)
    const calculateHours = (start: string, end: string, breakH: number) => {
        if (!start || !end) return 0;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const minutes = (eh * 60 + em) - (sh * 60 + sm);
        let hours = minutes / 60 - breakH;
        if (hours < 0) hours = 0;
        return Math.floor(hours * 2) / 2; // 核心邏輯：0.5 為單位無條件捨去
    };

    const handleSaveEdit = async (record: CheckInRecord) => {
        const newTotal = calculateHours(editStart, editEnd, editBreak);
        const updated: CheckInRecord = {
            ...record,
            startTime: editStart,
            endTime: editEnd,
            breakHours: editBreak,
            totalHours: newTotal
        };
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
        setEditStart(r.startTime);
        setEditEnd(r.endTime || '');
        setEditBreak(r.breakHours);
    };

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
                                    onChange={e => setTargetUserId(e.target.value)}
                                    className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer"
                                >
                                    <option value="ALL">全體人員</option>
                                    {users.filter(u => u.role === 'intern').map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
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
                    <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-xl font-bold text-lg">
                        總工時：{totalHours} <span className="text-sm">小時</span>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
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
                                        <td className="p-4 text-gray-600 font-mono">{r.date}</td>
                                        
                                        {/* 編輯模式 vs 檢視模式 */}
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
                                                            <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
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
                </div>
            </div>
        </div>
    );
};
