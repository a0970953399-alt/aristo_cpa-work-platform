// src/CashLogView.tsx

import React, { useState, useMemo } from 'react';
import { CashRecord, Client, CashAccountType } from './types';
import { TaskService } from './taskService';
import { PlusIcon, TrashIcon, ReturnIcon } from './Icons';

// 擴充 Icons
const PencilIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const BanknotesIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
);

const SortIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
    </svg>
);

interface CashLogViewProps {
    records: CashRecord[];
    clients: Client[];
    onUpdate: () => void;
    isSupervisor: boolean;
}

type ViewMode = 'dashboard' | 'shuoye' | 'yongye' | 'puhe' | 'client_detail';

export const CashLogView: React.FC<CashLogViewProps> = ({ records, clients, onUpdate, isSupervisor }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [sortDesc, setSortDesc] = useState(false); // ✨ 預設升序 (舊->新) 符合會計習慣
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CashRecord | null>(null);
    const [isProcessing, setIsProcessing] = useState(false); // 防止重複點擊

    // --- 資料處理邏輯 ---

    // 取得當前顯示的紀錄
    const currentRecords = useMemo(() => {
        let filtered = [];
        if (viewMode === 'shuoye') {
            filtered = records.filter(r => r.account === 'shuoye');
        } else if (viewMode === 'yongye') {
            filtered = records.filter(r => r.account === 'yongye');
        } else if (viewMode === 'puhe') {
            filtered = records.filter(r => r.account === 'puhe');
        } else if (viewMode === 'client_detail' && selectedClient) {
            filtered = records.filter(r => r.clientId === selectedClient.id);
        }
        
        // ✨ 排序邏輯：根據 sortDesc 切換
        return filtered.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortDesc ? dateB - dateA : dateA - dateB;
        });
    }, [records, viewMode, selectedClient, sortDesc]);

    // 計算結餘 (僅針對內部帳本)
    const recordsWithBalance = useMemo(() => {
        if (viewMode === 'client_detail') return currentRecords;
        
        // 結餘必須永遠是「從舊到新」累加，所以如果現在是降序顯示，我們要先反轉回來算，算完再反轉回去
        // 但為了顯示正確，通常會計帳本建議「舊 -> 新」排列
        
        let balance = 0;
        // 先強制用「舊 -> 新」來算結餘
        const sortedForCalc = [...currentRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const calculated = sortedForCalc.map(r => {
            if (r.type === 'income') balance += Number(r.amount);
            else balance -= Number(r.amount);
            return { ...r, currentBalance: balance };
        });

        // 算完後，如果使用者選「新 -> 舊」，再反轉回來顯示
        return sortDesc ? calculated.reverse() : calculated;
    }, [currentRecords, viewMode, sortDesc]);


    // 處理刪除
    const handleDelete = async (id: string) => {
        if (!isSupervisor || isProcessing) return;
        if (confirm("確定要刪除這筆紀錄嗎？")) {
            setIsProcessing(true);
            try {
                await TaskService.deleteCashRecord(id);
                onUpdate();
            } finally {
                setIsProcessing(false);
            }
        }
    };

    // ✨ 快速切換「已請款」狀態
    const handleToggleReimbursed = async (record: CashRecord) => {
        if (!isSupervisor || isProcessing) return;
        setIsProcessing(true); // 鎖定
        try {
            const updated = { ...record, isReimbursed: !record.isReimbursed };
            await TaskService.updateCashRecord(updated);
            onUpdate();
        } catch (e) {
            alert("更新失敗");
        } finally {
            setIsProcessing(false); // 解鎖
        }
    };

    // --- 渲染部分 ---

    // 1. Dashboard (入口畫面)
    if (viewMode === 'dashboard') {
        return (
            <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
                {/* 🅰️ 上半部：事務所金庫區 */}
                <div className="p-6 pb-2">
                    <h3 className="text-gray-500 font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-sm">
                        <BanknotesIcon className="w-5 h-5" /> 事務所帳本
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button onClick={() => setViewMode('shuoye')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-purple-100 hover:border-purple-300 transition-all group text-left">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">🟣</span>
                            </div>
                            <h4 className="text-xl font-black text-gray-800">碩業零用金</h4>
                            <p className="text-sm text-gray-500 mt-1">總帳、客戶代墊款連動</p>
                        </button>
                        <button onClick={() => setViewMode('yongye')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-green-100 hover:border-green-300 transition-all group text-left">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">🟢</span>
                            </div>
                            <h4 className="text-xl font-black text-gray-800">永業零用金</h4>
                            <p className="text-sm text-gray-500 mt-1">獨立帳本</p>
                        </button>
                        <button onClick={() => setViewMode('puhe')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-orange-100 hover:border-orange-300 transition-all group text-left">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">🟠</span>
                            </div>
                            <h4 className="text-xl font-black text-gray-800">璞和零用金</h4>
                            <p className="text-sm text-gray-500 mt-1">簡易紀錄</p>
                        </button>
                    </div>
                </div>

                {/* 🅱️ 下半部：客戶代墊監控區 */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <h3 className="text-gray-500 font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-sm sticky top-0 bg-gray-50 z-10 py-2">
                        <span className="text-xl">👥</span> 客戶代墊紀錄
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {clients.map(client => (
                            <button 
                                key={client.id}
                                onClick={() => { setSelectedClient(client); setViewMode('client_detail'); }}
                                className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
                            >
                                <span className="bg-gray-100 text-gray-600 font-mono font-bold text-xs px-2 py-0.5 rounded group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                    {client.code}
                                </span>
                                <span className="font-bold text-gray-800 text-sm line-clamp-2">{client.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 2. 詳細頁面 (Master / Client Detail)
    
    let pageTitle = '';
    let headerColor = '';
    if (viewMode === 'shuoye') { pageTitle = '碩業零用金 (總帳)'; headerColor = 'bg-purple-600'; }
    else if (viewMode === 'yongye') { pageTitle = '永業零用金'; headerColor = 'bg-green-600'; }
    else if (viewMode === 'puhe') { pageTitle = '璞和零用金'; headerColor = 'bg-orange-500'; }
    else { pageTitle = `代墊款：${selectedClient?.name}`; headerColor = 'bg-blue-600'; }

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setViewMode('dashboard'); setSelectedClient(null); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <ReturnIcon className="w-6 h-6" />
                    </button>
                    <h2 className={`text-xl font-bold px-3 py-1 rounded text-white ${headerColor} shadow-sm`}>{pageTitle}</h2>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* ✨ 日期排序按鈕 */}
                    <button onClick={() => setSortDesc(!sortDesc)} className="flex items-center gap-1 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-600 text-sm font-bold shadow-sm">
                        <SortIcon className="w-4 h-4" /> {sortDesc ? "日期：新→舊" : "日期：舊→新"}
                    </button>

                    {isSupervisor && (
                        <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className={`flex items-center gap-1 px-4 py-2 ${headerColor} text-white rounded-lg hover:opacity-90 font-bold shadow-sm transition-opacity`}>
                            <PlusIcon className="w-5 h-5" /> 新增紀錄
                        </button>
                    )}
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-gray-100 sticky top-0 z-10 text-gray-600 text-sm font-bold uppercase tracking-wider shadow-sm">
                        <tr>
                            <th className="p-3 border-b w-32">日期</th>
                            {viewMode === 'client_detail' ? (
                                <>
                                    <th className="p-3 border-b w-24 text-right">金額</th>
                                    <th className="p-3 border-b w-32">代墊費用</th>
                                    <th className="p-3 border-b min-w-[200px]">說明</th>
                                    <th className="p-3 border-b w-20 text-center">備註</th>
                                    <th className="p-3 border-b w-32">請款單編號</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-3 border-b w-24 text-right text-green-700">收入</th>
                                    <th className="p-3 border-b w-24 text-right text-red-700">支出</th>
                                    <th className="p-3 border-b w-24 text-right font-black">結餘</th>
                                    {viewMode !== 'puhe' && <th className="p-3 border-b w-32">代墊費用</th>}
                                    {viewMode === 'shuoye' && <th className="p-3 border-b w-32">客戶</th>}
                                    <th className="p-3 border-b min-w-[200px]">說明</th>
                                    <th className="p-3 border-b w-32">備註</th>
                                    {viewMode === 'shuoye' && <th className="p-3 border-b w-16 text-center">已請款</th>}
                                    {viewMode !== 'puhe' && <th className="p-3 border-b w-24">傳票號碼</th>}
                                </>
                            )}
                            {isSupervisor && <th className="p-3 border-b w-20 text-center">操作</th>}
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                        {recordsWithBalance.map((r, index) => {
                            let showSeparator = false;
                            let autoIndex = 1;
                            
                            // 只有在客戶視圖，且是「日期升序 (舊->新)」的時候，才顯示藍色分隔線
                            // 因為如果日期倒過來，分組邏輯會變得很怪
                            if (viewMode === 'client_detail' && !sortDesc) {
                                const sameReq = recordsWithBalance.filter((item: any) => item.requestId === r.requestId && item.requestId);
                                if (r.requestId) {
                                    autoIndex = sameReq.findIndex((item: any) => item.id === r.id) + 1;
                                }
                                if (index > 0) {
                                    const prev = recordsWithBalance[index - 1];
                                    if (prev.requestId !== r.requestId) showSeparator = true;
                                }
                            }

                            const isHighlight = (viewMode === 'shuoye' || viewMode === 'yongye') && r.category === '零用金';

                            return (
                                <React.Fragment key={r.id}>
                                    {showSeparator && (
                                        <tr><td colSpan={10} className="bg-blue-50 h-2 border-t border-b border-blue-100"></td></tr>
                                    )}

                                    <tr className={`hover:bg-gray-50 transition-colors group ${isHighlight ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}>
                                        <td className="p-3 font-mono text-gray-600">{r.date}</td>
                                        
                                        {viewMode === 'client_detail' ? (
                                            <>
                                                <td className="p-3 font-mono font-bold text-gray-800 text-right">{Number(r.amount).toLocaleString()}</td>
                                                <td className="p-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{r.category}</span></td>
                                                <td className="p-3 text-gray-800">{r.description}</td>
                                                <td className="p-3 text-center font-bold text-blue-600">{r.requestId ? autoIndex : '-'}</td>
                                                <td className="p-3 font-mono text-blue-800 font-bold">{r.requestId || '-'}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-3 font-mono text-green-700 text-right font-bold">{r.type === 'income' ? Number(r.amount).toLocaleString() : ''}</td>
                                                <td className="p-3 font-mono text-red-600 text-right font-bold">{r.type === 'expense' ? `(${Number(r.amount).toLocaleString()})` : ''}</td>
                                                <td className="p-3 font-mono text-gray-900 text-right font-black border-l border-gray-100 bg-gray-50/50">{(r as any).currentBalance.toLocaleString()}</td>
                                                
                                                {viewMode !== 'puhe' && (
                                                    <td className={`p-3 ${isHighlight ? 'bg-yellow-100 font-bold text-yellow-900' : ''}`}>
                                                        {r.clientId ? <span className="text-blue-600 font-bold">代墊款</span> : r.category}
                                                    </td>
                                                )}
                                                
                                                {viewMode === 'shuoye' && (
                                                    <td className="p-3 font-bold text-blue-600">{r.clientName || r.clientId || '-'}</td>
                                                )}
                                                
                                                <td className={`p-3 ${isHighlight ? 'bg-yellow-100' : ''}`}>{r.description}</td>
                                                <td className="p-3 text-gray-500">{r.note}</td>
                                                
                                                {viewMode === 'shuoye' && (
                                                    <td className="p-3 text-center">
                                                        {/* ✨ 直接點擊 Checkbox 更新狀態 */}
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!r.isReimbursed} 
                                                            onChange={() => handleToggleReimbursed(r)}
                                                            disabled={!isSupervisor || isProcessing}
                                                            className="w-5 h-5 text-blue-600 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:ring-2 hover:ring-blue-200 transition-all" 
                                                        />
                                                    </td>
                                                )}
                                                
                                                {viewMode !== 'puhe' && <td className="p-3 font-mono text-xs">{r.voucherId}</td>}
                                            </>
                                        )}

                                        {isSupervisor && (
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingRecord(r); setIsModalOpen(true); }} className="p-1.5 bg-white border rounded hover:bg-blue-50 text-blue-600 shadow-sm"><PencilIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-white border rounded hover:bg-red-50 text-red-600 shadow-sm"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                        {recordsWithBalance.length === 0 && (
                            <tr><td colSpan={10} className="p-10 text-center text-gray-400">尚無紀錄</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 新增/編輯 Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !isProcessing && setIsModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setIsProcessing(true); // 🔒 鎖定，防止重複提交
                            const formData = new FormData(e.currentTarget);
                            
                            let finalAccount: CashAccountType = viewMode === 'client_detail' ? 'shuoye' : (viewMode as CashAccountType);
                            let finalType: 'income' | 'expense' = 'expense';
                            
                            if (viewMode === 'client_detail') {
                                finalType = 'expense';
                            } else {
                                finalType = formData.get('type') as 'income' | 'expense';
                            }

                            const newRec: CashRecord = {
                                id: editingRecord ? editingRecord.id : Date.now().toString(),
                                date: formData.get('date') as string,
                                type: finalType,
                                amount: Number(formData.get('amount')),
                                category: formData.get('category') as string || '',
                                description: formData.get('description') as string || '',
                                note: formData.get('note') as string || '',
                                account: finalAccount,
                                clientId: viewMode === 'client_detail' ? selectedClient!.id : editingRecord?.clientId,
                                clientName: viewMode === 'client_detail' ? selectedClient!.name : editingRecord?.clientName,
                                requestId: formData.get('requestId') as string || '',
                                isReimbursed: formData.get('isReimbursed') === 'on',
                                voucherId: formData.get('voucherId') as string || ''
                            };

                            try {
                                if (editingRecord) await TaskService.updateCashRecord(newRec);
                                else await TaskService.addCashRecord(newRec);
                                onUpdate();
                                setIsModalOpen(false);
                            } finally {
                                setIsProcessing(false); // 🔓 解鎖
                            }
                        }}>
                            <div className={`p-4 border-b text-white flex justify-between items-center ${headerColor}`}>
                                <h3 className="font-bold text-lg">{editingRecord ? '編輯' : '新增'} {viewMode === 'client_detail' ? '代墊款' : '紀錄'}</h3>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1" disabled={isProcessing}>✕</button>
                            </div>
                            
                            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">日期</label>
                                        <input name="date" type="date" required defaultValue={editingRecord?.date || new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">金額</label>
                                        <input name="amount" type="number" required defaultValue={editingRecord?.amount} className="w-full p-2 border rounded-lg" placeholder="0" />
                                    </div>
                                </div>

                                {viewMode !== 'client_detail' && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">類型</label>
                                        <div className="flex p-1 bg-gray-100 rounded-lg">
                                            <label className="flex-1 cursor-pointer">
                                                <input type="radio" name="type" value="expense" defaultChecked={editingRecord ? editingRecord.type === 'expense' : true} className="hidden peer" />
                                                <div className="text-center py-2 rounded-md text-sm font-bold text-gray-500 peer-checked:bg-red-500 peer-checked:text-white transition-all">支出 (減少)</div>
                                            </label>
                                            <label className="flex-1 cursor-pointer">
                                                <input type="radio" name="type" value="income" defaultChecked={editingRecord?.type === 'income'} className="hidden peer" />
                                                <div className="text-center py-2 rounded-md text-sm font-bold text-gray-500 peer-checked:bg-green-500 peer-checked:text-white transition-all">收入 (增加)</div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {viewMode !== 'puhe' && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            {viewMode === 'client_detail' ? '代墊費用 (會計科目)' : '費用類別'}
                                        </label>
                                        <input list="categories" name="category" defaultValue={editingRecord?.category} className="w-full p-2 border rounded-lg" placeholder="輸入或選擇..." />
                                        <datalist id="categories">
                                            <option value="規費"/><option value="郵資"/><option value="發票費"/><option value="零用金"/><option value="文具"/><option value="車資"/>
                                        </datalist>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">說明</label>
                                    <input name="description" defaultValue={editingRecord?.description} className="w-full p-2 border rounded-lg" placeholder="詳細內容..." />
                                </div>

                                {viewMode === 'client_detail' && (
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <label className="block text-sm font-bold text-blue-800 mb-1">請款單編號 (用於分組)</label>
                                        <input name="requestId" defaultValue={editingRecord?.requestId} className="w-full p-2 border border-blue-200 rounded-lg" placeholder="例如：114R066" />
                                        <p className="text-xs text-blue-500 mt-1">* 備註序號將依此編號自動生成</p>
                                    </div>
                                )}

                                {viewMode !== 'client_detail' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {viewMode === 'shuoye' && (
                                            <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                                <input type="checkbox" name="isReimbursed" defaultChecked={editingRecord?.isReimbursed} className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="text-sm font-bold text-gray-700">已請款</span>
                                            </label>
                                        )}
                                        {viewMode !== 'puhe' && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">傳票號碼</label>
                                                <input name="voucherId" defaultValue={editingRecord?.voucherId} className="w-full p-2 border rounded-lg text-sm" />
                                            </div>
                                        )}
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">備註 (選填)</label>
                                            <input name="note" defaultValue={editingRecord?.note} className="w-full p-2 border rounded-lg text-sm" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">取消</button>
                                <button type="submit" disabled={isProcessing} className={`px-4 py-2 text-white rounded-lg font-bold ${headerColor} hover:opacity-90 disabled:opacity-50 flex items-center gap-2`}>
                                    {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
