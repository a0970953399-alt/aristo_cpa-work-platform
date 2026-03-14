import React, { useState } from 'react';
import { Client, PayrollClientConfig, PayrollRecord } from './types';
import { ReturnIcon, PlusIcon, TrashIcon } from './Icons';

interface PayrollViewProps {
  clients: Client[];
}

export const PayrollView: React.FC<PayrollViewProps> = ({ clients }) => {
  // --- 狀態管理 ---
  // (未來這兩個 state 會改為從 TaskService 抓取真實資料，現在先用 useState 暫存來建構 UI)
  const [payrollClients, setPayrollClients] = useState<PayrollClientConfig[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);

  // 雙層架構的核心：選中的客戶
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // 彈跳視窗狀態
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [newClientSelectId, setNewClientSelectId] = useState('');
  const [clientsToDelete, setClientsToDelete] = useState<string[]>([]);

  // --- 衍生變數 ---
  const enabledClientIds = payrollClients.map(pc => pc.clientId);
  const availableClientsToAdd = clients.filter(c => !enabledClientIds.includes(String(c.id)));
  const displayClients = clients.filter(c => enabledClientIds.includes(String(c.id)));

  // --- 操作邏輯 (模擬寫入) ---
  const handleAddClient = () => {
    if (!newClientSelectId) return;
    const newConfig: PayrollClientConfig = {
      id: Date.now().toString(),
      clientId: newClientSelectId,
      createdAt: new Date().toISOString()
    };
    setPayrollClients([...payrollClients, newConfig]);
    setIsAddClientModalOpen(false);
    setNewClientSelectId('');
  };

  const handleConfirmDeleteClients = () => {
    const updated = payrollClients.filter(pc => !clientsToDelete.includes(pc.clientId));
    setPayrollClients(updated);
    setIsDeleteClientModalOpen(false);
    setClientsToDelete([]);
  };

  const toggleClientDelete = (id: string) => {
    setClientsToDelete(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // 🔺 第二層：單一客戶的專屬薪資明細表
  if (selectedClient) {
    return (
      <div className="h-full flex flex-col animate-fade-in bg-gray-50 overflow-hidden">
        {/* 頂部導航 */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedClient(null)} 
              title="返回客戶列表" 
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ReturnIcon className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-gray-800 leading-tight">💰 {selectedClient.name} - 薪資明細</h2>
              <p className="text-xs text-gray-400 font-bold tracking-tight mt-1">統一編號：{selectedClient.taxId || '未建立'}</p>
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all active:scale-95">
            <PlusIcon className="w-5 h-5" />
            新增薪資紀錄
          </button>
        </div>

        {/* 明細表內容區 */}
        <div className="flex-1 p-6 overflow-y-auto">
           {/* 未來我們要把試算表跟歷史紀錄放在這裡 */}
           <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center flex flex-col items-center justify-center">
              <div className="text-5xl mb-4 opacity-50">👩‍💻</div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">專屬薪資計算引擎準備就緒</h3>
              <p className="text-gray-400">接下來我們將在這裡打造「自動試算表單」與「一鍵匯出薪資單」的功能！</p>
           </div>
        </div>
      </div>
    );
  }

  // 🔺 第一層：薪資客戶牆 (Client Wall)
  return (
    <div className="h-full flex flex-col animate-fade-in bg-gray-50 overflow-hidden">
      <div className="p-6 pb-2 border-b border-transparent flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">💰 客戶薪資計算</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsAddClientModalOpen(true)} title="開通客戶" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center">
            <PlusIcon className="w-5 h-5" />
          </button>
          <button onClick={() => { setClientsToDelete([]); setIsDeleteClientModalOpen(true); }} title="移除客戶" className="p-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {displayClients.map(client => (
            <div 
              key={client.id} 
              onClick={() => setSelectedClient(client)} 
              className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center text-center group aspect-square relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 group-hover:bg-blue-500 transition-colors"></div>
              <p className="text-gray-400 font-mono text-sm sm:text-base font-bold tracking-widest mb-1 group-hover:text-blue-500 transition-colors">
                {client.code}
              </p>
              <h3 className="font-black text-3xl sm:text-4xl text-gray-800 tracking-tight group-hover:text-blue-700 transition-colors">
                {client.name}
              </h3>
            </div>
          ))}
        </div>
        {displayClients.length === 0 && (
          <div className="py-20 text-center text-gray-400 font-bold text-lg bg-white rounded-2xl border border-dashed border-gray-300 w-full">目前沒有任何客戶開啟薪資計算功能</div>
        )}
      </div>

      {/* 新增客戶 Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">選擇客戶開通薪資計算</h3>
            {availableClientsToAdd.length > 0 ? (
              <select value={newClientSelectId} onChange={e => setNewClientSelectId(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 outline-none text-base bg-white font-bold text-gray-700">
                <option value="">請選擇客戶...</option>
                {availableClientsToAdd.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            ) : (
              <p className="text-gray-500 mb-6 text-sm">所有客戶都已經開通了！</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setIsAddClientModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleAddClient} disabled={!newClientSelectId} className="flex-1 py-3 bg-blue-600 font-bold rounded-xl text-white disabled:opacity-50">確認加入</button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除客戶 Modal */}
      {isDeleteClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">🗑️ 關閉薪資計算功能</h3>
            <p className="text-sm text-gray-500 mb-4">請勾選要關閉的客戶：</p>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl mb-6 bg-gray-50 p-2 space-y-2 custom-scrollbar">
              {displayClients.map(client => (
                <label key={client.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-red-50 transition-colors">
                  <input type="checkbox" checked={clientsToDelete.includes(String(client.id))} onChange={() => toggleClientDelete(String(client.id))} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" />
                  <span className="ml-3 font-bold text-gray-700">{client.name}</span>
                </label>
              ))}
              {displayClients.length === 0 && <div className="text-center p-4 text-gray-400 text-sm font-bold">目前無已開通的客戶</div>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsDeleteClientModalOpen(false); setClientsToDelete([]); }} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleConfirmDeleteClients} disabled={clientsToDelete.length === 0} className="flex-1 py-3 bg-red-600 font-bold rounded-xl text-white disabled:opacity-50">確認移除 ({clientsToDelete.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
