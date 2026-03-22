// src/ClientMasterView.tsx

import React, { useState, useRef } from 'react';
import { Client } from './types';
import { TaskService } from './taskService';

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { WORK_ORDER_TEMPLATE_BASE64 } from './wordTemplate';
import * as XLSX from 'xlsx';
// ✨ 新增：引入系統共用圖示
import { PlusIcon, TrashIcon, ReturnIcon, DocumentTextIcon } from './Icons';

// ✨ 新增：Excel 檔案匯入專用圖示 (空心檔案 + 向上箭頭)
const ExcelFileIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

// ✨ 新增：儲存資料專用圖示 (磁碟片)
const SaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-.113-.037-.226-.108-.322L17.8 3.553A.75.75 0 0 0 17.2 3.25H6A2.25 2.25 0 0 0 3.75 5.5v13.5A2.25 2.25 0 0 0 6 21.25h12ZM12 6.75h3v3.75h-3v-3.75Z" />
  </svg>
);

// ✨ 新增：下載/匯出專用圖示 (雲端向下箭頭，與請款單一致)
const CloudArrowDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-7.5m0 7.5-3-3m3 3 3-3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
  </svg>
);

// ✨ 新增：儲存/更新專用圖示 (雲端向上箭頭，直觀代表資料上傳至系統)
const CloudArrowUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v7.5m0-7.5-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
  </svg>
);

interface ClientMasterViewProps {
    clients: Client[];
    onClose: () => void;
    onUpdate: () => void;
}

