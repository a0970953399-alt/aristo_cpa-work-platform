import React, { useState } from 'react';
import { Client } from './types';

interface StockInventoryViewProps {
  clients: Client[];
}

interface Stock {
  id: string;
  code: string;
  name: string;
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({ clients }) => {
  // --- 狀態管理 (State) ---
  
  // ✨ 修改 1：預設為空陣列，沒有任何客戶自動開通進銷存
  const [enabledClientIds, setEnabledClientIds] = useState<string[]>([]);

  // ✨ 修改 2：預設為空物件，沒有任何預設的股票資料
  const [clientStocks, setClientStocks] = useState<Record<string, Stock[]>>({});

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  // --- 彈跳視窗狀態 ---
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isDeleteStockModalOpen, setIsDeleteStockModalOpen] = useState(false);

  // --- 表單與勾選暫存狀態 ---
  const [newClientSelectId, setNewClientSelectId] = useState('');
  const [newStockCode, setNewStockCode] = useState('');
  const [newStockName, setNewStockName] = useState('');
  
  const [clientsToDelete, setClientsToDelete] = useState<string[]>([]);
  const [stocksToDelete, setStocksToDelete] = useState<string[]>([]);

  // --- 操作邏輯 (Handlers) ---

  const handleAddClient = () => {
    if (!newClientSelectId) return;
    setEnabledClientIds(prev => [...prev, newClientSelectId]);
    setIsAddClientModalOpen(false);
    setNewClientSelectId('');
  };

