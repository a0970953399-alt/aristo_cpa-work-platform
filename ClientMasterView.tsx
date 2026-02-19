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

    const handleChange = (field: keyof Client, value: any) => {
        if (selectedClient) {
            setSelectedClient({ ...selectedClient, [field]: value });
        }
    };

    const handleSave = async () => {
        if (!selectedClient) return;
        setIsSaving(true);
        try {
            const updatedClients = clients.map(c => c.id === selectedClient.id ? selectedClient : c);
            await TaskService.saveClients(updatedClients);
            onUpdate();
            alert('✅ 客戶資料已儲存！');
        } catch (error) {
            alert('儲存失敗，請重試。');
        } finally {
            setIsSaving(false);
        }
    };

    // 🆕 針對事務所 Excel 格式優化的匯入邏輯
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

                [cite_start]// 根據您提供的 Excel 標題依序對應 [cite: 1]
                const newClients: Client[] = json.map((row) => {
                    // 小工具：判斷是否勾選 (支援 V、1、或 true)
                    const isChecked = (val: any) => val === 'V' || val === 'v' || val === 1 || val === true;

                    return {
                        id: Date.now() + Math.random(),
                        year: String(row['記帳年度'] || ''),
                        workNo: String(row['記帳工作'] || ''),
                        code: String(row['客戶編號'] || ''),
                        name: String(row['客戶名稱'] || ''),
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
                        
                        // 委任勾選項目
                        chkAccount: isChecked(row['會計帳務']),
                        chkInvoice: isChecked(row['買發票']),
                        chkVat: isChecked(row['申報營業稅']),
                        chkWithholding: isChecked(row['扣繳申報']),
                        chkHealth: isChecked(row['補充保費']),
                        
                        // 公費資訊
                        period: String(row['委任期限'] || ''),
                        feeMonthly: String(row['委任公費'] || ''),
                        feeWithholding: String(row['各類扣繳'] || ''),
                        feeTax: String(row['結算申報'] || ''),
                        fee22_1: String(row['22-1申報'] || ''),
                        
                        // 申報方式
                        boxReview: isChecked(row['書審']),
                        boxAudit: isChecked(row['查帳']),
                        boxCpa: isChecked(row['會計師簽證']),
                    };
                });

                if (window.confirm(`偵測到 ${newClients.length} 筆客戶，是否確定匯入？`)) {
                    const combined = [...clients, ...newClients];
                    await TaskService.saveClients(combined);
                    onUpdate();
                    alert("🎉 匯入成功！");
                }
            } catch (err) {
                console.error("Excel Import Error:", err);
                alert("❌ 匯入失敗，請確認檔案格式是否與規定的欄位名稱一致。");
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

            doc.render({
                ...selectedClient,
                clientCode: selectedClient.code,
                clientName: selectedClient.fullName || selectedClient.name,
                f1: selectedClient.feeWithholding,
                f2: selectedClient.feeTax,
                f3: selectedClient.fee22_1,
                c1: selectedClient.chkAccount ? "P" : "O",
                c2: selectedClient.chkInvoice ? "P" : "O",
                c3: selectedClient.chkVat ? "P" : "O",
                c4: selectedClient.chkWithholding ? "P" : "O",
                c5: selectedClient.chkHealth ? "P" : "O",
                b1: selectedClient.boxReview ? '■' : '□',
                b2: selectedClient.boxAudit ? '■' : '□',
                b3: selectedClient.boxCpa ? '■' : '□',
            });

            const out = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            saveAs(out, `記帳工作單_${selectedClient.year}_${selectedClient.name}.docx`);
        } catch (error) {
            alert("❌ 生成失敗，請確認模版。");
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-100 z-[100] overflow-hidden flex flex-col">
            <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl">🏢</div>
                    <h2 className="text-xl font-bold text-gray-800">客戶資訊總署 (Client Master)</h2>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => document.getElementById('excel-upload')?.click()}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"
                    >
                        📊 匯入事務所 Excel
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
                            onClick={() => setSelectedClient(client)}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer aspect-square flex flex-col items-center justify-center p-4 border border-gray-100 group relative"
                        >
                            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${client.taxId ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="font-mono text-gray-400 font-bold mb-3 text-lg">{client.code}</span>
                            <span className="font-bold text-gray-800 text-xl text-center">{client.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {selectedClient && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg font-mono">{selectedClient.code}</span>
                                {selectedClient.name}
                            </h3>
                            <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-800 text-2xl">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-indigo-600 border-b pb-2">📂 基本資料</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="text" placeholder="年度" value={selectedClient.year} onChange={e => handleChange('year', e.target.value)} className="border p-2 rounded" />
                                    <input type="text" placeholder="代號" value={selectedClient.code} onChange={e => handleChange('code', e.target.value)} className="border p-2 rounded" />
                                    <input type="text" placeholder="工作號" value={selectedClient.workNo} onChange={e => handleChange('workNo', e.target.value)} className="border p-2 rounded" />
                                </div>
                                <input type="text" placeholder="全名" value={selectedClient.fullName} onChange={e => handleChange('fullName', e.target.value)} className="w-full border p-2 rounded" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="統編" value={selectedClient.taxId} onChange={e => handleChange('taxId', e.target.value)} className="border p-2 rounded" />
                                    <input type="text" placeholder="稅籍" value={selectedClient.taxFileNo} onChange={e => handleChange('taxFileNo', e.target.value)} className="border p-2 rounded" />
                                </div>
                                <input type="text" placeholder="地址" value={selectedClient.regAddress} onChange={e => handleChange('regAddress', e.target.value)} className="w-full border p-2 rounded" />
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-indigo-600 border-b pb-2">💼 委任與公費</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="會計師" value={selectedClient.cpa} onChange={e => handleChange('cpa', e.target.value)} className="border p-2 rounded" />
                                    <input type="text" placeholder="公費" value={selectedClient.feeMonthly} onChange={e => handleChange('feeMonthly', e.target.value)} className="border p-2 rounded font-bold text-blue-600" />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={selectedClient.chkAccount} onChange={e => handleChange('chkAccount', e.target.checked)} /> 帳務</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={selectedClient.chkInvoice} onChange={e => handleChange('chkInvoice', e.target.checked)} /> 發票</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={selectedClient.chkVat} onChange={e => handleChange('chkVat', e.target.checked)} /> 營業稅</label>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between gap-4">
                                    <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">💾 儲存</button>
                                    <button onClick={handleGenerateWord} className="flex-1 py-3 bg-black text-white font-bold rounded-xl shadow-lg">🖨️ 生成工作單</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
