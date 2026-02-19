// src/ClientMasterView.tsx

import React, { useState } from 'react';
import { Client } from './types';
import { TaskService } from './taskService';

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { WORK_ORDER_TEMPLATE_BASE64 } from './wordTemplate';

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

    // 儲存客戶資料
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

    // 🖨️ 一鍵生成 Word 核心邏輯
    const handleGenerateWord = () => {
        if (!selectedClient) return;

        try {
            // 1. 將 Base64 轉成二進位資料
            const binaryString = window.atob(WORK_ORDER_TEMPLATE_BASE64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // 2. 載入 Zip (Word 本質上是個 Zip 檔)
            const zip = new PizZip(bytes.buffer);

            // 3. 初始化 Docxtemplater
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: "[[", end: "]]" }, // 強制改用方括號
            });

            // 4. 準備要替換的資料字典 (將資料庫格式轉為 Word 變數)
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

                // 金額欄位
                feeMonthly: selectedClient.feeMonthly || '',
                f1: selectedClient.feeWithholding || '',
                f2: selectedClient.feeTax || '',
                f3: selectedClient.fee22_1 || '',

                // 邏輯判斷：打勾與空白 (c1 ~ c5)
                c1: selectedClient.chkAccount ? "P" : "O",
                c2: selectedClient.chkInvoice ? "P" : "O",
                c3: selectedClient.chkVat ? "P" : "O",
                c4: selectedClient.chkWithholding ? "P" : "O",
                c5: selectedClient.chkHealth ? "P" : "O",

                // 邏輯判斷：實心與空心方塊 (b1 ~ b3)
                b1: selectedClient.boxReview ? '■' : '□',
                b2: selectedClient.boxAudit ? '■' : '□',
                b3: selectedClient.boxCpa ? '■' : '□',
            };

            // 5. 執行替換
            doc.render(data);

            // 6. 產出檔案並觸發下載
            const out = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            // 檔名自動套用：記帳工作單_114_叁个山.docx
            const fileName = `記帳工作單_${selectedClient.year || ''}_${selectedClient.name}.docx`;
            saveAs(out, fileName);

        } catch (error: any) {
            console.error("生成 Word 失敗詳細資訊:", error);

            // 專門捕捉 Word 變數打錯的錯誤
            if (error.properties && error.properties.errors) {
                const errorDetails = error.properties.errors
                    .map((e: any) => `• 出錯的標籤：${e.properties.id || '未知'} \n  詳細原因：${e.properties.explanation}`)
                    .join('\n\n');
                alert("❌ Word 模版裡的變數括號有錯誤！請打開 Word 檢查：\n\n" + errorDetails);
            } else {
                // 捕捉其他系統錯誤
                alert("❌ 執行發生錯誤：\n" + error.message + "\n\n(請按 F12 切換到 Console 截圖紅字給我看！)");
            }
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
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-lg px-4 py-2 bg-gray-100 rounded-lg">✕ 關閉</button>
            </div>

            {/* 主畫面：正方形客戶方格牆 */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {clients.map(client => (
                        <div 
                            key={client.id} 
                            onClick={() => setSelectedClient(client)}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer aspect-square flex flex-col items-center justify-center p-4 border border-gray-100 group relative overflow-hidden"
                        >
                            {/* 狀態燈號：只要有統編就亮綠燈，否則紅燈 */}
                            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${client.taxId ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}></div>

                            <span className="font-mono text-gray-400 font-bold mb-3 text-lg">{client.code}</span>
                            <span className="font-bold text-gray-800 text-2xl group-hover:text-indigo-600 transition-colors text-center">{client.name}</span>
                        </div>
                    ))}
                    {clients.length === 0 && (
                        <div className="col-span-full text-center text-gray-400 py-20">目前沒有客戶資料</div>
                    )}
                </div>
            </div>

            {/* 彈出視窗：詳細資料卡 */}
            {selectedClient && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg text-lg font-mono">{selectedClient.code}</span>
                                    {selectedClient.name} - 詳細資訊
                                </h3>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-800 text-2xl">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 左側：基本資料 */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-indigo-600 border-b pb-2">📂 基本資料</h4>

                                    {/* 🆕 補上年度、工作編號與客戶編號 */}
                                    <div className="grid grid-cols-3 gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div><label className="text-xs text-indigo-800 font-bold">客戶編號</label><input type="text" value={selectedClient.code || ''} onChange={e => handleChange('code', e.target.value)} className="w-full border border-indigo-200 p-2 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono" /></div>
                                        <div><label className="text-xs text-indigo-800 font-bold">記帳年度</label><input type="text" placeholder="例: 114" value={selectedClient.year || ''} onChange={e => handleChange('year', e.target.value)} className="w-full border border-indigo-200 p-2 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono" /></div>
                                        <div><label className="text-xs text-indigo-800 font-bold">記帳工作</label><input type="text" placeholder="例: 114B044" value={selectedClient.workNo || ''} onChange={e => handleChange('workNo', e.target.value)} className="w-full border border-indigo-200 p-2 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono" /></div>
                                    </div>

                                    <div><label className="text-xs text-gray-500 font-bold">公司簡稱 (系統顯示用)</label><input type="text" value={selectedClient.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                    <div><label className="text-xs text-gray-500 font-bold">公司全名 (表單用)</label><input type="text" value={selectedClient.fullName || ''} onChange={e => handleChange('fullName', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">統一編號</label><input type="text" value={selectedClient.taxId || ''} onChange={e => handleChange('taxId', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">稅籍編號</label><input type="text" value={selectedClient.taxFileNo || ''} onChange={e => handleChange('taxFileNo', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">負責人</label><input type="text" value={selectedClient.owner || ''} onChange={e => handleChange('owner', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">聯絡人</label><input type="text" value={selectedClient.contact || ''} onChange={e => handleChange('contact', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">電話</label><input type="text" value={selectedClient.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">傳真</label><input type="text" value={selectedClient.fax || ''} onChange={e => handleChange('fax', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                    </div>
                                    <div><label className="text-xs text-gray-500 font-bold">E-mail</label><input type="text" value={selectedClient.email || ''} onChange={e => handleChange('email', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                    <div><label className="text-xs text-gray-500 font-bold">登記地址</label><input type="text" value={selectedClient.regAddress || ''} onChange={e => handleChange('regAddress', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                    <div><label className="text-xs text-gray-500 font-bold">聯絡地址</label><input type="text" value={selectedClient.contactAddress || ''} onChange={e => handleChange('contactAddress', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                </div>

                                {/* 右側：委任資訊 & 選項 */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-indigo-600 border-b pb-2">💼 委任與公費</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-500 font-bold">負責會計師</label><input type="text" value={selectedClient.cpa || ''} onChange={e => handleChange('cpa', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">委任期限</label><input type="text" placeholder="114/01-114/12" value={selectedClient.period || ''} onChange={e => handleChange('period', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <div><label className="text-xs text-gray-500 font-bold">每月公費</label><input type="text" value={selectedClient.feeMonthly || ''} onChange={e => handleChange('feeMonthly', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">各類扣繳 (f1)</label><input type="text" value={selectedClient.feeWithholding || ''} onChange={e => handleChange('feeWithholding', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">結算申報 (f2)</label><input type="text" value={selectedClient.feeTax || ''} onChange={e => handleChange('feeTax', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
                                        <div><label className="text-xs text-gray-500 font-bold">22-1申報 (f3)</label><input type="text" value={selectedClient.fee22_1 || ''} onChange={e => handleChange('fee22_1', e.target.value)} className="w-full border p-2 rounded-lg font-mono text-blue-600" /></div>
                                    </div>

                                    <h4 className="font-bold text-indigo-600 border-b pb-2 mt-6">☑ 項目勾選</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.chkAccount || false} onChange={e => handleChange('chkAccount', e.target.checked)} className="w-4 h-4" /> 會計帳務</label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.chkInvoice || false} onChange={e => handleChange('chkInvoice', e.target.checked)} className="w-4 h-4" /> 買發票</label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.chkVat || false} onChange={e => handleChange('chkVat', e.target.checked)} className="w-4 h-4" /> 營業稅</label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.chkWithholding || false} onChange={e => handleChange('chkWithholding', e.target.checked)} className="w-4 h-4" /> 扣繳申報</label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.chkHealth || false} onChange={e => handleChange('chkHealth', e.target.checked)} className="w-4 h-4" /> 補充保費</label>
                                    </div>

                                    <h4 className="font-bold text-indigo-600 border-b pb-2 mt-6">■ 申報方式</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.boxReview || false} onChange={e => handleChange('boxReview', e.target.checked)} className="w-4 h-4" /> 書審</label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.boxAudit || false} onChange={e => handleChange('boxAudit', e.target.checked)} className="w-4 h-4" /> 查帳</label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100"><input type="checkbox" checked={selectedClient.boxCpa || false} onChange={e => handleChange('boxCpa', e.target.checked)} className="w-4 h-4" /> 簽證</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 底部操作區 */}
                        <div className="p-4 bg-gray-50 border-t rounded-b-3xl flex justify-between items-center">
                            <button 
                                onClick={handleSave} 
                                disabled={isSaving}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200"
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
