// src/ClientMasterView.tsx

import React, { useState } from 'react';
import { Client } from './types';
import { TaskService } from './taskService';

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { WORK_ORDER_TEMPLATE_BASE64 } from './wordTemplate';
import * as XLSX from 'xlsx';

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

    const handleChange = (field: keyof Client, value: any) => {
        if (selectedClient) {
            setSelectedClient({ ...selectedClient, [field]: value });
        }
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

    // Excel 匯入邏輯 (保留您確認過的完美版)
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
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                const isChecked = (val: any) => {
                    if (val == null) return false;
                    const str = String(val).trim().toUpperCase();
                    return ['V', '1', 'TRUE', 'Y', '是', '☑', 'P', '■'].includes(str);
                };

                const newClients: Client[] = json.map((row) => {
                    const formalName = String(row['客戶名稱'] || '').trim();
                    const shortName = formalName.replace(/(股份有限公司|有限公司|企業社|商行|實業|國際|廣告)/g, '').trim();

                    return {
                        id: Date.now() + Math.random(),
                        year: row['記帳年度'] != null ? String(row['記帳年度']) : '',
                        workNo: row['記帳工作'] != null ? String(row['記帳工作']) : '',
                        code: row['客戶編號'] != null ? String(row['客戶編號']) : '',
                        name: shortName,      
                        fullName: formalName, 
                        taxId: row['統一編號'] != null ? String(row['統一編號']) : '',
                        taxFileNo: row['稅籍編號'] != null ? String(row['稅籍編號']) : '',
                        owner: row['負責人'] != null ? String(row['負責人']) : '',
                        contact: row['聯絡人'] != null ? String(row['聯絡人']) : '',
                        phone: row['電話'] != null ? String(row['電話']) : '',
                        fax: row['傳真'] != null ? String(row['傳真']) : '',
                        email: row['Email'] != null ? String(row['Email']) : '',
                        regAddress: row['公司登記地址'] != null ? String(row['公司登記地址']) : '',
                        contactAddress: row['公司聯絡地址'] != null ? String(row['公司聯絡地址']) : '',
                        cpa: row['負責會計師'] != null ? String(row['負責會計師']) : '',
                        chkAccount: isChecked(row['會計帳務']),
                        chkInvoice: isChecked(row['買發票']),
                        chkVat: isChecked(row['申報營業稅']),
                        chkWithholding: isChecked(row['扣繳申報']),
                        chkHealth: isChecked(row['補充保費']),
                        period: row['委任期限'] != null ? String(row['委任期限']) : '',
                        feeMonthly: row['委任公費'] != null ? String(row['委任公費']) : '',
                        feeWithholding: row['各類扣繳'] != null ? String(row['各類扣繳']) : '',
                        feeTax: row['結算申報'] != null ? String(row['結算申報']) : '',
                        fee22_1: row['22-1申報'] != null ? String(row['22-1申報']) : '',
                        boxReview: isChecked(row['書審']),
                        boxAudit: isChecked(row['查帳']),
                        boxCpa: isChecked(row['會計師簽證']),
                    };
                });

                if (window.confirm(`偵測到 ${newClients.length} 筆客戶資料，是否確定匯入？`)) {
                    const combined = [...clients, ...newClients];
                    await TaskService.saveClients(combined);
                    onUpdate();
                    alert("🎉 匯入成功！資料已同步至系統。");
                }
            } catch (err) {
                alert("❌ 匯入失敗，請確認 Excel 欄位名稱是否正確。");
            }
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
            <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl">🏢</div>
                    <h2 className="text-xl font-bold text-gray-800">客戶資訊總署 (Client Master)</h2>
                </div>
                
                {/* 🆕 右上角按鈕：新增 -> 刪除 -> 匯入 -> 關閉 */}
                <div className="flex gap-2">
                    <button 
                        onClick={handleAddClient}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors"
                    >
                        ➕ 新增
                    </button>
                    
                    <button 
                        onClick={() => setIsDeleteMode(!isDeleteMode)}
                        className={`${isDeleteMode ? 'bg-red-600 text-white shadow-inner' : 'bg-red-50 text-red-600 hover:bg-red-100'} px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all`}
                    >
                        🗑️ {isDeleteMode ? '取消刪除模式' : '刪除'}
                    </button>

                    <button 
                        onClick={() => document.getElementById('excel-upload')?.click()}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors"
                    >
                        📊 匯入 EXCEL
                    </button>
                    <input type="file" id="excel-upload" className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} />
                    
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold px-4 py-2 bg-gray-100 rounded-lg">✕ 關閉</button>
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
                                        <div><label className="text-xs text-gray-500 font-bold">每月公費</label><input type="text" value={selectedClient.feeMonthly || ''} onChange={e => handleChange('feeMonthly', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">各類扣繳 (f1)</label><input type="text" value={selectedClient.feeWithholding || ''} onChange={e => handleChange('feeWithholding', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">結算申報 (f2)</label><input type="text" value={selectedClient.feeTax || ''} onChange={e => handleChange('feeTax', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">22-1申報 (f3)</label><input type="text" value={selectedClient.fee22_1 || ''} onChange={e => handleChange('fee22_1', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
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
                        </div>

                        {/* 底部操作區 */}
                        <div className="p-4 bg-gray-50 border-t rounded-b-3xl flex justify-between items-center">
                            {/* 🆕 單筆刪除按鈕 (位於左側) */}
                            <button 
                                onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
                                className="px-4 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-colors"
                            >
                                🗑️ 刪除此客戶
                            </button>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg"
                                >
                                    {isSaving ? '儲存中...' : '💾 儲存資料'}
                                </button>
                                <button 
                                    onClick={handleGenerateWord}
                                    className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 shadow-lg"
                                >
                                    🖨️ 生成記帳工作單
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