export const ClientMasterView: React.FC<ClientMasterViewProps> = ({ clients, onClose, onUpdate }) => {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // 🆕 新增：控制總署牆面是否處於「刪除模式」
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    const [activeTab, setActiveTab] = useState<'work' | 'payment' | 'notes'>('work');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof Client, value: any) => {
        if (selectedClient) {
            setSelectedClient({ ...selectedClient, [field]: value });
        }
    };

    // ✨ 新增：專門處理千分位金額的函數
    const handleCurrencyChange = (field: keyof Client, value: string) => {
        // 先拔除所有非數字的字元 (包含原有的逗號)
        const numStr = value.replace(/\D/g, ''); 
        if (!numStr) {
            handleChange(field, '');
            return;
        }
        // 轉換為數字後，再自動加上千分位逗號
        const formatted = parseInt(numStr, 10).toLocaleString('en-US');
        handleChange(field, formatted);
    };

    // 🆕 新增客戶邏輯
    const handleAddClient = () => {
        const newClient: Partial<Client> = {
            id: Date.now() + Math.random(), // 賦予新ID
            name: '',
            code: '',
            year: '',
            workNo: '',
            // 預設將勾選項目設為 false
            chkAccount: false, chkInvoice: false, chkVat: false, chkWithholding: false, chkHealth: false,
            boxReview: false, boxAudit: false, boxCpa: false
        };
        setSelectedClient(newClient as Client);
        setIsDeleteMode(false); // 確保新增時關閉刪除模式
    };

    // 🆕 刪除客戶邏輯 (通用的刪除功能)
    const handleDeleteClient = async (id: number, clientName: string) => {
        if (window.confirm(`⚠️ 確定要刪除客戶【${clientName || '未命名'}】嗎？\n刪除後資料將無法復原！`)) {
            try {
                // 過濾掉被刪除的客戶
                const updatedClients = clients.filter(c => c.id !== id);
                await TaskService.saveClients(updatedClients);
                onUpdate();
                
                // 如果目前正打開這位客戶的資料卡，就把它關掉
                if (selectedClient?.id === id) {
                    setSelectedClient(null);
                }
            } catch (error) {
                alert('❌ 刪除失敗，請重試。');
            }
        }
    };

    // 儲存邏輯 (已升級：可處理新增與修改)
    const handleSave = async () => {
        if (!selectedClient) return;
        setIsSaving(true);
        try {
            // 判斷這是一筆「已存在」的客戶，還是剛按「新增」產生的新客戶
            const isExisting = clients.some(c => c.id === selectedClient.id);
            const updatedClients = isExisting 
                ? clients.map(c => c.id === selectedClient.id ? selectedClient : c)
                : [...clients, selectedClient]; // 如果是新的，就加進陣列後面
                
            await TaskService.saveClients(updatedClients);
            onUpdate();
            alert('✅ 客戶資料已儲存！');
            // 如果是新增客戶，存檔後可以選擇關閉或繼續編輯，這裡讓它保持開啟
        } catch (error) {
            alert('儲存失敗，請重試。');
        } finally {
            setIsSaving(false);
        }
    };

  // Excel 匯入邏輯 (防呆覆寫升級版)
    const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const bstr = event.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // 1. 先讀取原始資料
                const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);
                // 🧹 2. 啟動「空白吸塵器」
                const json = rawJson.map(row => {
                    const cleanRow: any = {};
                    Object.keys(row).forEach(key => {
                        cleanRow[key.trim()] = row[key]; 
                    });
                    return cleanRow;
                });

                const isChecked = (val: any) => {
                    if (val == null) return false;
                    const str = String(val).trim().toUpperCase();
                    return ['V', '1', 'TRUE', 'Y', '是', '☑', 'P', '■'].includes(str);
                };

                let newCount = 0;
                let updateCount = 0;
                let currentClients = [...clients]; // 複製一份現有客戶清單準備操作

                // 3. 逐行解析 Excel 資料並比對
                json.forEach((row) => {
                    const formalName = String(row['客戶名稱'] || '').trim();
                    const shortName = formalName.replace(/(股份有限公司|有限公司|企業社|商行|實業|國際|廣告)/g, '').trim();
                    const rowTaxId = row['統一編號'] != null ? String(row['統一編號']).trim() : '';
                    const rowCode = row['客戶編號'] != null ? String(row['客戶編號']).trim() : '';

                    if (!formalName && !rowCode) return; // 略過全空行

                    // ✨ 三重防呆：找尋是否已存在相同統編、代號或全名的客戶
                    const existingIndex = currentClients.findIndex(c => 
                        (rowTaxId && c.taxId === rowTaxId) || 
                        (rowCode && c.code === rowCode) ||
                        (formalName && c.fullName === formalName) 
                    );

                  // ✨ 在組裝 excelData 之前，加入這個匯入專用千分位轉換器
                    const formatImportCurrency = (val: any) => {
                        if (val == null || val === '') return '';
                        const numStr = String(val).replace(/\D/g, ''); // 只保留數字
                        if (!numStr) return String(val); // 如果是純文字就保留
                        return parseInt(numStr, 10).toLocaleString('en-US');
                    };

                    // 整理從 Excel 讀到的這筆資料
                    const excelData: Partial<Client> = {
                        year: row['記帳年度'] != null ? String(row['記帳年度']) : '',
                        workNo: row['記帳工作'] != null ? String(row['記帳工作']) : '',
                        code: rowCode,
                        name: shortName,      
                        fullName: formalName, 
                        taxId: rowTaxId,
                        taxFileNo: row['稅籍編號'] != null ? String(row['稅籍編號']) : '',
                        owner: row['負責人'] != null ? String(row['負責人']) : '',
                        contact: row['聯絡人'] != null ? String(row['聯絡人']) : '',
                        phone: row['電話'] != null ? String(row['電話']) : '',
                        fax: row['傳真'] != null ? String(row['傳真']) : '',
                        email: row['Email'] != null ? String(row['Email']) : '',
                        regAddress: row['公司登記地址'] != null ? String(row['公司登記地址']) : '',
                        contactAddress: row['公司聯絡地址'] != null ? String(row['公司聯絡地址']) : '',
                        cpa: row['負責會計師'] != null ? String(row['負責會計師']) : '',
                        
                        // ✨ 勾選狀態：完全聽從 Excel 決定
                        chkAccount: isChecked(row['會計帳務']),
                        chkInvoice: isChecked(row['買發票']),
                        chkVat: isChecked(row['申報營業稅']),
                        chkWithholding: isChecked(row['扣繳申報']),
                        chkHealth: isChecked(row['補充保費']),
                        boxReview: isChecked(row['書審']),
                        boxAudit: isChecked(row['查帳']),
                        boxCpa: isChecked(row['會計師簽證']),

                        period: row['委任期限'] != null ? String(row['委任期限']) : '',
                        feeMonthly: formatImportCurrency(row['委任公費']),
                        feeWithholding: formatImportCurrency(row['各類扣繳']),
                        feeTax: formatImportCurrency(row['結算申報']),
                        fee22_1: formatImportCurrency(row['22-1申報']),
                    };

                  if (existingIndex !== -1) {
                        // 🔄 這是舊客戶：進行覆寫 (Upsert)
                        const existingClient = currentClients[existingIndex];
                        const mergedClient = { ...existingClient };

                        Object.keys(excelData).forEach(key => {
                            // ✨ 修正筆誤：將變數正確綁定為 key
                            const k = key as keyof Client;
                            
                            // 1. 如果是布林值 (打勾項目)，直接以 Excel 為準
                            if (typeof excelData[k] === 'boolean') {
                                (mergedClient as any)[k] = excelData[k];
                            } 
                            // 2. ✨ 修正判斷：如果是文字欄位，且 Excel 裡確實有值 (不是空白也不是 undefined)，才覆蓋
                            else if (excelData[k] !== undefined && excelData[k] !== '') {
                                (mergedClient as any)[k] = excelData[k];
                            }
                        });

                        currentClients[existingIndex] = mergedClient as Client;
                        updateCount++;
                    } else {
                        // 🆕 這是新客戶：直接新增
                        currentClients.push({
                            ...excelData,
                            id: Date.now() + Math.random(), 
                        } as Client);
                        newCount++;
                    }
                });

                // 📊 顯示智能結算報告
                if (window.confirm(`讀取完畢！系統比對結果如下：\n\n🔄 預計更新舊客戶：${updateCount} 筆\n🆕 預計新增新客戶：${newCount} 筆\n\n是否確定將 Excel 資料匯入系統並覆寫現有勾選項目？`)) {
                    await TaskService.saveClients(currentClients);
                    onUpdate();
                    alert("🎉 匯入成功！資料已同步至系統。");
                }
            } catch (err) {
                alert("❌ 匯入失敗，請確認 Excel 欄位名稱是否正確。");
            }
            // 清空 input 讓同一個檔案能被重複選取
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };
    const handleGenerateWord = () => {
        if (!selectedClient) return;

        try {
            const binaryString = window.atob(WORK_ORDER_TEMPLATE_BASE64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const zip = new PizZip(bytes.buffer);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: "[[", end: "]]" },
            });
            const data = {
                year: selectedClient.year || '',
                workNo: selectedClient.workNo || '',
                clientCode: selectedClient.code || '',
                clientName: selectedClient.fullName || selectedClient.name || '',
                taxId: selectedClient.taxId || '',
                taxFileNo: selectedClient.taxFileNo || '',
                owner: selectedClient.owner || '',
                contact: selectedClient.contact || '',
                phone: selectedClient.phone || '',
                fax: selectedClient.fax || '',
                email: selectedClient.email || '',
                regAddress: selectedClient.regAddress || '',
                contactAddress: selectedClient.contactAddress || '',
                cpa: selectedClient.cpa || '',
                period: selectedClient.period || '',
                feeMonthly: selectedClient.feeMonthly || '',
                f1: selectedClient.feeWithholding || '',
                f2: selectedClient.feeTax || '',
                f3: selectedClient.fee22_1 || '',
                c1: selectedClient.chkAccount ? "P" : "O",
                c2: selectedClient.chkInvoice ? "P" : "O",
                c3: selectedClient.chkVat ? "P" : "O",
                c4: selectedClient.chkWithholding ? "P" : "O",
                c5: selectedClient.chkHealth ? "P" : "O",
                b1: selectedClient.boxReview ? '■' : '□',
                b2: selectedClient.boxAudit ? '■' : '□',
                b3: selectedClient.boxCpa ? '■' : '□',
            };
            doc.render(data);
            const out = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            saveAs(out, `記帳工作單_${selectedClient.year || ''}_${selectedClient.name}.docx`);
        } catch (error: any) {
            alert("❌ 生成失敗，請確認模版格式。");
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-100 z-[100] overflow-hidden flex flex-col animate-fade-in">
          {/* --- 統一合併後的頂部操作列 --- */}
            <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    {/* ✨ 返回/關閉按鈕 */}
                    <button onClick={onClose} title="返回首頁" className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <ReturnIcon className="w-6 h-6" />
                    </button>
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl">🏢</div>
                    {/* ✨ 標題修改 */}
                    <h2 className="text-2xl font-black text-gray-800">客戶總覽</h2>
                </div>
                
                <div className="flex gap-2">
                    {/* ✨ 修復：將 onChange 綁定到正確的 handleExcelImport */}
                    <input type="file" ref={fileInputRef} onChange={handleExcelImport} accept=".xlsx, .xls" className="hidden" />
                    
                    {/* ✨ 匯入 Excel 按鈕 (純圖示) */}
                    <button onClick={() => fileInputRef.current?.click()} title="匯入 Excel" className="p-2.5 bg-white border border-green-200 text-green-600 rounded-xl hover:bg-green-50 font-bold transition-colors shadow-sm flex items-center justify-center">
                        <ExcelFileIcon className="w-5 h-5" />
                    </button>
                    
                    {/* ✨ 刪除模式切換按鈕 (純圖示) */}
                    <button onClick={() => setIsDeleteMode(!isDeleteMode)} title="刪除客戶" className={`p-2.5 rounded-xl border transition-colors flex items-center justify-center shadow-sm ${isDeleteMode ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}>
                        <TrashIcon className="w-5 h-5" />
                    </button>

                    {/* ✨ 新增客戶按鈕 (純圖示) */}
                    <button onClick={handleAddClient} title="新增客戶" className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-sm transition-colors flex items-center justify-center">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {clients.map(client => (
                        <div 
                            key={client.id} 
                            /* 🆕 根據是否在「刪除模式」來決定點擊行為 */
                            onClick={() => isDeleteMode ? handleDeleteClient(client.id, client.name) : setSelectedClient(client)}
                            className={`bg-white rounded-2xl shadow-sm transition-all cursor-pointer aspect-square flex flex-col items-center justify-center p-4 border relative group overflow-hidden ${isDeleteMode ? 'border-red-400 hover:bg-red-50 hover:shadow-red-200' : 'border-gray-100 hover:shadow-xl'}`}
                        >
                            {/* 狀態燈號 */}
                            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${client.taxId ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}></div>
                            
                            {/* 🆕 刪除模式的紅色蒙版特效 */}
                            {isDeleteMode && (
                                <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-4xl">🗑️</span>
                                </div>
                            )}

                            <span className="font-mono text-gray-400 font-bold mb-3 text-lg">{client.code}</span>
                            <span className={`font-bold text-2xl transition-colors text-center ${isDeleteMode ? 'group-hover:text-red-600 text-gray-800' : 'group-hover:text-indigo-600 text-gray-800'}`}>{client.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {selectedClient && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                {/* 新增時如果是空資料，顯示 "新增客戶" */}
                                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg font-mono">{selectedClient.code || 'NEW'}</span>
                                {selectedClient.name || '新增客戶資料'}
                            </h3>
                            <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-800 text-2xl">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-indigo-600 border-b pb-2">📂 基本資料</h4>
                                    <div className="grid grid-cols-3 gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div><label className="text-xs text-indigo-800 font-bold">客戶編號</label><input type="text" value={selectedClient.code || ''} onChange={e => handleChange('code', e.target.value)} className="w-full border p-2 rounded-lg bg-white" /></div>
                                        <div><label className="text-xs text-indigo-800 font-bold">記帳年度</label><input type="text" value={selectedClient.year || ''} onChange={e => handleChange('year', e.target.value)} className="w-full border p-2 rounded-lg bg-white" /></div>
                                        <div><label className="text-xs text-indigo-800 font-bold">記帳工作</label><input type="text" value={selectedClient.workNo || ''} onChange={e => handleChange('workNo', e.target.value)} className="w-full border p-2 rounded-lg bg-white" /></div>
                                    </div>
                                    <div><label className="text-xs text-gray-500 font-bold">公司簡稱 (系統顯示用)</label><input type="text" value={selectedClient.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    <div><label className="text-xs text-gray-500 font-bold">公司全名 (表單用)</label><input type="text" value={selectedClient.fullName || ''} onChange={e => handleChange('fullName', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">統一編號</label><input type="text" value={selectedClient.taxId || ''} onChange={e => handleChange('taxId', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">稅籍編號</label><input type="text" value={selectedClient.taxFileNo || ''} onChange={e => handleChange('taxFileNo', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">負責人</label><input type="text" value={selectedClient.owner || ''} onChange={e => handleChange('owner', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">聯絡人</label><input type="text" value={selectedClient.contact || ''} onChange={e => handleChange('contact', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    </div>
                                    <div><label className="text-xs text-gray-500 font-bold">電話</label><input type="text" value={selectedClient.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    <div><label className="text-xs text-gray-500 font-bold">登記地址</label><input type="text" value={selectedClient.regAddress || ''} onChange={e => handleChange('regAddress', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    <div><label className="text-xs text-gray-500 font-bold">聯絡地址</label><input type="text" value={selectedClient.contactAddress || ''} onChange={e => handleChange('contactAddress', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-indigo-600 border-b pb-2">💼 委任與公費</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">負責會計師</label><input type="text" value={selectedClient.cpa || ''} onChange={e => handleChange('cpa', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">委任期限</label><input type="text" value={selectedClient.period || ''} onChange={e => handleChange('period', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    </div>
                                  <div className="grid grid-cols-2 gap-3 mt-2">
                                        <div><label className="text-xs text-gray-500 font-bold">委任公費</label><input type="text" value={selectedClient.feeMonthly || ''} onChange={e => handleCurrencyChange('feeMonthly', e.target.value)} className="w-full border p-2 rounded-lg font-mono font-bold text-blue-600 text-right" placeholder="0" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">各類扣繳 (f1)</label><input type="text" value={selectedClient.feeWithholding || ''} onChange={e => handleCurrencyChange('feeWithholding', e.target.value)} className="w-full border p-2 rounded-lg font-mono font-bold text-blue-600 text-right" placeholder="0" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">結算申報 (f2)</label><input type="text" value={selectedClient.feeTax || ''} onChange={e => handleCurrencyChange('feeTax', e.target.value)} className="w-full border p-2 rounded-lg font-mono font-bold text-blue-600 text-right" placeholder="0" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">22-1申報 (f3)</label><input type="text" value={selectedClient.fee22_1 || ''} onChange={e => handleCurrencyChange('fee22_1', e.target.value)} className="w-full border p-2 rounded-lg font-mono font-bold text-blue-600 text-right" placeholder="0" /></div>
                                    </div>

                                    <h4 className="font-bold text-indigo-600 border-b pb-2 mt-6">☑ 項目勾選</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkAccount || false} onChange={e => handleChange('chkAccount', e.target.checked)} /> 會計帳務</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkInvoice || false} onChange={e => handleChange('chkInvoice', e.target.checked)} /> 買發票</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkVat || false} onChange={e => handleChange('chkVat', e.target.checked)} /> 營業稅</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkWithholding || false} onChange={e => handleChange('chkWithholding', e.target.checked)} /> 扣繳申報</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkHealth || false} onChange={e => handleChange('chkHealth', e.target.checked)} /> 補充保費</label>
                                    </div>

                                    <h4 className="font-bold text-indigo-600 border-b pb-2 mt-6">■ 申報方式</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.boxReview || false} onChange={e => handleChange('boxReview', e.target.checked)} /> 書審</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.boxAudit || false} onChange={e => handleChange('boxAudit', e.target.checked)} /> 查帳</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.boxCpa || false} onChange={e => handleChange('boxCpa', e.target.checked)} /> 簽證</label>
                                    </div>
                                </div>
                            </div>
                          
                          {/* ========================================== */}
                          {/* ✨ 新增：下半部工作紀錄與收費追蹤分頁 */}
                          {/* ========================================== */}
                          <div className="mt-8 border-t border-gray-200 pt-6">
                            {/* 📋 標籤頁切換按鈕 */}
                            <div className="flex gap-4 mb-6 border-b border-gray-100 pb-2">
                              <button 
                                onClick={() => setActiveTab('work')}
                                className={`pb-2 px-4 font-bold text-sm transition-all ${activeTab === 'work' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                工作紀錄 (會計帳務)
                              </button>
                              <button 
                                onClick={() => setActiveTab('payment')}
                                className={`pb-2 px-4 font-bold text-sm transition-all ${activeTab === 'payment' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                收款情形
                              </button>
                            </div>
                            {/* 🟢 分頁內容 A：工作紀錄 (三欄式 + 一鍵蓋章 UI) */}
                                {activeTab === 'work' && (
                                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                                        <table className="min-w-[600px] w-full text-left text-sm">
                                            <thead className="bg-blue-600 text-white font-bold border-b border-blue-700">
                                                <tr>
                                                    <th className="px-4 py-3 w-32 text-center border-r border-blue-700">期間</th>
                                                    <th className="px-4 py-3 border-r border-blue-700 w-[40%]">Incharge</th>
                                                    <th className="px-4 py-3 w-[40%]">會計師</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {['1-2月', '3-4月', '5-6月', '7-8月', '9-10月', '11-12月', '扣繳申報', '年終申報'].map((period) => (
                                                    <tr key={period} className="hover:bg-blue-100/30 transition-colors group">
                                                        <td className="px-4 py-3 font-bold text-center text-blue-900 bg-blue-50 border-r border-blue-100">{period}</td>
                                                        
                                                        {/* Incharge 蓋章區 */}
                                                        <td className="px-4 py-2 border-r border-gray-100 relative cursor-pointer" 
                                                            onClick={(e) => {
                                                                const target = e.currentTarget.querySelector('input');
                                                                if(target && !target.value) target.value = `測試員 ${new Date().getMonth()+1}/${new Date().getDate()}`;
                                                            }}>
                                                            <div className="flex items-center justify-between">
                                                                <input type="text" readOnly className="w-full bg-transparent border-none text-blue-800 font-bold outline-none cursor-pointer placeholder-gray-300" placeholder="點擊簽章..." />
                                                                <button onClick={(e) => { e.stopPropagation(); const target = e.currentTarget.previousElementSibling as HTMLInputElement; target.value = ''; }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">✕</button>
                                                            </div>
                                                        </td>

                                                        {/* 會計師 蓋章區 */}
                                                        <td className="px-4 py-2 relative cursor-pointer"
                                                            onClick={(e) => {
                                                                const target = e.currentTarget.querySelector('input');
                                                                if(target && !target.value) target.value = `會計師 ${new Date().getMonth()+1}/${new Date().getDate()}`;
                                                            }}>
                                                            <div className="flex items-center justify-between">
                                                                <input type="text" readOnly className="w-full bg-transparent border-none text-blue-800 font-bold outline-none cursor-pointer placeholder-gray-300" placeholder="點擊簽章..." />
                                                                <button onClick={(e) => { e.stopPropagation(); const target = e.currentTarget.previousElementSibling as HTMLInputElement; target.value = ''; }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">✕</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                            {/* 🔵 分頁內容 B：收費追蹤 (雙層表頭、緊湊排版無捲動條) */}
                                {activeTab === 'payment' && (
                                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                                        {/* 把 min-w 縮小到 700px，確保多數螢幕都能一頁看完 */}
                                        <table className="w-full min-w-[700px] text-left text-sm">
                                            <thead className="bg-blue-600 text-white font-bold">
                                                {/* 第一層：大群組分類 */}
                                                <tr>
                                                    <th rowSpan={2} className="px-2 py-3 w-12 text-center border-r border-b border-blue-700 align-middle">期別</th>
                                                    <th colSpan={2} className="px-2 py-2 text-center border-r border-b border-blue-700">開立收據情形</th>
                                                    <th colSpan={3} className="px-2 py-2 text-center border-b border-blue-700">收款情形</th>
                                                </tr>
                                                {/* 第二層：實際欄位名稱 */}
                                                <tr>
                                                    <th className="px-2 py-2 border-r border-b border-blue-700 text-center">日期 / 號碼 / 金額</th>
                                                    <th className="px-2 py-2 w-28 border-r border-b border-blue-700 text-center">核准</th>
                                                    <th className="px-2 py-2 w-20 border-r border-b border-blue-700 text-center">送款日</th>
                                                    <th className="px-2 py-2 w-28 border-r border-b border-blue-700 text-center">金額 (收款)</th>
                                                    <th className="px-2 py-2 w-28 border-b border-blue-700 text-center">簽收</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                                                    <tr key={num} className="hover:bg-blue-100/30 transition-colors group">
                                                        {/* 期別 */}
                                                        <td className="px-2 py-2 font-bold text-center text-blue-900 bg-blue-50 border-r border-blue-100">{num}</td>
                                                        
                                                        {/* [開立收據情形] 日期/號碼/金額 */}
                                                        <td className="px-2 py-2 border-r border-gray-100">
                                                            <div className="flex justify-center gap-2">
                                                                {/* 縮小輸入框寬度，減少空白 */}
                                                                <input type="text" className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none text-center text-blue-800" placeholder="M/D" />
                                                                <input type="text" className="w-16 bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none text-center text-blue-800" placeholder="號碼" />
                                                                <input type="text" className="w-20 font-bold text-blue-600 bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none text-right" placeholder="$" />
                                                            </div>
                                                        </td>
                                                        
                                                        {/* [開立收據情形] 核准 (一鍵蓋章) */}
                                                        <td className="px-2 py-2 border-r border-gray-100 relative cursor-pointer" 
                                                            onClick={(e) => {
                                                                const target = e.currentTarget.querySelector('input');
                                                                if(target && !target.value) target.value = `主管 ${new Date().getMonth()+1}/${new Date().getDate()}`;
                                                            }}>
                                                            <div className="flex items-center justify-between">
                                                                <input type="text" readOnly className="w-full bg-transparent border-none text-blue-800 font-bold outline-none cursor-pointer placeholder-gray-300 text-center" placeholder="點擊核准" />
                                                                <button onClick={(e) => { e.stopPropagation(); const target = e.currentTarget.previousElementSibling as HTMLInputElement; target.value = ''; }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">✕</button>
                                                            </div>
                                                        </td>

                                                        {/* [收款情形] 送款日 */}
                                                        <td className="px-2 py-2 border-r border-gray-100">
                                                            <input type="text" className="w-full bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none text-center text-blue-800" placeholder="M/D" />
                                                        </td>

                                                        {/* [收款情形] 金額(收款) */}
                                                        <td className="px-2 py-2 border-r border-gray-100">
                                                            <input type="text" className="w-full font-bold text-green-600 bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none text-right" placeholder="$" />
                                                        </td>

                                                        {/* [收款情形] 簽收 (一鍵蓋章) */}
                                                        <td className="px-2 py-2 relative cursor-pointer"
                                                            onClick={(e) => {
                                                                const target = e.currentTarget.querySelector('input');
                                                                if(target && !target.value) target.value = `簽收人 ${new Date().getMonth()+1}/${new Date().getDate()}`;
                                                            }}>
                                                            <div className="flex items-center justify-between">
                                                                <input type="text" readOnly className="w-full bg-transparent border-none text-blue-800 font-bold outline-none cursor-pointer placeholder-gray-300 text-center" placeholder="點擊簽收" />
                                                                <button onClick={(e) => { e.stopPropagation(); const target = e.currentTarget.previousElementSibling as HTMLInputElement; target.value = ''; }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">✕</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 底部操作區 */}
                      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                            {/* ✨ 單筆刪除按鈕 (純圖示) */}
                            <button 
                                onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
                                title="刪除此客戶"
                                className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm flex items-center justify-center active:scale-95"
                            >
                                <TrashIcon className="w-6 h-6" />
                            </button>
                        <div className="flex gap-3">
                                {/* ✨ 儲存資料 (改為藍色、雲端上傳圖示，並移至左側) */}
                                <button 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    title={isSaving ? '儲存中...' : '儲存資料'}
                                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center justify-center active:scale-95"
                                >
                                    {isSaving ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <CloudArrowUpIcon className="w-6 h-6" />
                                    )}
                                </button>
                                
                                {/* ✨ 下載工作單 (改為綠色、雲端下載圖示，並移至右側) */}
                                <button 
                                    onClick={handleGenerateWord}
                                    title="下載記帳工作單"
                                    className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-md transition-colors flex items-center justify-center active:scale-95"
                                >
                                    <CloudArrowDownIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