  const toggleClientDelete = (id: string) => {
    setClientsToDelete(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const handleConfirmDeleteClients = () => {
    setEnabledClientIds(prev => prev.filter(id => !clientsToDelete.includes(id)));
    setIsDeleteClientModalOpen(false);
    setClientsToDelete([]);
  };

  const handleAddStock = () => {
    if (!newStockCode.trim() || !selectedClient) return;
    const newStock: Stock = { id: Date.now().toString(), code: newStockCode.trim(), name: newStockName.trim() };
    const clientIdStr = String(selectedClient.id);
    setClientStocks(prev => {
      const existing = prev[clientIdStr] || [];
      return { ...prev, [clientIdStr]: [...existing, newStock] };
    });
    setIsAddStockModalOpen(false);
    setNewStockCode('');
    setNewStockName('');
  };

  const toggleStockDelete = (id: string) => {
    setStocksToDelete(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirmDeleteStocks = () => {
    if (!selectedClient) return;
    const clientIdStr = String(selectedClient.id);
    setClientStocks(prev => ({
      ...prev,
      [clientIdStr]: (prev[clientIdStr] || []).filter(s => !stocksToDelete.includes(s.id))
    }));
    setIsDeleteStockModalOpen(false);
    setStocksToDelete([]);
  };

  const availableClientsToAdd = clients.filter(c => !enabledClientIds.includes(String(c.id)));
  const displayClients = clients.filter(c => enabledClientIds.includes(String(c.id)));

  // --- 畫面渲染 (Render) ---

  // 🔺 第三層：交易明細表
  if (selectedStock && selectedClient) {
    return (
      <div className="h-full flex flex-col p-6 animate-fade-in bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center mb-6 gap-4">
          <button onClick={() => setSelectedStock(null)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
            ← 返回 {selectedClient.name} 的股票牆
          </button>
          <h2 className="text-2xl font-black text-gray-800">
            {selectedStock.code} {selectedStock.name} - 交易明細與進銷存
          </h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
           <div className="text-center">
              <span className="text-4xl block mb-4">🚧</span>
              <h3 className="text-xl font-bold text-gray-500">這裡是未來最核心的【交易明細表】</h3>
           </div>
        </div>
      </div>
    );
  }

  // 🔺 第二層：個股資訊牆
  if (selectedClient) {
    const clientIdStr = String(selectedClient.id);
    const stocks = clientStocks[clientIdStr] || [];
    
    return (
      <div className="h-full flex flex-col animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedClient(null)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
              ← 返回所有客戶
            </button>
            <h2 className="text-2xl font-black text-gray-800">{selectedClient.name} 的投資標的</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsAddStockModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors">
              + 新增交易股票
            </button>
            <button onClick={() => { setStocksToDelete([]); setIsDeleteStockModalOpen(true); }} className="px-4 py-2 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors">
              刪除標的
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 overflow-y-auto pb-6">
          {stocks.map(stock => (
            <div 
              key={stock.id} 
              onClick={() => setSelectedStock(stock)} 
              className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center group aspect-square"
            >
              <div className="text-blue-600 font-black text-3xl sm:text-4xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                {stock.code}
              </div>
              <div className="text-gray-600 font-bold text-base sm:text-lg">
                {stock.name || '未命名標的'}
              </div>
            </div>
          ))}
          {stocks.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold text-lg bg-white rounded-2xl border border-dashed border-gray-300">
              該客戶目前尚無任何股票資料
            </div>
          )}
        </div>

        {/* 新增股票 Modal */}
        {isAddStockModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-xl font-bold mb-4">新增交易股票</h3>
              <div className="space-y-4 mb-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">股票代號</label><input type="text" value={newStockCode} onChange={e => setNewStockCode(e.target.value)} className="w-full border p-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 2330" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">股票名稱 (選填)</label><input type="text" value={newStockName} onChange={e => setNewStockName(e.target.value)} className="w-full border p-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 台積電" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsAddStockModalOpen(false)} className="flex-1 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
                <button onClick={handleAddStock} className="flex-1 py-2 bg-blue-600 font-bold rounded-xl text-white">確認新增</button>
              </div>
            </div>
          </div>
        )}

        {/* 刪除股票 Modal */}
        {isDeleteStockModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">🗑️ 刪除交易股票</h3>
              <p className="text-sm text-gray-500 mb-4">請勾選要從 {selectedClient.name} 移除的股票：</p>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl mb-6 bg-gray-50 p-2 space-y-2 custom-scrollbar">
                {stocks.map(stock => (
                  <label key={stock.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-red-50 transition-colors">
                    <input type="checkbox" checked={stocksToDelete.includes(stock.id)} onChange={() => toggleStockDelete(stock.id)} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" />
                    <span className="ml-3 font-bold text-gray-700">{stock.code} {stock.name}</span>
                  </label>
                ))}
                {stocks.length === 0 && <div className="text-center p-4 text-gray-400 text-sm">沒有可刪除的股票</div>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsDeleteStockModalOpen(false); setStocksToDelete([]); }} className="flex-1 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
                <button onClick={handleConfirmDeleteStocks} disabled={stocksToDelete.length === 0} className="flex-1 py-2 bg-red-600 font-bold rounded-xl text-white disabled:opacity-50">確認刪除 ({stocksToDelete.length})</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 🔺 第一層：專屬客戶牆 (Client Wall)
  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">📊 股票進銷存系統</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsAddClientModalOpen(true)} className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors">
            + 加入進銷存客戶
          </button>
          <button onClick={() => { setClientsToDelete([]); setIsDeleteClientModalOpen(true); }} className="px-5 py-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors">
            移除客戶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 overflow-y-auto pb-6">
        {displayClients.map(client => (
          <div 
            key={client.taxid}
            onClick={() => setSelectedClient(client)} 
            className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center text-center group aspect-square relative overflow-hidden"
          >
            {/* 頂部裝飾色條 (增加專業系統的質感) */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 group-hover:bg-blue-500 transition-colors"></div>

            {/* 客戶編號 */}
            <p className="text-gray-400 font-mono text-sm sm:text-base font-bold tracking-widest mb-1 group-hover:text-blue-500 transition-colors">
              {client.taxId}
            </p>

            {/* 客戶名稱 (放大、加粗、置中) */}
            <h3 className="font-black text-3xl sm:text-4xl text-gray-800 tracking-tight group-hover:text-blue-700 transition-colors">
              {client.name}
            </h3>

            {/* 標的數量 */}
            <p className="text-xs sm:text-sm font-bold text-gray-500 mt-4 bg-gray-50 px-4 py-1.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              共有 {clientStocks[String(client.id)]?.length || 0} 檔標的
            </p>
          </div>
        ))}
        {displayClients.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold text-lg bg-white rounded-2xl border border-dashed border-gray-300">
            目前沒有任何客戶開啟股票進銷存功能
          </div>
        )}
      </div>

      {/* 新增客戶 Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4">選擇客戶開通進銷存</h3>
            {availableClientsToAdd.length > 0 ? (
              <select value={newClientSelectId} onChange={e => setNewClientSelectId(e.target.value)} className="w-full border p-2.5 rounded-xl mb-6 focus:ring-2 focus:ring-green-500 outline-none text-base bg-white">
                <option value="">請選擇客戶...</option>
                {availableClientsToAdd.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            ) : (
              <p className="text-gray-500 mb-6 text-sm">所有客戶都已經開通進銷存功能了！</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setIsAddClientModalOpen(false)} className="flex-1 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleAddClient} disabled={!newClientSelectId} className="flex-1 py-2 bg-green-600 font-bold rounded-xl text-white disabled:opacity-50">確認加入</button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除客戶 Modal */}
      {isDeleteClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">🗑️ 移除進銷存客戶</h3>
            <p className="text-sm text-gray-500 mb-4">請勾選要關閉進銷存功能的客戶：</p>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl mb-6 bg-gray-50 p-2 space-y-2 custom-scrollbar">
              {displayClients.map(client => (
                <label key={client.taxId} className="flex items-center p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-red-50 transition-colors">
                  <input type="checkbox" checked={clientsToDelete.includes(String(client.id))} onChange={() => toggleClientDelete(String(client.id))} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" />
                  <span className="ml-3 font-bold text-gray-700">{client.name}</span>
                </label>
              ))}
              {displayClients.length === 0 && <div className="text-center p-4 text-gray-400 text-sm">目前無已開通的客戶</div>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsDeleteClientModalOpen(false); setClientsToDelete([]); }} className="flex-1 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleConfirmDeleteClients} disabled={clientsToDelete.length === 0} className="flex-1 py-2 bg-red-600 font-bold rounded-xl text-white disabled:opacity-50">確認移除 ({clientsToDelete.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
