// src/WorkCheckIn.tsx

import React, { useState, useEffect } from 'react';

// 定義打卡資料的格式
interface WorkLog {
    id: string;
    name: string;
    type: 'CLOCK_IN' | 'CLOCK_OUT'; // 上班 或 下班
    timestamp: number; // 打卡時間
    status: 'PENDING' | 'APPROVED' | 'REJECTED'; // 待審核 | 已核准 | 駁回
    note?: string; 
}

export const WorkCheckIn: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // 身份切換：工讀生 vs 主管(周愉)
    const [currentRole, setCurrentRole] = useState<'INTERN' | 'SUPERVISOR'>('INTERN');
    
    // 資料庫 (暫存於 localStorage)
    const [logs, setLogs] = useState<WorkLog[]>([]);

    useEffect(() => {
        const savedLogs = localStorage.getItem('work_logs');
        if (savedLogs) {
            setLogs(JSON.parse(savedLogs));
        }
    }, []);

    const saveLogs = (newLogs: WorkLog[]) => {
        setLogs(newLogs);
        localStorage.setItem('work_logs', JSON.stringify(newLogs));
    };

    // --- 工讀生功能 ---
    
    const handleClockIn = () => {
        const newLog: WorkLog = {
            id: Date.now().toString(),
            name: '工讀生A', 
            type: 'CLOCK_IN',
            timestamp: Date.now(),
            status: 'APPROVED' // 上班直接成功
        };
        saveLogs([newLog, ...logs]);
        alert("✅ 上班打卡成功！");
    };

    const handleClockOut = () => {
        const newLog: WorkLog = {
            id: Date.now().toString(),
            name: '工讀生A',
            type: 'CLOCK_OUT',
            timestamp: Date.now(),
            status: 'PENDING' // ⚠️ 狀態：待周愉審核
        };
        saveLogs([newLog, ...logs]);
        alert("⏳ 下班申請已送出！您可以先離開，待周愉主管審核。");
    };

    // --- 主管(周愉)功能 ---

    const handleApprove = (logId: string) => {
        const newLogs = logs.map(log => 
            log.id === logId ? { ...log, status: 'APPROVED' as const } : log
        );
        saveLogs(newLogs);
    };

    const handleReject = (logId: string) => {
        const newLogs = logs.map(log => 
            log.id === logId ? { ...log, status: 'REJECTED' as const } : log
        );
        saveLogs(newLogs);
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 bg-gray-100 z-[100] overflow-auto">
            {/* 頂部導航列 */}
            <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">⏰ 打卡管理系統</h2>
                    <div className="flex bg-gray-200 rounded-lg p-1 text-sm">
                        <button 
                            onClick={() => setCurrentRole('INTERN')}
                            className={`px-4 py-1 rounded-md transition-all ${currentRole === 'INTERN' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                        >
                            我是工讀生
                        </button>
                        <button 
                            onClick={() => setCurrentRole('SUPERVISOR')}
                            className={`px-4 py-1 rounded-md transition-all ${currentRole === 'SUPERVISOR' ? 'bg-white shadow text-purple-600 font-bold' : 'text-gray-500'}`}
                        >
                            我是周愉 (主管)
                        </button>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-lg">✕ 關閉</button>
            </div>

            <div className="max-w-4xl mx-auto p-6">
                
                {/* ================= 工讀生介面 ================= */}
                {currentRole === 'INTERN' && (
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                            <h3 className="text-2xl font-bold text-gray-700 mb-2">早安，工讀生 A</h3>
                            <p className="text-gray-400 mb-8">今天是 {new Date().toLocaleDateString()}</p>
                            
                            <div className="flex justify-center gap-8">
                                <button 
                                    onClick={handleClockIn}
                                    className="w-40 h-40 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2"
                                >
                                    <span>☀️</span>
                                    上班打卡
                                </button>
                                <button 
                                    onClick={handleClockOut}
                                    className="w-40 h-40 rounded-full bg-orange-400 hover:bg-orange-500 text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2"
                                >
                                    <span>🌙</span>
                                    下班打卡
                                </button>
                            </div>
                        </div>

                        {/* 工讀生自己的紀錄 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            <h4 className="font-bold text-gray-700 mb-4">我的打卡紀錄</h4>
                            {logs.map(log => (
                                <div key={log.id} className="flex justify-between items-center py-3 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-1 rounded ${log.type === 'CLOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {log.type === 'CLOCK_IN' ? '上班' : '下班'}
                                        </span>
                                        <span className="font-mono text-gray-600">{formatTime(log.timestamp)}</span>
                                    </div>
                                    <div>
                                        {log.status === 'PENDING' && <span className="text-yellow-600 font-bold text-sm bg-yellow-50 px-2 py-1 rounded">⏳ 待周愉審核</span>}
                                        {log.status === 'APPROVED' && <span className="text-green-600 font-bold text-sm">✅ 已確認</span>}
                                        {log.status === 'REJECTED' && <span className="text-red-500 font-bold text-sm">❌ 被駁回</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ================= 主管介面 (周愉) ================= */}
                {currentRole === 'SUPERVISOR' && (
                    <div className="space-y-6">
                        
                        {/* ⚠️ 待審核區域 (黃色框框) */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                🔔 待辦事項 (我是周愉)
                                {logs.filter(l => l.status === 'PENDING').length > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{logs.filter(l => l.status === 'PENDING').length}</span>
                                )}
                            </h3>
                            
                            {logs.filter(l => l.status === 'PENDING').map(log => (
                                <div key={log.id} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm flex justify-between items-center animate-fade-in">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-800 text-lg">{log.name}</span>
                                            <span className="text-sm text-gray-500">申請下班</span>
                                        </div>
                                        <div className="text-gray-600">
                                            打卡時間：<span className="font-mono font-bold text-gray-800">{formatTime(log.timestamp)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleReject(log.id)}
                                            className="px-4 py-2 text-red-500 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            駁回
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(log.id)}
                                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                                        >
                                            ✅ 確認下班
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {logs.filter(l => l.status === 'PENDING').length === 0 && (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed text-gray-400">
                                    目前沒有待審核的下班申請 🎉
                                </div>
                            )}
                        </div>

                        {/* 歷史紀錄 */}
                        <div className="mt-8 pt-8 border-t">
                            <h3 className="font-bold text-gray-600 mb-4">今日打卡流水帳</h3>
                            <table className="w-full text-left bg-white rounded-lg shadow-sm overflow-hidden">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="p-3">姓名</th>
                                        <th className="p-3">動作</th>
                                        <th className="p-3">時間</th>
                                        <th className="p-3">狀態</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="p-3">{log.name}</td>
                                            <td className="p-3">
                                                <span className={`text-xs px-2 py-1 rounded ${log.type === 'CLOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {log.type === 'CLOCK_IN' ? '上班' : '下班'}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono">{formatTime(log.timestamp)}</td>
                                            <td className="p-3">
                                                {log.status === 'APPROVED' ? <span className="text-green-600 text-sm">● 周愉已核准</span> : 
                                                 log.status === 'REJECTED' ? <span className="text-red-500 text-sm">● 已駁回</span> :
                                                 <span className="text-yellow-600 text-sm">● 待審核</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
