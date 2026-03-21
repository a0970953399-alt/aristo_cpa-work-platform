// src/ListView.tsx

import React, { useRef, useState, useEffect } from 'react';
import { ClientTask, TaskStatusType, User, UserRole,} from './types';
import { FunnelIcon, ChevronDownIcon, DocumentTextIcon } from './Icons'; // 記得引入 DocumentTextIcon
import { TaskListItem } from './TaskListItem';

interface ListViewProps {
    tasks: ClientTask[];
    currentUser: User;
    isSupervisor: boolean;
    currentYear: string;
    users: User[];
    viewTargetId: string;
    setViewTargetId: (id: string) => void;
    onUpdateStatus: (task: ClientTask, newStatus: TaskStatusType) => void;
    onEditNote: (task: ClientTask) => void;
    onDelete: (task: ClientTask) => void;
    onGenerateReport: () => void; // ✨ 新增這行
}

export const ListView: React.FC<ListViewProps> = ({
    tasks, currentUser, isSupervisor, currentYear, users, 
    viewTargetId, setViewTargetId, onUpdateStatus, onEditNote, onDelete, onGenerateReport // ✨ 記得解構出來
}) => {
    const [filterStatus, setFilterStatus] = useState<'ALL' | TaskStatusType>('ALL');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    
    const filterRef = useRef<HTMLDivElement>(null);
    const statusFilterRef = useRef<HTMLDivElement>(null);

    // ✨ 新增：建立不包含老闆的名單 (用於按鈕與下拉選單)
    const assignableUsers = users.filter(u => u.role !== UserRole.BOSS);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) { setIsFilterOpen(false); }
            if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) { setIsStatusFilterOpen(false); }
        }
        if (isFilterOpen || isStatusFilterOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isFilterOpen, isStatusFilterOpen]);

    const filteredTasks = React.useMemo(() => { 
        // ✨ 取得「今天」的日期字串 (例如: "Fri Feb 20 2026")
        const todayStr = new Date().toDateString();

        return tasks.filter(t => { 
            if (t.year !== currentYear) return false; 
            if (isSupervisor) { 
                if (viewTargetId !== 'ALL' && t.assigneeId !== viewTargetId) return false; 
            } else { 
                if (t.assigneeId !== currentUser.id) return false; 
            } 
            if (filterStatus !== 'ALL') { 
                if (t.status !== filterStatus) return false; 
            } 

            // ✨ 新增邏輯：隱藏昨天以前「已完成」的工作
            if (t.status === 'done' || t.isNA) {
                if (t.lastUpdatedAt) {
                    const taskUpdateDate = new Date(t.lastUpdatedAt).toDateString();
                    // 如果任務的最後更新日期「不是今天」，就不顯示
                    if (taskUpdateDate !== todayStr) {
                        return false;
                    }
                } else {
                    // 如果沒有時間戳記 (舊資料保護)，直接隱藏
                    return false;
                }
            }

            return true; 
        }); 
    }, [tasks, currentYear, isSupervisor, viewTargetId, currentUser.id, filterStatus]);

    return (
        <div className="absolute inset-0 overflow-y-auto px-6 py-6 custom-scrollbar">
            <div className="max-w-5xl mx-auto pb-10">
                <div className="flex items-center justify-between sticky top-0 bg-gray-50 z-30 py-2 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">📋 {isSupervisor ? "每日進度監控" : "今日工作清單"} <span className="text-base font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">民國{currentYear}年</span></h2>
                    <div className="flex items-center gap-3">
                        
                        {/* ✨ 新增：複製日報按鈕 (在篩選器左邊) */}
                        <button 
                            onClick={onGenerateReport} 
                            className="bg-white border border-gray-300 p-2 rounded-xl text-gray-500 hover:text-green-600 hover:border-green-600 hover:bg-green-50 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                            title="複製今日工作匯報"
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                        </button>

                        {/* Status Filter */}
                        <div className="relative" ref={statusFilterRef}>
                            <button onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-xl text-base font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                                <FunnelIcon className="w-5 h-5 text-gray-500" />
                                <span>{filterStatus === 'ALL' ? '全部狀態' : filterStatus === 'todo' ? '未執行' : filterStatus === 'in_progress' ? '進行中' : '已完成'}</span>
                                <ChevronDownIcon />
                            </button>
                            {isStatusFilterOpen && <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                <button onClick={() => { setFilterStatus('ALL'); setIsStatusFilterOpen(false); }} className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-base font-medium border-b border-gray-100 last:border-0">全部狀態</button>
                                <button onClick={() => { setFilterStatus('todo'); setIsStatusFilterOpen(false); }} className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-base font-medium border-b border-gray-100 last:border-0 text-gray-600">未執行</button>
                                <button onClick={() => { setFilterStatus('in_progress'); setIsStatusFilterOpen(false); }} className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-base font-medium border-b border-gray-100 last:border-0 text-blue-600">進行中</button>
                                <button onClick={() => { setFilterStatus('done'); setIsStatusFilterOpen(false); }} className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-base font-medium border-b border-gray-100 last:border-0 text-green-600">已完成</button>
                            </div>}
                        </div>

                        {isSupervisor && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-gray-100">
                        <span className="text-sm font-bold text-gray-500 whitespace-nowrap pl-1">人員篩選</span>
                        <button 
                            onClick={() => setViewTargetId('ALL')}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${viewTargetId === 'ALL' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >
                            全所進度
                        </button>
                        {assignableUsers.map(u => (
                            <button 
                                key={u.id}
                                onClick={() => setViewTargetId(u.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm border ${viewTargetId === u.id ? 'bg-white border-blue-500 text-blue-600 shadow-blue-100' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full bg-gray-100" />
                                {u.name}
                            </button>
                        ))}
                    </div>
                )}
                    </div>
                </div>
                <div className="space-y-4">
                    {filteredTasks.map(task => (
                        <TaskListItem 
                            key={task.id} 
                            task={task} 
                            readOnly={task.assigneeId !== currentUser.id} 
                            isSupervisor={isSupervisor}
                            users={users}
                            onUpdateStatus={onUpdateStatus}
                            onEditNote={onEditNote}
                            onDelete={onDelete}
                        />
                    ))}
                    {filteredTasks.length === 0 && <div className="text-center py-20 text-gray-400 text-xl">目前沒有工作項目</div>}
                </div>
            </div>
        </div>
    );
};
