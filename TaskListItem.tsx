// src/TaskListItem.tsx

import React from 'react';
import { ClientTask, TaskStatusType, User } from './types'; // 記得引入 User
import { DocumentTextIcon, TrashIcon } from './Icons'; // 移除 LightningIcon

interface TaskListItemProps {
    task: ClientTask;
    readOnly: boolean;
    isSupervisor: boolean;
    users: User[]; // ✨ 新增：傳入使用者名單，為了查全名
    onUpdateStatus: (task: ClientTask, newStatus: TaskStatusType) => void;
    onEditNote: (task: ClientTask) => void;
    onDelete: (task: ClientTask) => void;
}

export const TaskListItem: React.FC<TaskListItemProps> = ({ task, readOnly, isSupervisor, users, onUpdateStatus, onEditNote, onDelete }) => {
    
    // 🔍 邏輯：透過 ID 找出使用者的「全名」(3個字)，如果找不到就用原本的縮寫
    const assigneeUser = users.find(u => u.id === task.assigneeId);
    const displayName = assigneeUser ? assigneeUser.name : task.assigneeName;

    // 判斷是否為臨時交辦 (MISC)
    const isMisc = task.category === 'MISC_TASK' || task.id.startsWith('misc_');

    return (
        <div className={`bg-white p-5 rounded-xl border-l-8 shadow-sm hover:shadow-md transition-all ${task.status === 'done' ? 'border-green-500 opacity-75' : task.status === 'in_progress' ? 'border-blue-500' : 'border-gray-300'}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    {/* ✨ 修改 1：如果是 MISC_TASK，就不要顯示這個分類標籤 */}
                    {!isMisc && (
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{task.category}</span>
                    )}
                    
                    {/* ✨ 修改 2：移除 LightningIcon，標題直接顯示 */}
                    <h3 className="font-bold text-gray-800 text-2xl mt-1">
                        {isMisc ? "行政交辦" : task.clientName}
                    </h3>
                    
                    <div className="text-lg font-medium text-blue-600 mt-1">{task.workItem}</div>
                </div>
                {!readOnly ? (
                    <div className="flex bg-gray-100 p-1 rounded-lg items-center">
                        <button onClick={() => onUpdateStatus(task, 'todo')} className={`px-4 py-2 text-base font-bold rounded-md transition-all ${task.status === 'todo' ? 'bg-white shadow text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>未開始</button>
                        <button onClick={() => onUpdateStatus(task, 'in_progress')} className={`px-4 py-2 text-base font-bold rounded-md transition-all ${task.status === 'in_progress' ? 'bg-blue-500 shadow text-white' : 'text-gray-400 hover:text-gray-600'}`}>進行中</button>
                        <button onClick={() => onUpdateStatus(task, 'done')} className={`px-4 py-2 text-base font-bold rounded-md transition-all ${task.status === 'done' ? 'bg-green-500 shadow text-white' : 'text-gray-400 hover:text-gray-600'}`}>完成</button>
                    </div>
                ) : (
                     <span className={`px-3 py-1.5 rounded text-base font-bold ${task.status === 'done' ? 'bg-green-100 text-green-700' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {task.status === 'done' ? '已完成' : task.status === 'in_progress' ? '進行中' : '未開始'}
                     </span>
                )}
            </div>
            
            {(task.note || !readOnly || isSupervisor) && (
                <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-lg text-gray-700 relative group flex justify-between items-start">
                    <span className="flex-1">{task.note ? task.note : <span className="text-gray-400 italic">尚無備註...</span>}</span>
                    <div className="flex gap-2">
                        {(!readOnly || isSupervisor) && (
                            <button onClick={() => onEditNote(task)} className="p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-blue-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>
                            </button>
                        )}
                        {isSupervisor && (
                            <button onClick={() => onDelete(task)} className="p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-600 transition-colors">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div className="mt-3 flex justify-between items-end text-sm text-gray-400 border-t pt-2">
                 <span>最後更新: {new Date(task.lastUpdatedAt).toLocaleDateString()} {task.lastUpdatedBy}</span>
                 {/* ✨ 修改 3：這裡改用 displayName (顯示全名) */}
                 {displayName && <span className="font-bold text-gray-500">負責人: {displayName}</span>}
            </div>
        </div>
    );
};
