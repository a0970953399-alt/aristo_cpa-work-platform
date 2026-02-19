// src/ClientMasterView.tsx

import React, { useState } from 'react';
import { Client } from './types';
import { TaskService } from './taskService';

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { WORK_ORDER_TEMPLATE_BASE64 } from './wordTemplate';
// 🆕 引入 Excel 處理工具
import * as XLSX from 'xlsx';

interface ClientMasterViewProps {
    clients: Client[];
    onClose: () => void;
    onUpdate: () => void; // 通知 Dashboard 重新讀取資料
}

export const ClientMasterView: React.FC<ClientMasterViewProps> = ({ clients, onClose, onUpdate }) => {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 處理欄位變更
    const handleChange = (field: keyof Client, value: any) => {
        if (selectedClient) {
            setSelectedClient({ ...selectedClient, [field]: value });
        }
    };

    // 儲存客戶資料 (手動編輯用)
    const handleSave = async () => {
        if (!selectedClient) return;
        setIsSaving(true);
        try {
            const updatedClients = clients.map(c => c.id === selectedClient.id ? selectedClient : c);
            await TaskService.saveClients(updatedClients);
            onUpdate(); // 更新全域資料
            alert('✅ 客戶資料已儲存！');
        } catch (error) {
            alert('儲存失敗，請重試。');
        } finally {
            setIsSaving(false);
        }
    };

    // 🆕 📊 Excel 匯入核心邏輯：對接事務所現有欄位
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

                // 判斷是否勾選的輔助工具 (支援 V, 1, 或 true)
                const isChecked = (val: any) => val === 'V' || val === 'v' || val === 1 || val === true || val === 'True';

                // 依照您提供的 Excel 欄位順序進行對接
                const newClients: Client[] = json.map((row) => ({
                    id: Date.now() + Math.random(),
                    year: String(row['記帳年度'] || ''),
                    workNo: String(row['記帳工作'] || ''),
                    code: String(row['客戶編號'] || ''),
                    name: String(row['客戶名稱'] || ''), // 簡寫與全名暫時共用此欄位
                    fullName: String(row['客戶名稱'] || ''),
                    taxId: String(row['統一編號'] || ''),
                    taxFileNo: String(row['稅籍編號'] || ''),
                    owner: String(row['負責人'] || ''),
                    contact: String(row['聯絡人'] || ''),
                    phone: String(row['電話'] || ''),
                    fax: String(row['傳真'] || ''),
                    email: String(row['Email'] || ''),
                    regAddress: String(row['公司登記地址'] || ''),
                    contactAddress: String(row['公司聯絡地址'] || ''),
                    cpa: String(row['負責會計師'] || ''),
                    
                    // 委任事項勾選 (c1 ~ c5)
                    chkAccount: isChecked(row['會計帳務']),
                    chkInvoice: isChecked(row['買發票']),
                    chkVat: isChecked(row['申報營業稅']),
                    chkWithholding: isChecked(row['扣繳申報']),
                    chkHealth: isChecked(row['補充保費']),
                    
                    period: String(row['委任期限'] || ''),
                    
                    // 公費金額
                    feeMonthly: String(row['委任公費'] || ''),
                    feeWithholding: String(row['各類扣繳'] || ''),
                    feeTax: String(row['結算申報'] || ''),
                    fee22_1: String(row['22-1申報'] || ''),
                    
                    // 申報方式勾選 (b1 ~ b3)
                    boxReview: isChecked(row['書審']),
                    boxAudit: isChecked(row['查帳']),
                    boxCpa: isChecked(row['會計師簽證']),
                }));

                if (window.confirm(`偵測到 ${newClients.length} 筆客戶資料，是否確定匯入？`)) {
                    const combined = [...clients, ...newClients];
                    await TaskService.saveClients(combined);
                    onUpdate(); // 同步全域資料
                    alert("🎉 匯入成功！資料已同步至系統。");
                }
            } catch (err) {
                console.error("Excel Import Error:", err);
                alert("❌ 匯入失敗，請確認 Excel 欄位名稱是否正確。");
            }
        };
        reader.readAsBinaryString(file);
    };

    // 🖨️ 一鍵生成 Word 核心邏輯
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

            const fileName = `記帳工作單_${selectedClient.year || ''}_${selectedClient.name}.docx`;
            saveAs(out, fileName);

        } catch (error: any) {
            console.error("生成 Word 失敗詳細資訊:", error);
            alert("❌ 生成失敗，請確認模版格式。");
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-100 z-[100] overflow-hidden flex flex-col animate-fade-in">
            {/* 頂部導航列 */}
            <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl">🏢</div>
                    <h2 className="text-xl font-bold text-gray-800">客戶資訊總署 (Client Master)</h2>
                </div>
                
                {/* 🆕 匯入按鈕與關閉按鈕 */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => document.getElementById('excel-upload')?.click()}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors"
                    >
                        📊 匯入事務所 Excel
                    </button>
                    <input 
                        type="file" 
                        id="excel-upload" 
                        className="hidden" 
                        accept=".xlsx, .xls" 
                        onChange={handleExcelImport} 
                    />
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-lg px-4 py-2 bg-gray-100 rounded-lg">✕ 關閉</button>
                </div>
            </div>

            {/* 客戶方塊牆 */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {clients.map(client => (
                        <div 
                            key={client.id} 
                            onClick={() => setSelectedClient(client)}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer aspect-square flex flex-col items-center justify-center p-4 border border-gray-100 group relative"
                        >
                            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${client.taxId ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}></div>
                            <span className="font-mono text-gray-400 font-bold mb-3 text-lg">{client.code}</span>
                            <span className="font-bold text-gray-800 text-2xl group-hover:text-indigo-600 transition-colors text-center">{client.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 詳細資料卡彈窗 */}
            {selectedClient && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg font-mono">{selectedClient.code}</span>
                                {selectedClient.name}
                            </h3>
                            <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-800 text-2xl">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 左側：基本資料 (保留手動輸入) */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-indigo-600 border-b pb-2">📂 基本資料</h4>
                                    <div className="grid grid-cols-3 gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div><label className="text-xs text-indigo-800 font-bold">客戶編號</label><input type="text" value={selectedClient.code || ''} onChange={e => handleChange('code', e.target.value)} className="w-full border p-2 rounded-lg bg-white" /></div>
                                        <div><label className="text-xs text-indigo-800 font-bold">記帳年度</label><input type="text" value={selectedClient.year || ''} onChange={e => handleChange('year', e.target.value)} className="w-full border p-2 rounded-lg bg-white" /></div>
                                        <div><label className="text-xs text-indigo-800 font-bold">記帳工作</label><input type="text" value={selectedClient.workNo || ''} onChange={e => handleChange('workNo', e.target.value)} className="w-full border p-2 rounded-lg bg-white" /></div>
                                    </div>
                                    <div><label className="text-xs text-gray-500 font-bold">客戶名稱</label><input type="text" value={selectedClient.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
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

                                {/* 右側：委任資訊 & 選項 */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-indigo-600 border-b pb-2">💼 委任與公費</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">負責會計師</label><input type="text" value={selectedClient.cpa || ''} onChange={e => handleChange('cpa', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">委任期限</label><input type="text" value={selectedClient.period || ''} onChange={e => handleChange('period', e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">每月公費</label><input type="text" value={selectedClient.feeMonthly || ''} onChange={e => handleChange('feeMonthly', e.target.value)} className="w-full border p-2 rounded-lg font-bold text-blue-600" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">各類扣繳 (f1)</label><input type="text" value={selectedClient.feeWithholding || ''} onChange={e => handleChange('feeWithholding', e.target.value)} className="w-full border p-2 rounded-lg font-bold text-blue-600" /></div>
                                    </div>

                                    <h4 className="font-bold text-indigo-600 border-b pb-2 mt-6">☑ 項目勾選</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkAccount || false} onChange={e => handleChange('chkAccount', e.target.checked)} /> 會計帳務</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkInvoice || false} onChange={e => handleChange('chkInvoice', e.target.checked)} /> 買發票</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedClient.chkVat || false} onChange={e => handleChange('chkVat', e.target.checked)} /> 營業稅</label>
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
            )}
        </div>
    );
};
