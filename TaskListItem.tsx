
import React from 'react';
import { ClientTask, TaskStatusType } from './types';
import { DocumentTextIcon, TrashIcon } from './Icons';

interface TaskListItemProps {
    task: ClientTask;
    readOnly: boolean;
    isSupervisor: boolean;
    onUpdateStatus: (task: ClientTask, newStatus: TaskStatusType) => void;
    onEditNote: (task: ClientTask) => void;
    onDelete: (task: ClientTask) => void;
}

export const TaskListItem: React.FC<TaskListItemProps> = ({ task, readOnly, isSupervisor, onUpdateStatus, onEditNote, onDelete }) => {
    return (
        <div className={`bg-white p-5 rounded-xl border-l-8 shadow-sm hover:shadow-md transition-all ${task.status === 'done' ? 'border-green-500 opacity-75' : task.status === 'in_progress' ? 'border-blue-500' : 'border-gray-300'}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{task.category}</span>
                    <h3 className="font-bold text-gray-800 text-2xl mt-1">{task.clientName}</h3>
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
            
            {/* 🔴 修改重點 1: 顯示條件改為 (有備註 OR 不是唯讀 OR 是主管) */}
            {/* 這樣就算工讀生沒寫備註，主管也能看到這區塊 (為了看到刪除按鈕) */}
            {(task.note || !readOnly || isSupervisor) && (
                <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-lg text-gray-700 relative group flex justify-between items-start">
                    <span className="flex-1">{task.note ? task.note : <span className="text-gray-400 italic">尚無備註...</span>}</span>
                    <div className="flex gap-2">
                        {/* 🔴 修改重點 2: 編輯按鈕條件改為 (不是唯讀 OR 是主管) */}
                        {/* 這樣主管就能修改任何人的備註了 */}
                        {(!readOnly || isSupervisor) && (
                            <button onClick={() => onEditNote(task)} className="p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-blue-600 transition-colors">
                                <DocumentTextIcon className="w-5 h-5"/>
                            </button>
                        )}
                        {/* 刪除按鈕維持原樣，只有主管看得到 */}
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
                 {task.assigneeName && <span className="font-bold text-gray-500">負責人: {task.assigneeName}</span>}
            </div>
        </div>
    );
};
