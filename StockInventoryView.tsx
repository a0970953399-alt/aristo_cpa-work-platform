import React, { useState } from 'react';
import { Client } from './types';

interface StockInventoryViewProps {
  clients: Client[];
}

// 暫時定義股票的資料結構
interface Stock {
  id: string;
  code: string;
  name: string;
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({ clients }) => {
  // --- 狀態管理 (State) ---
  // 1. 紀錄哪些客戶有開啟進銷存功能 (存 ID) - 這裡先放一筆假資料 ID 供預覽
  const [enabledClientIds, setEnabledClientIds] = useState<string[]>(
    clients.length > 0 ? [clients[0].id] : []
  );

  // 2. 紀錄每個客戶擁有的股票 (以客戶 ID 為 Key) - 這裡先放假資料供預覽
  const [clientStocks, setClientStocks] = useState<Record<string, Stock[]>>({
    [clients[0]?.id || 'dummy']: [
      { id: 's1', code: '0050', name: '元大台灣50' },
      { id: 's2', code: '2330', name: '台灣積體電路' }
    ]
  });

  // 3. 導覽層級狀態 (Drill-down)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  // 4. 彈跳視窗狀態
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  
  // 表單暫存狀態
  const [newClientSelectId, setNewClientSelectId] = useState('');
  const [newStockCode, setNewStockCode] = useState('');
  const [newStockName, setNewStockName] = useState('');

  // --- 操作邏輯 (Handlers) ---
  const handleAddClient = () => {
    if (!newClientSelectId) return;
    setEnabledClientIds(prev => [...prev, newClientSelectId]);
    setIsAddClientModalOpen(false);
    setNewClientSelectId('');
  };

  const handleAddStock = () => {
    if (!newStockCode.trim() || !selectedClient) return;
    const newStock: Stock = {
      id: Date.now().toString(),
      code: newStockCode.trim(),
      name: newStockName.trim()
    };
    setClientStocks(prev => {
      const existing = prev[selectedClient.id] || [];
      return { ...prev, [selectedClient.id]: [...existing, newStock] };
    });
    setIsAddStockModalOpen(false);
    setNewStockCode('');
    setNewStockName('');
  };

  // 取得尚未開通進銷存的客戶名單
  const availableClientsToAdd = clients.filter(c => !enabledClientIds.includes(c.id));

  // --- 畫面渲染 (Render) ---

  // 🔺 第三層：交易明細表 (即將實作)
  if (selectedStock && selectedClient) {
    return (
      <div className="h-full flex flex-col p-6 animate-fade-in bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center mb-6 gap-4">
          <button 
            onClick={() => setSelectedStock(null)} 
            className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
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
              <p className="text-gray-400 mt-2">將包含買入、賣出輸入框，以及先進先出(FIFO)的核銷表格</p>
           </div>
        </div>
      </div>
    );
  }

  // 🔺 第二層：個股資訊牆 (Stock Wall)
  if (selectedClient) {
    const stocks = clientStocks[selectedClient.id] || [];
    return (
      <div className="h-full flex flex-col animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedClient(null)} 
              className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              ← 返回所有客戶
            </button>
            <h2 className="text-2xl font-black text-gray-800">{selectedClient.name} 的投資標的</h2>
          </div>
          <button 
            onClick={() => setIsAddStockModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors"
          >
            + 新增交易股票
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-6">
          {stocks.map(stock => (
            <div 
              key={stock.id} 
              onClick={() => setSelectedStock(stock)}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="text-blue-600 font-black text-3xl mb-1 group-hover:scale-105 origin-left transition-transform">
                {stock.code}
              </div>
              <div className="text-gray-600 font-bold text-lg">
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
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">股票代號</label>
                  <input type="text" value={newStockCode} onChange={e => setNewStockCode(e.target.value)} className="w-full border p-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 2330" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">股票名稱 (選填)</label>
                  <input type="text" value={newStockName} onChange={e => setNewStockName(e.target.value)} className="w-full border p-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 台積電" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsAddStockModalOpen(false)} className="flex-1 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
                <button onClick={handleAddStock} className="flex-1 py-2 bg-blue-600 font-bold rounded-xl text-white">確認新增</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 🔺 第一層：專屬客戶牆 (Client Wall)
  const displayClients = clients.filter(c => enabledClientIds.includes(c.id));
  
  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          📊 股票進銷存系統
        </h2>
        <button 
          onClick={() => setIsAddClientModalOpen(true)}
          className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors"
        >
          + 加入進銷存客戶
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-6">
        {displayClients.map(client => (
          <div 
            key={client.id} 
            onClick={() => setSelectedClient(client)}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              🏢
            </div>
            <h3 className="font-bold text-xl text-gray-800">{client.name}</h3>
            <p className="text-sm text-gray-500 mt-2">
              目前追蹤 {clientStocks[client.id]?.length || 0} 檔標的
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
              <select 
                value={newClientSelectId} 
                onChange={e => setNewClientSelectId(e.target.value)} 
                className="w-full border p-2.5 rounded-xl mb-6 focus:ring-2 focus:ring-green-500 outline-none text-base bg-white"
              >
                <option value="">請選擇客戶...</option>
                {availableClientsToAdd.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
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
    </div>
  );
};
