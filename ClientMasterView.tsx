// src/ClientMasterView.tsx

import React, { useState } from 'react';
import { Client } from './types';
import { TaskService } from './taskService';

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

    // 一鍵生成 Word (下一階段實作，先做按鈕)
    const handleGenerateWord = () => {
        alert('🖨️ 準備生成記帳工作單...\n(此功能將在下一步引入 docxtemplater 後啟用！)');
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
                            // 這裡加上 aspect-square 讓它變成正方形
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer aspect-square flex flex-col items-center justify-center p-4 border border-gray-100 group relative overflow-hidden"
                        >
                            {/* 狀態燈號 (如果缺統編就亮紅燈，這是一個小巧思) */}
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
                                    <div><label className="text-xs text-gray-500 font-bold">公司全名</label><input type="text" value={selectedClient.fullName || ''} onChange={e => handleChange('fullName', e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white" /></div>
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
