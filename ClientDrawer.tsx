
import React, { useState, useEffect, useMemo } from 'react';
import { Client, ClientProfile, ClientTask, TabCategory } from './types';
import { MATRIX_TABS } from './constants';
import { TaskService } from './services/taskService';
import { BellAlertIcon, DocumentTextIcon } from './Icons';

interface ClientDrawerProps {
    client: Client;
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: ClientProfile) => void;
    currentYear: string;
    tasks: ClientTask[];
    isReadOnly?: boolean;
}

export const ClientDrawer: React.FC<ClientDrawerProps> = ({ client, isOpen, onClose, onSave, currentYear, tasks, isReadOnly = false }) => {
    const [profile, setProfile] = useState<ClientProfile>({ clientId: client.id, specialNotes: "", accountingNotes: "" });
    const [editingSpecial, setEditingSpecial] = useState(false);
    const [editingAccounting, setEditingAccounting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const data = TaskService.getClientProfile(client.id);
            setProfile(data);
            setEditingSpecial(false);
            setEditingAccounting(false);
        }
    }, [isOpen, client.id]);

    const handleChange = (field: keyof ClientProfile, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(profile);
        setEditingSpecial(false);
        setEditingAccounting(false);
    };

    if (!isOpen) return null;

    const progressStats = useMemo(() => {
        const clientTasks = tasks.filter(t => t.clientId === client.id && t.year === currentYear && !t.isMisc);
        const stats: Record<string, { total: number, done: number }> = {};
        
        MATRIX_TABS.forEach(tab => {
             const tabTasks = clientTasks.filter(t => t.category === tab);
             const total = tabTasks.length; 
             const done = tabTasks.filter(t => t.status === 'done' || t.isNA).length;
             stats[tab] = { total, done };
        });
        return stats;
    }, [tasks, client.id, currentYear]);

    return (
        <div className="fixed inset-0 z-[130] overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity animate-fade-in" onClick={onClose}></div>
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex pointer-events-none">
                <div className="w-screen max-w-2xl pointer-events-auto animate-slide-in-right">
                    <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll bg-gray-50">
                        <div className="px-8 py-6 bg-white border-b border-gray-200">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 leading-tight" id="slide-over-title">{client.name}</h2>
                                    {isReadOnly && <span className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded mt-2 inline-block">僅供檢視</span>}
                                </div>
                                <div className="ml-3 h-7 flex items-center">
                                    <button onClick={onClose} className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                                        <span className="sr-only">Close panel</span>
                                        <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex-1 px-8 py-8 space-y-8">
                            
                            <div className={`rounded-xl p-6 border-2 transition-all ${editingSpecial ? 'bg-white border-red-300 shadow-lg' : 'bg-red-50 border-red-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-red-800 font-bold flex items-center gap-3 text-lg">
                                        <BellAlertIcon className="w-6 h-6" />
                                        特殊注意事項 & 客戶習性
                                    </h3>
                                    {!isReadOnly && (
                                        <button 
                                            onClick={() => editingSpecial ? handleSave() : setEditingSpecial(true)}
                                            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${editingSpecial ? 'bg-green-600 text-white' : 'bg-red-200 text-red-800 hover:bg-red-300'}`}
                                        >
                                            {editingSpecial ? '儲存設定' : '編輯內容'}
                                        </button>
                                    )}
                                </div>
                                {editingSpecial ? (
                                    <textarea 
                                        className="w-full h-40 p-4 text-base border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                        placeholder="例如：老闆很兇、拒絕電子檔..."
                                        value={profile.specialNotes}
                                        onChange={(e) => handleChange('specialNotes', e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="text-red-900 text-base whitespace-pre-wrap leading-relaxed min-h-[4rem]">
                                        {profile.specialNotes || "尚無特殊注意事項。"}
                                    </div>
                                )}
                            </div>

                            <div className={`rounded-xl p-6 border-2 transition-all ${editingAccounting ? 'bg-white border-blue-300 shadow-lg' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-blue-800 font-bold flex items-center gap-3 text-lg">
                                        <DocumentTextIcon className="w-6 h-6" />
                                        入帳注意事項
                                    </h3>
                                    {!isReadOnly && (
                                        <button 
                                            onClick={() => editingAccounting ? handleSave() : setEditingAccounting(true)}
                                            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${editingAccounting ? 'bg-green-600 text-white' : 'bg-blue-200 text-blue-800 hover:bg-blue-300'}`}
                                        >
                                            {editingAccounting ? '儲存設定' : '編輯內容'}
                                        </button>
                                    )}
                                </div>
                                {editingAccounting ? (
                                    <textarea 
                                        className="w-full h-40 p-4 text-base border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="例如：發票品名需開顧問費、每月需提供損益表..."
                                        value={profile.accountingNotes || ""}
                                        onChange={(e) => handleChange('accountingNotes', e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="text-blue-900 text-base whitespace-pre-wrap leading-relaxed min-h-[4rem]">
                                        {profile.accountingNotes || "尚無入帳注意事項。"}
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 border-t border-gray-200">
                                <h3 className="text-gray-500 font-bold text-sm tracking-widest uppercase mb-4">本年度各項進度概覽 ({currentYear})</h3>
                                <div className="space-y-4">
                                    {MATRIX_TABS.map(tab => {
                                        const stat = progressStats[tab] || { total: 0, done: 0 };
                                        const percent = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0;
                                        let colorClass = "bg-gray-200";
                                        if (percent === 100) colorClass = "bg-green-500";
                                        else if (percent > 0) colorClass = "bg-blue-500";

                                        return (
                                            <div key={tab} className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-gray-600 w-24">{tab}</span>
                                                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
                                                </div>
                                                <span className="text-sm font-mono text-gray-400 w-10 text-right">{percent}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
