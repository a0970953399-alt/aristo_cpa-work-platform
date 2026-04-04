// src/CashLogView.tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { CashRecord, Client, CashAccountType } from './types';
import { TaskService } from './taskService';
import { PlusIcon, TrashIcon, ReturnIcon } from './Icons';
import { EditableCombobox } from './EditableCombobox';

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

// ✨ 替換為新的 Excel 匯入圖示 (空心檔案 + 向上箭頭)
const ExcelFileIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className || "w-6 h-6"}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
    <path d="M12 10v6"/>
    <path d="m9 13 3-3 3 3"/>
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

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
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
    const [sortDesc, setSortDesc] = useState(false); // 預設升序

    // ✨ Excel 漏斗篩選狀態
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

    // ✨ 客戶名稱搜尋狀態 (放大鏡)
    const [filterClient, setFilterClient] = useState<string>('');
    const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);

    // ✨ 篩選客戶名單供 Dashboard 顯示 (支援名稱與代碼搜尋)
    const filteredClients = useMemo(() => {
        if (!filterClient.trim()) return clients;
        const keyword = filterClient.trim().toLowerCase();
        return clients.filter(c => 
            c.name.toLowerCase().includes(keyword) || 
            c.code.toLowerCase().includes(keyword)
        );
    }, [clients, filterClient]);

    // ✨ 自動從資料中抓取有紀錄的年份，供下拉選單使用
    const availableYears = useMemo(() => {
        const years = new Set(records.map(r => r.date.substring(0, 4)));
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [records]);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CashRecord | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            // 依優先順序關閉：篩選面板 → Modal → 客戶詳細頁 → 返回總覽
            if (isDateFilterOpen) { setIsDateFilterOpen(false); return; }
            if (isClientFilterOpen) { setIsClientFilterOpen(false); return; }
            if (isModalOpen) { setIsModalOpen(false); setEditingRecord(null); setModalError(null); return; }
            if (viewMode === 'client_detail') { setSelectedClient(null); setViewMode('dashboard'); return; }
            if (viewMode !== 'dashboard') { setViewMode('dashboard'); return; }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isDateFilterOpen, isClientFilterOpen, isModalOpen, viewMode]);

    // ✨ Excel 雙核匯入引擎
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isSupervisor) return;
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (data.length > 0) data.shift(); // 移除標題列

                const newRecords: CashRecord[] = [];
                data.forEach(row => {
                    if (!row[0]) return;
                    let dateStr = row[0];
                    if (typeof row[0] === 'number') { // 處理 Excel 內建日期格式
                         const excelDate = new Date((row[0] - (25567 + 2)) * 86400 * 1000);
                         dateStr = excelDate.toISOString().split('T')[0];
                    }

                    if (viewMode === 'client_detail') {
                        // 📁 格式一：客戶代墊款 (A:日期, B:金額, C:代墊費用, D:說明, E:請款單編號)
                        newRecords.push({
                            id: Date.now() + Math.random().toString(),
                            date: dateStr,
                            type: 'expense', // 代墊款必定是支出
                            amount: Number(row[1]) || 0,
                            category: row[2]?.toString() || '',
                            description: row[3]?.toString() || '',
                            requestId: row[4]?.toString() || '',
                            account: 'shuoye', // 代墊預設掛在碩業帳上
                            clientId: selectedClient!.id,
                            clientName: selectedClient!.name,
                            isReimbursed: false,
                            note: '',
                            voucherId: ''
                        });
                    } else {
                        // 📁 格式二：事務所零用金 (A:日期, B:類型(收入/支出), C:金額, D:費用類別, E:客戶名稱, F:說明, G:備註, H:傳票號碼)
                        const typeStr = row[1]?.toString().trim() || '支出';
                        const isIncome = typeStr === '收入';
                        newRecords.push({
                            id: Date.now() + Math.random().toString(),
                            date: dateStr,
                            type: isIncome ? 'income' : 'expense',
                            amount: Number(row[2]) || 0,
                            category: row[3]?.toString() || '',
                            clientName: row[4]?.toString() || '',
                            description: row[5]?.toString() || '',
                            note: row[6]?.toString() || '',
                            voucherId: row[7]?.toString() || '',
                            account: viewMode as CashAccountType,
                            isReimbursed: false
                        });
                    }
                });

                if (newRecords.length > 0) {
                    if (confirm(`讀取到 ${newRecords.length} 筆資料，確定要追加匯入嗎？`)) {
                        setIsProcessing(true);
                        // 批次寫入資料庫
                        await Promise.all(newRecords.map(r => TaskService.addCashRecord(r)));
                        onUpdate();
                        alert("匯入成功！");
                    }
                } else {
                    alert("Excel 內容為空或格式無法讀取");
                }
            } catch (err) {
                console.error(err);
                alert("匯入失敗，請確認 Excel 格式正確");
            } finally {
                setIsProcessing(false);
            }
            if (fileInputRef.current) fileInputRef.current.value = ''; // 清空 input 讓下次能選同一個檔案
        };
        reader.readAsBinaryString(file);
    };

    // --- 資料處理邏輯 (核心修改) ---

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

      // ✨ 新增：年月篩選邏輯 (Excel漏斗)
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
      
        // ✨ 特殊排序邏輯：客戶代墊頁面
        if (viewMode === 'client_detail') {
            // 1. 將有 RequestId 的分組，沒有的當作獨立個體
            const groups: { [key: string]: CashRecord[] } = {};
            const singles: CashRecord[] = [];

            filtered.forEach(r => {
                if (r.requestId) {
                    if (!groups[r.requestId]) groups[r.requestId] = [];
                    groups[r.requestId].push(r);
                } else {
                    singles.push(r);
                }
            });

            // 2. 群組「內部」永遠保持「日期升序 (舊->新)」，確保 1, 2, 3 順序邏輯正確
            Object.values(groups).forEach(group => {
                group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            });

            // 3. 準備排序「群組塊」
            // 為了排序，我們需要找出每個群組的「代表日期」（例如群組內的第一個日期）
            const blocks = [
                ...Object.values(groups),
                ...singles.map(s => [s]) // 單個項目也視為一個 array
            ];

            // 4. 群組「之間」依照使用者設定 (sortDesc) 排序
            blocks.sort((blockA, blockB) => {
                // 取該區塊的第一筆日期來比較
                const dateA = new Date(blockA[0].date).getTime();
                const dateB = new Date(blockB[0].date).getTime();
                return sortDesc ? dateB - dateA : dateA - dateB;
            });

            // 5. 攤平回傳
            return blocks.flat();

        } else {
            // 一般頁面 (碩業/永業...) 維持原本的單純日期排序
            return filtered.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortDesc ? dateB - dateA : dateA - dateB;
            });
        }
    }, [records, viewMode, selectedClient, sortDesc]);

    // 計算結餘 (僅針對內部帳本)
    const recordsWithBalance = useMemo(() => {
        if (viewMode === 'client_detail') return currentRecords;
        
        let balance = 0;
        // 先強制用「舊 -> 新」來算結餘
        const sortedForCalc = [...currentRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const calculated = sortedForCalc.map(r => {
            if (r.type === 'income') balance += Number(r.amount);
            else balance -= Number(r.amount);
            return { ...r, currentBalance: balance };
        });

        // 算完後，如果使用者選「新 -> 舊」且不是客戶頁面，再反轉回來顯示
        // (注意：客戶頁面因為上面已經排好特殊的 group order，所以不參與這裡的反轉)
        return (sortDesc && viewMode !== 'client_detail') ? calculated.reverse() : (viewMode === 'client_detail' ? currentRecords : calculated);
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

    const handleToggleReimbursed = async (record: CashRecord) => {
        if (!isSupervisor || isProcessing) return;
        setIsProcessing(true);
        try {
            const updated = { ...record, isReimbursed: !record.isReimbursed };
            await TaskService.updateCashRecord(updated);
            onUpdate();
        } catch (e) {
            alert("更新失敗");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 渲染部分 ---

    // ✨ 計算三個零用金帳戶的目前總結餘供 Dashboard 顯示
    const accountBalances = useMemo(() => {
        const balances = { shuoye: 0, yongye: 0, puhe: 0 };
        records.forEach(r => {
            if (r.account === 'shuoye' || r.account === 'yongye' || r.account === 'puhe') {
                if (r.type === 'income') balances[r.account] += Number(r.amount);
                else balances[r.account] -= Number(r.amount);
            }
        });
        return balances;
    }, [records]);

    // ✨ 新增：專業貨幣格式化函數 (解決負號錯位問題)
    const formatCurrency = (amount: number) => {
        return amount < 0 ? `-$${Math.abs(amount).toLocaleString()}` : `$${amount.toLocaleString()}`;
    };

  // 1. Dashboard (入口畫面)
    if (viewMode === 'dashboard') {
        return (
            <div className="h-full min-h-[calc(100vh-120px)] flex flex-col bg-gray-50 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 pb-2">
                    <h3 className="text-gray-500 font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-sm">
                        <BanknotesIcon className="w-5 h-5" /> 事務所帳本
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* 碩業零用金 */}
                        {/* ✨ 移除 transition 屬性 */}
                        <button onClick={() => setViewMode('shuoye')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-purple-100 hover:border-purple-300 group text-left flex justify-between items-end">
                            <div>
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">🟣</span>
                                </div>
                                <h4 className="text-xl font-black text-gray-800">碩業零用金</h4>
                            </div>
                            <div className="text-right mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">目前結餘</span>
                                <span className={`text-3xl font-black ${accountBalances.shuoye < 0 ? 'text-red-500' : 'text-purple-600'}`}>
                                    {formatCurrency(accountBalances.shuoye)}
                                </span>
                            </div>
                        </button>
                        
                        {/* 永業零用金 */}
                        {/* ✨ 移除 transition 屬性 */}
                        <button onClick={() => setViewMode('yongye')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-green-100 hover:border-green-300 group text-left flex justify-between items-end">
                            <div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">🟢</span>
                                </div>
                                <h4 className="text-xl font-black text-gray-800">永業零用金</h4>
                            </div>
                            <div className="text-right mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">目前結餘</span>
                                <span className={`text-3xl font-black ${accountBalances.yongye < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatCurrency(accountBalances.yongye)}
                                </span>
                            </div>
                        </button>

                        {/* 璞和零用金 */}
                        {/* ✨ 移除 transition 屬性 */}
                        <button onClick={() => setViewMode('puhe')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-orange-100 hover:border-orange-300 group text-left flex justify-between items-end">
                            <div>
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">🟠</span>
                                </div>
                                <h4 className="text-xl font-black text-gray-800">璞和零用金</h4>
                            </div>
                            <div className="text-right mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">目前結餘</span>
                                <span className={`text-3xl font-black ${accountBalances.puhe < 0 ? 'text-red-500' : 'text-orange-500'}`}>
                                    {formatCurrency(accountBalances.puhe)}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

              {/* ✨ 將 auto 改成 scroll 強制保留軌道 */}
              <div className="flex-1 p-6 overflow-y-scroll custom-scrollbar">
                    {/* ✨ 修改標題區塊，加入搜尋按鈕與相對定位 */}
                    <div className="relative mb-4 flex items-center gap-2">
                        <h3 className="text-gray-500 font-bold flex items-center gap-2 uppercase tracking-wider text-sm">
                            <span className="text-xl">👥</span> 客戶代墊紀錄
                        </h3>
                        
                        {/* 放大鏡按鈕 */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsClientFilterOpen(!isClientFilterOpen); }}
                            className={`p-1 rounded transition-colors hover:bg-gray-200 ${filterClient ? 'text-blue-600 bg-blue-50 shadow-sm' : 'text-gray-400'}`}
                            title="搜尋客戶"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </button>

                        {/* 客戶搜尋彈出視窗 */}
                        {isClientFilterOpen && (
                            <>
                                {/* 透明背景遮罩 */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsClientFilterOpen(false)}></div>
                                
                                <div className="absolute top-8 left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 text-sm font-normal cursor-default">
                                    <div className="mb-2">
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">搜尋客戶名稱或代碼</label>
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
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {/* ✨ 把原本的 clients.map 改成 filteredClients.map */}
                        {filteredClients.map(client => (
                        <button 
                            key={client.id}
                            onClick={() => { setSelectedClient(client); setViewMode('client_detail'); }}
                            className="bg-white rounded-xl shadow p-4 border cursor-pointer hover:shadow-md aspect-square flex flex-col items-center justify-center gap-2"
                          >
                            <span className="bg-gray-100 text-gray-600 font-mono font-bold text-base px-3 py-1 rounded group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                {client.code}
                            </span>
                            <span className="font-bold text-gray-800 text-2xl line-clamp-2 text-center">
                                {client.name}
                            </span>
                        </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
  
    // 2. 詳細頁面
    let pageTitle = '';
    let headerColor = '';
    if (viewMode === 'shuoye') { pageTitle = '碩業零用金'; headerColor = 'bg-purple-600'; }
    else if (viewMode === 'yongye') { pageTitle = '永業零用金'; headerColor = 'bg-green-600'; }
    else if (viewMode === 'puhe') { pageTitle = '璞和零用金'; headerColor = 'bg-orange-500'; }
    else { pageTitle = `代墊款：${selectedClient?.name}`; headerColor = 'bg-blue-600'; }

  return (
        <div className="h-full min-h-[calc(100vh-120px)] flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setViewMode('dashboard'); setSelectedClient(null); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <ReturnIcon className="w-6 h-6" />
                    </button>
                    <h2 className={`text-xl font-bold px-3 py-1 rounded text-white ${headerColor} shadow-sm`}>{pageTitle}</h2>
                </div>
                
              <div className="flex items-center gap-2">
                    {isSupervisor && (
                        <>
                            {/* 隱藏的檔案選擇器 */}
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            
                            {/* Excel 匯入按鈕 (綠色底色，與新增按鈕做出區隔) */}
                            <button onClick={() => fileInputRef.current?.click()} title="Excel 匯入" className="p-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 shadow-sm transition-opacity">
                                <ExcelFileIcon className="w-5 h-5" />
                            </button>
                            
                            <button onClick={() => { setEditingRecord(null); setModalError(null); setIsModalOpen(true); }} title="新增紀錄" className={`p-2 ${headerColor} text-white rounded-lg hover:opacity-90 shadow-sm transition-opacity`}>
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

          {/* ✨ 將 auto 改成 overflow-y-scroll overflow-x-auto */}
            <div className="flex-1 overflow-y-scroll overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-gray-100 sticky top-0 z-10 text-gray-600 text-sm font-bold uppercase tracking-wider shadow-sm">
                        <tr>
                          {/* ✨ 日期欄位 (包含排序與 Excel 漏斗篩選) */}
                            <th className="p-3 border-b w-32 relative select-none">
                                <div className="flex items-center gap-2">
                                    {/* 左側：點擊排序文字區 */}
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
                                    
                                    {/* 右側：漏斗按鈕 */}
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
                                        {/* 透明背景遮罩：點擊外面就關閉彈窗 */}
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
                            
                            // ✨ 修改：移除 !sortDesc 限制，讓分隔線永遠顯示
                            if (viewMode === 'client_detail') {
                                // 因為現在 currentRecords 已經依照 Group 排好了，所以相同 ID 一定會黏在一起
                                const sameReq = recordsWithBalance.filter((item: any) => item.requestId === r.requestId && item.requestId);
                                if (r.requestId) {
                                    // 找出自己在同組內的順序 (因為同組內永遠是升序，所以一定是 1,2,3...)
                                    autoIndex = sameReq.findIndex((item: any) => item.id === r.id) + 1;
                                }
                                
                                // 檢查上一筆資料的 ID 是否跟我不一樣，不一樣就畫線
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
                                                    <button onClick={() => { setEditingRecord(r); setModalError(null); setIsModalOpen(true); }} className="p-1.5 bg-white border rounded hover:bg-blue-50 text-blue-600 shadow-sm"><PencilIcon className="w-4 h-4"/></button>
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!isProcessing) { setIsModalOpen(false); setModalError(null); } }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <form noValidate onSubmit={async (e) => {
                            e.preventDefault();
                            setModalError(null);
                            const formData = new FormData(e.currentTarget);

                            const dateVal = formData.get('date') as string;
                            const amountVal = formData.get('amount') as string;
                            if (!dateVal) { setModalError('請填寫日期'); return; }
                            if (!amountVal || amountVal.trim() === '') { setModalError('請填寫金額'); return; }

                            setIsProcessing(true);

                            let finalAccount: CashAccountType = viewMode === 'client_detail' ? 'shuoye' : (viewMode as CashAccountType);
                            let finalType: 'income' | 'expense' = 'expense';

                            if (viewMode === 'client_detail') {
                                finalType = 'expense';
                            } else {
                                finalType = formData.get('type') as 'income' | 'expense';
                            }

                            const newRec: CashRecord = {
                                id: editingRecord ? editingRecord.id : Date.now().toString(),
                                date: dateVal,
                                type: finalType,
                                amount: Number(amountVal),
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
                            } catch (err: unknown) {
                                const msg = err instanceof Error ? err.message : String(err);
                                setModalError(`儲存失敗：${msg}`);
                            } finally {
                                setIsProcessing(false);
                            }
                        }}>
                            <div className={`p-4 border-b text-white flex justify-between items-center ${headerColor}`}>
                                <h3 className="font-bold text-lg">{editingRecord ? '編輯' : '新增'} {viewMode === 'client_detail' ? '代墊款' : '紀錄'}</h3>
                                <button type="button" onClick={() => { setIsModalOpen(false); setModalError(null); }} className="hover:bg-white/20 rounded-full p-1" disabled={isProcessing}>✕</button>
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
                                        <EditableCombobox
                                            name="category"
                                            defaultValue={editingRecord?.category || ''}
                                            storageKey="cash_categories"
                                            defaultOptions={['規費', '郵資', '發票費', '零用金', '文具', '車資']}
                                            placeholder="輸入或選擇..."
                                        />
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
                            
                            <div className="p-4 border-t bg-gray-50 space-y-2">
                                {modalError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{modalError}</div>
                                )}
                                <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setIsModalOpen(false); setModalError(null); }} disabled={isProcessing} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">取消</button>
                                <button type="submit" disabled={isProcessing} className={`px-4 py-2 text-white rounded-lg font-bold ${headerColor} hover:opacity-90 disabled:opacity-50 flex items-center gap-2`}>
                                    {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    儲存
                                </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
