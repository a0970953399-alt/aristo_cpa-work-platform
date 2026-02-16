// src/MailLogView.tsx

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx'; // 記得先 npm install xlsx
import { MailRecord, MailCategory } from './types';
import { TaskService } from './taskService';
import { PlusIcon, TrashIcon, DocumentTextIcon, FolderIcon, ReturnIcon } from './Icons';

// 擴充 Icons: 鉛筆圖示 (如果 Icons.tsx 沒有的話)
const PencilIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const SortIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
    </svg>
);

interface MailLogViewProps {
    records: MailRecord[];
    onUpdate: () => void;
}

export const MailLogView: React.FC<MailLogViewProps> = ({ records, onUpdate }) => {
    const [activeSubTab, setActiveSubTab] = useState<MailCategory>('aristo_out');
    const [sortDesc, setSortDesc] = useState(true); // 預設降序 (新日期在上面)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MailRecord | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 篩選當前分頁的資料
    const currentRecords = records
        .filter(r => r.category === activeSubTab)
        .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortDesc ? dateB - dateA : dateA - dateB;
        });

    // 處理 Excel 匯入
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // 移除標題列
                if (data.length > 0) data.shift();

                const newRecords: MailRecord[] = [];
                
                // 依照你的 Excel 順序讀取 (嚴格對應)
                data.forEach(row => {
                    if (!row[0]) return; // 沒有日期就跳過

                    // 處理 Excel 日期格式 (如果是數字的話轉換)
                    let dateStr = row[0];
                    if (typeof row[0] === 'number') {
                         // Excel 日期數字轉 JS Date 簡單處理
                         const excelDate = new Date((row[0] - (25567 + 2))*86400*1000);
                         dateStr = excelDate.toISOString().split('T')[0];
                    }

                    if (activeSubTab === 'inbound') {
                        // 收文表順序：日期(0), 文件名稱(1), 收件人-客戶(2), 寄件者(3), 送件方式(4), 掛號編號(5)
                        newRecords.push({
                            id: Date.now() + Math.random().toString(),
                            date: dateStr,
                            fileName: row[1] || '',
                            clientName: row[2] || '', // 收件客戶
                            counterpart: row[3] || '', // 寄件者
                            method: row[4] || '普掛',
                            trackingNumber: row[5] || '',
                            category: 'inbound'
                        });
                    } else {
                        // 寄件順序：日期(0), 文件名稱(1), 客戶名稱(2), 收件者(3), 地址(4), 送件方式(5), 金額(6), 快遞單號(7)
                        newRecords.push({
                            id: Date.now() + Math.random().toString(),
                            date: dateStr,
                            fileName: row[1] || '',
                            clientName: row[2] || '', // 請款客戶
                            counterpart: row[3] || '', // 收件者
                            address: row[4] || '',
                            method: row[5] || '普掛',
                            amount: row[6]?.toString() || '',
                            trackingNumber: row[7] || '',
                            category: activeSubTab
                        });
                    }
                });

                if (newRecords.length > 0) {
                    if (confirm(`讀取到 ${newRecords.length} 筆資料，確定要追加匯入嗎？`)) {
                        await TaskService.addMailRecordsBatch(newRecords);
                        onUpdate();
                        alert("匯入成功！");
                    }
                } else {
                    alert("Excel 內容為空或格式無法讀取");
                }
            } catch (err) {
                console.error(err);
                alert("匯入失敗，請確認 Excel 格式正確");
            }
            // 清空 input 讓下次可以選同個檔案
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    // 刪除
    const handleDelete = async (id: string) => {
        if (confirm("確定要刪除這筆紀錄嗎？")) {
            await TaskService.deleteMailRecord(id);
            onUpdate();
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            {/* Header & Tabs */}
            <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={() => setActiveSubTab('aristo_out')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeSubTab === 'aristo_out' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>寄件_碩業</button>
                    <button onClick={() => setActiveSubTab('lawyer_out')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeSubTab === 'lawyer_out' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>寄件_張律師</button>
                    <button onClick={() => setActiveSubTab('inbound')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeSubTab === 'inbound' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>📥 收文表</button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setSortDesc(!sortDesc)} className="flex items-center gap-1 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-600 text-sm">
                        <SortIcon className="w-4 h-4" /> {sortDesc ? "日期：新→舊" : "日期：舊→新"}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 text-sm font-bold">
                        <DocumentTextIcon className="w-4 h-4" /> Excel 匯入
                    </button>
                    <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm">
                        <PlusIcon className="w-4 h-4" /> 手動新增
                    </button>
                </div>
            </div>

{/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]"> 
                    
                    <thead className="bg-gray-100 sticky top-0 z-10 text-gray-600 text-sm font-bold uppercase tracking-wider">
                        <tr>
                            {/* 1. 日期：固定寬度 */}
                            <th className="p-3 border-b w-28 whitespace-nowrap">日期</th>
                            
                            {/* 2. 文件名稱：收文表時給予超大空間 (30%以上)，寄件時給一般空間 */}
                            <th className={`p-3 border-b ${activeSubTab === 'inbound' ? 'w-[35%] min-w-[300px]' : 'min-w-[200px]'}`}>文件名稱</th>
                            
                            {/* 3. 客戶名稱：收文表時加寬 */}
                            <th className={`p-3 border-b ${activeSubTab === 'inbound' ? 'w-[15%] min-w-[150px]' : 'w-32 min-w-[120px]'}`}>
                                {activeSubTab === 'inbound' ? '收件人-客戶' : '客戶名稱(請款)'}
                            </th>
                            
                            {/* 4. 寄件者/收件者：收文表時加寬 */}
                            <th className={`p-3 border-b ${activeSubTab === 'inbound' ? 'w-[15%] min-w-[150px]' : 'w-32 min-w-[120px]'}`}>
                                {activeSubTab === 'inbound' ? '寄件者' : '收件者'}
                            </th>
                            
                            {/* 5. 地址 (寄件專用) */}
                            {activeSubTab !== 'inbound' && <th className="p-3 border-b w-[25%] min-w-[200px]">地址</th>}
                            
                            {/* 6. 送件方式 */}
                            <th className="p-3 border-b w-24 whitespace-nowrap text-center">送件方式</th>
                            
                            {/* 7. 金額 (寄件專用) */}
                            {activeSubTab !== 'inbound' && <th className="p-3 border-b w-20 text-right whitespace-nowrap">金額</th>}
                            
                            {/* 8. 單號：收文表時因為欄位少，可以給稍微寬一點 */}
                            <th className={`p-3 border-b whitespace-nowrap ${activeSubTab === 'inbound' ? 'w-auto min-w-[180px]' : 'w-40'}`}>
                                {activeSubTab === 'inbound' ? '掛號編號' : '單號'}
                            </th>
                            
                            {/* 9. 操作 */}
                            <th className="p-3 border-b w-20 text-center">操作</th>
                        </tr>
                    </thead>
                    
                    <tbody className="text-sm divide-y divide-gray-100 bg-white">
                        {currentRecords.map(r => (
                            <tr key={r.id} className="hover:bg-blue-50 transition-colors group">
                                <td className="p-3 text-gray-500 font-mono whitespace-nowrap">{r.date}</td>
                                
                                <td className="p-3 font-medium text-gray-800 break-words leading-relaxed">{r.fileName}</td>
                                
                                <td className="p-3 text-blue-600 font-medium truncate" title={r.clientName}>{r.clientName}</td>
                                
                                <td className="p-3 text-gray-700 truncate" title={r.counterpart}>{r.counterpart}</td>
                                
                                {activeSubTab !== 'inbound' && (
                                    <td className="p-3 text-gray-500 text-xs">
                                        <div className="truncate max-w-[250px]" title={r.address}>
                                            {r.address}
                                        </div>
                                    </td>
                                )}
                                
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${r.method.includes('掛') ? 'bg-orange-100 text-orange-800' : r.method.includes('快遞') ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {r.method}
                                    </span>
                                </td>
                                
                                {activeSubTab !== 'inbound' && <td className="p-3 font-mono font-bold text-gray-700 text-right">{r.amount ? `$${r.amount}` : '-'}</td>}
                                
                                <td className="p-3 font-mono text-xs text-gray-500 whitespace-nowrap" title={r.trackingNumber}>
                                    {r.trackingNumber ? (
                                        <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                            {r.trackingNumber}
                                        </span>
                                    ) : '-'}
                                </td>
                                
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingRecord(r); setIsModalOpen(true); }} className="p-1.5 bg-white border rounded hover:bg-blue-50 text-blue-600 transition-colors shadow-sm"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-white border rounded hover:bg-red-50 text-red-600 transition-colors shadow-sm"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {currentRecords.length === 0 && (
                            <tr><td colSpan={10} className="p-20 text-center text-gray-400 flex-col items-center">
                                <div className="text-4xl mb-2">📭</div>
                                <div>尚無資料，請新增或匯入</div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          
            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const newRec: MailRecord = {
                                id: editingRecord ? editingRecord.id : Date.now().toString(),
                                date: formData.get('date') as string,
                                fileName: formData.get('fileName') as string,
                                clientName: formData.get('clientName') as string,
                                counterpart: formData.get('counterpart') as string,
                                address: formData.get('address') as string || '',
                                method: formData.get('method') as string,
                                amount: formData.get('amount') as string || '',
                                trackingNumber: formData.get('trackingNumber') as string || '',
                                category: activeSubTab
                            };
                            
                            if (editingRecord) {
                                await TaskService.updateMailRecord(newRec);
                            } else {
                                await TaskService.addMailRecord(newRec);
                            }
                            onUpdate();
                            setIsModalOpen(false);
                        }}>
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg">{editingRecord ? '編輯紀錄' : '新增紀錄'} ({activeSubTab === 'inbound' ? '收文' : '寄件'})</h3>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm font-bold text-gray-700">日期 <input name="date" type="date" required defaultValue={editingRecord?.date || new Date().toISOString().split('T')[0]} className="w-full mt-1 p-2 border rounded-lg" /></label>
                                    <label className="block text-sm font-bold text-gray-700">送件方式 
                                        <input list="methods" name="method" required defaultValue={editingRecord?.method || '普掛'} className="w-full mt-1 p-2 border rounded-lg" placeholder="可選或輸入" />
                                        <datalist id="methods"><option value="普掛"/><option value="快遞"/><option value="雙掛號"/><option value="平信"/></datalist>
                                    </label>
                                </div>
                                <label className="block text-sm font-bold text-gray-700">文件名稱 <input name="fileName" required defaultValue={editingRecord?.fileName} className="w-full mt-1 p-2 border rounded-lg" /></label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm font-bold text-gray-700">{activeSubTab === 'inbound' ? '收件人-客戶' : '客戶名稱(請款)'} <input name="clientName" defaultValue={editingRecord?.clientName} className="w-full mt-1 p-2 border rounded-lg" /></label>
                                    <label className="block text-sm font-bold text-gray-700">{activeSubTab === 'inbound' ? '寄件者' : '收件者'} <input name="counterpart" defaultValue={editingRecord?.counterpart} className="w-full mt-1 p-2 border rounded-lg" /></label>
                                </div>
                                {activeSubTab !== 'inbound' && (
                                    <>
                                    <label className="block text-sm font-bold text-gray-700">地址 <input name="address" defaultValue={editingRecord?.address} className="w-full mt-1 p-2 border rounded-lg" /></label>
                                    <label className="block text-sm font-bold text-gray-700">金額/郵資 <input name="amount" type="number" defaultValue={editingRecord?.amount} className="w-full mt-1 p-2 border rounded-lg" placeholder="$" /></label>
                                    </>
                                )}
                                <label className="block text-sm font-bold text-gray-700">{activeSubTab === 'inbound' ? '掛號編號' : '快遞/掛號單號'} <input name="trackingNumber" defaultValue={editingRecord?.trackingNumber} className="w-full mt-1 p-2 border rounded-lg" /></label>
                            </div>
                            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">儲存</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
