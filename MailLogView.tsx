// src/MailLogView.tsx

import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { MailRecord, MailCategory } from './types';
import { TaskService } from './taskService';
import { PlusIcon, TrashIcon } from './Icons';

// 擴充 Icons: 鉛筆圖示
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

const FunnelIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
  </svg>
);

// ✨ 替換為新的 Excel 匯入圖示 (空心檔案 + 向上箭頭)
const ExcelFileIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

interface MailLogViewProps {
    records: MailRecord[];
    onUpdate: () => void;
    isSupervisor: boolean; // ✨ 新增權限控制 props
}

export const MailLogView: React.FC<MailLogViewProps> = ({ records, onUpdate, isSupervisor }) => {
    const [activeSubTab, setActiveSubTab] = useState<MailCategory>('aristo_out');
    const [sortDesc, setSortDesc] = useState(true); // 預設降序
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MailRecord | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✨ Excel 漏斗篩選狀態
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

    // ✨ 客戶名稱搜尋狀態 (放大鏡)
    const [filterClient, setFilterClient] = useState<string>('');
    const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);

    // ✨ 自動從資料中抓取有紀錄的年份，供下拉選單使用
    const availableYears = useMemo(() => {
        const years = new Set(records.map(r => r.date.substring(0, 4)));
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [records]);

  // ✨ 篩選當前分頁的資料 (加入年月篩選引擎 & 客戶名稱篩選)
    const currentRecords = useMemo(() => {
        let filtered = records.filter(r => r.category === activeSubTab);
        
        // 年月篩選邏輯
        if (filterYear || filterMonth) {
            filtered = filtered.filter(r => {
                const dateParts = r.date.split('-'); // 格式: YYYY-MM-DD
                if (dateParts.length >= 2) {
                    const yMatch = filterYear ? dateParts[0] === filterYear : true;
                    const mMatch = filterMonth ? parseInt(dateParts[1], 10).toString() === filterMonth : true;
                    return yMatch && mMatch;
                }
                return true;
            });
        }

        // ✨ 客戶名稱搜尋邏輯 (模糊比對，不分大小寫)
        if (filterClient.trim() !== '') {
            filtered = filtered.filter(r => 
                r.clientName.toLowerCase().includes(filterClient.trim().toLowerCase())
            );
        }
        
        // 日期排序
        return filtered.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortDesc ? dateB - dateA : dateA - dateB;
        });
    }, [records, activeSubTab, filterYear, filterMonth, filterClient, sortDesc]);

    // 處理 Excel 匯入
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isSupervisor) return; // 🔒 雙重保險
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

                if (data.length > 0) data.shift(); // 移除標題列

                const newRecords: MailRecord[] = [];
                data.forEach(row => {
                    if (!row[0]) return;
                    let dateStr = row[0];
                    if (typeof row[0] === 'number') {
                         const excelDate = new Date((row[0] - (25567 + 2))*86400*1000);
                         dateStr = excelDate.toISOString().split('T')[0];
                    }

                    if (activeSubTab === 'inbound') {
                        newRecords.push({
                            id: Date.now() + Math.random().toString(),
                            date: dateStr,
                            fileName: row[1] || '',
                            clientName: row[2] || '',
                            counterpart: row[3] || '',
                            method: row[4] || '普掛',
                            trackingNumber: row[5] || '',
                            category: 'inbound'
                        });
                    } else {
                        newRecords.push({
                            id: Date.now() + Math.random().toString(),
                            date: dateStr,
                            fileName: row[1] || '',
                            clientName: row[2] || '',
                            counterpart: row[3] || '',
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
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleDelete = async (id: string) => {
        if (!isSupervisor) return; // 🔒 雙重保險
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

                    
                    {/* 🔒 只有主管看得到操作按鈕 */}
                    {isSupervisor && (
                        <>
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            {/* 改為只有圖示，並加上 title 提示與 p-2 讓它變成正方形 */}
                            <button onClick={() => fileInputRef.current?.click()} title="Excel 匯入" className="p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm">
                                <ExcelFileIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} title="手動新增" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]"> 
                    <thead className="bg-gray-100 sticky top-0 z-10 text-gray-600 text-sm font-bold uppercase tracking-wider">
                        <tr>
                          {/* ✨ 日期欄位 (包含排序與 Excel 漏斗篩選) */}
                            <th className="p-3 border-b w-32 relative select-none">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 px-1 py-0.5 rounded transition-colors group"
                                        onClick={() => setSortDesc(!sortDesc)}
                                        title="點擊切換新舊排序"
                                    >
                                        日期
                                        <span className="text-gray-400 group-hover:text-blue-500 font-black text-xs">
                                            {sortDesc ? '↓' : '↑'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsDateFilterOpen(!isDateFilterOpen); }}
                                        className={`p-1 rounded transition-colors hover:bg-gray-200 ${filterYear || filterMonth ? 'text-blue-600 bg-blue-50 shadow-sm' : 'text-gray-400'}`}
                                        title="篩選年月"
                                    >
                                        <FunnelIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Excel 漏斗彈出視窗 */}
                                {isDateFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsDateFilterOpen(false)}></div>
                                        <div className="absolute top-full left-3 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 text-sm font-normal cursor-default">
                                            <div className="mb-3">
                                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">年份</label>
                                                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 bg-gray-50">
                                                    <option value="">所有年份</option>
                                                    {availableYears.map(y => <option key={y} value={y}>{y} 年</option>)}
                                                </select>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">月份</label>
                                                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 bg-gray-50">
                                                    <option value="">所有月份</option>
                                                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m.toString()}>{m} 月</option>)}
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-1">
                                                <button onClick={() => { setFilterYear(''); setFilterMonth(''); setIsDateFilterOpen(false); }} className="text-gray-500 font-bold hover:text-gray-800 px-2 py-1 transition-colors">清除</button>
                                                <button onClick={() => setIsDateFilterOpen(false)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-colors">套用</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </th>
                            <th className={`p-3 border-b ${activeSubTab === 'inbound' ? 'w-[35%] min-w-[300px]' : 'min-w-[200px]'}`}>文件名稱</th>
                            {/* ✨ 客戶名稱欄位 (文字已修改，包含放大鏡搜尋彈窗) */}
                            <th className={`p-3 border-b relative select-none ${activeSubTab === 'inbound' ? 'w-[15%] min-w-[150px]' : 'w-32 min-w-[120px]'}`}>
                                <div className="flex items-center gap-2">
                                    {activeSubTab === 'inbound' ? '收件人-客戶' : '客戶名稱'}
                                    
                                    {/* 放大鏡按鈕 */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsClientFilterOpen(!isClientFilterOpen); }}
                                        className={`p-1 rounded transition-colors hover:bg-gray-200 ${filterClient ? 'text-blue-600 bg-blue-50 shadow-sm' : 'text-gray-400'}`}
                                        title="搜尋客戶"
                                    >
                                        <MagnifyingGlassIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* 客戶搜尋彈出視窗 */}
                                {isClientFilterOpen && (
                                    <>
                                        {/* 透明背景遮罩 */}
                                        <div className="fixed inset-0 z-40" onClick={() => setIsClientFilterOpen(false)}></div>
                                        
                                        <div className="absolute top-full left-3 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 text-sm font-normal cursor-default">
                                            <div className="mb-2">
                                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">搜尋客戶名稱</label>
                                                <input 
                                                    type="text" 
                                                    value={filterClient} 
                                                    onChange={e => setFilterClient(e.target.value)} 
                                                    placeholder="輸入關鍵字..."
                                                    className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 bg-gray-50"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-2">
                                                <button onClick={() => { setFilterClient(''); setIsClientFilterOpen(false); }} className="text-gray-500 font-bold hover:text-gray-800 px-2 py-1 transition-colors">清除</button>
                                                <button onClick={() => setIsClientFilterOpen(false)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-colors">完成</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </th>
                            <th className={`p-3 border-b ${activeSubTab === 'inbound' ? 'w-[15%] min-w-[150px]' : 'w-32 min-w-[120px]'}`}>{activeSubTab === 'inbound' ? '寄件者' : '收件者'}</th>
                            {activeSubTab !== 'inbound' && <th className="p-3 border-b w-[25%] min-w-[200px]">地址</th>}
                            <th className="p-3 border-b w-24 whitespace-nowrap text-center">送件方式</th>
                            {activeSubTab !== 'inbound' && <th className="p-3 border-b w-20 text-right whitespace-nowrap">金額</th>}
                            <th className={`p-3 border-b whitespace-nowrap ${activeSubTab === 'inbound' ? 'w-auto min-w-[180px]' : 'w-40'}`}>{activeSubTab === 'inbound' ? '掛號編號' : '單號'}</th>
                            
                            {/* 🔒 只有主管看得到操作欄位 */}
                            {isSupervisor && <th className="p-3 border-b w-20 text-center">操作</th>}
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
                                        <div className="truncate max-w-[250px]" title={r.address}>{r.address}</div>
                                    </td>
                                )}
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${r.method.includes('掛') ? 'bg-orange-100 text-orange-800' : r.method.includes('快遞') ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {r.method}
                                    </span>
                                </td>
                                {activeSubTab !== 'inbound' && <td className="p-3 font-mono font-bold text-gray-700 text-right">{r.amount ? `$${r.amount}` : '-'}</td>}
                                <td className="p-3 font-mono text-xs text-gray-500 whitespace-nowrap" title={r.trackingNumber}>
                                    {r.trackingNumber ? <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">{r.trackingNumber}</span> : '-'}
                                </td>
                                
                                {/* 🔒 只有主管看得到編輯/刪除按鈕 */}
                                {isSupervisor && (
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingRecord(r); setIsModalOpen(true); }} className="p-1.5 bg-white border rounded hover:bg-blue-50 text-blue-600 transition-colors shadow-sm"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-white border rounded hover:bg-red-50 text-red-600 transition-colors shadow-sm"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {currentRecords.length === 0 && (
                            <tr><td colSpan={isSupervisor ? 10 : 9} className="p-20 text-center text-gray-400 flex-col items-center">
                                <div className="text-4xl mb-2">📭</div>
                                <div>尚無資料{isSupervisor && "，請新增或匯入"}</div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal - 只有主管能打開，不過我們已經隱藏按鈕了，這裡不需額外隱藏，因為打不開 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!isSupervisor) return; // 🔒 最後一道防線
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
                                    <label className="block text-sm font-bold text-gray-700">{activeSubTab === 'inbound' ? '收件人-客戶' : '客戶名稱'} <input name="clientName" defaultValue={editingRecord?.clientName} className="w-full mt-1 p-2 border rounded-lg" /></label>
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
