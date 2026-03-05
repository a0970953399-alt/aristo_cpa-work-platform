import React, { useState, useEffect } from 'react';
import { Client, StockClientConfig, StockTarget } from './types';
import { TaskService } from './taskService'; // ✨ 引入我們剛才寫好的 API 服務

interface StockInventoryViewProps {
  clients: Client[];
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({ clients }) => {
  // --- 狀態管理 (State) ---
  
  // ✨ 改用從資料庫抓回來的真實資料
  const [stockClients, setStockClients] = useState<StockClientConfig[]>([]);
  const [stockTargets, setStockTargets] = useState<StockTarget[]>([]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockTarget | null>(null);

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

  // ==========================================
  // ✨ 生命週期與資料載入 (對接 Firebase / JSON)
  // ==========================================
  
  // 當一進入這個頁面時，立刻去資料庫抓資料
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const fetchedClients = await TaskService.fetchStockClients();
    const fetchedTargets = await TaskService.fetchStockTargets();
    setStockClients(fetchedClients);
    setStockTargets(fetchedTargets);
  };

  // ==========================================
  // ✨ 操作邏輯 (改寫為呼叫 TaskService)
  // ==========================================

  const handleAddClient = async () => {
    if (!newClientSelectId) return;
    const newConfig: StockClientConfig = {
        id: Date.now().toString(), // 產生唯一碼
        clientId: newClientSelectId,
        createdAt: new Date().toISOString()
    };
    // 呼叫 API 寫入資料庫，並用回傳的新資料更新畫面
    const updated = await TaskService.addStockClient(newConfig);
    setStockClients(updated);
    setIsAddClientModalOpen(false);
    setNewClientSelectId('');
  };

  const handleConfirmDeleteClients = async () => {
    // 找出對應的資料庫 ID 並刪除
    for (const clientId of clientsToDelete) {
        const targetConfig = stockClients.find(sc => sc.clientId === clientId);
        if (targetConfig) {
            await TaskService.deleteStockClient(targetConfig.id);
        }
    }
    await loadData(); // 刪除完後重新抓取最新資料
    setIsDeleteClientModalOpen(false);
    setClientsToDelete([]);
  };

  const handleAddStock = async () => {
    if (!newStockCode.trim() || !selectedClient) return;
    const newTarget: StockTarget = { 
        id: Date.now().toString(), 
        clientId: String(selectedClient.id),
        code: newStockCode.trim(), 
        name: newStockName.trim(),
        createdAt: new Date().toISOString()
    };
    const updated = await TaskService.addStockTarget(newTarget);
    setStockTargets(updated);
    setIsAddStockModalOpen(false);
    setNewStockCode('');
    setNewStockName('');
  };

  const handleConfirmDeleteStocks = async () => {
    for (const stockId of stocksToDelete) {
        await TaskService.deleteStockTarget(stockId);
    }
    await loadData();
    setIsDeleteStockModalOpen(false);
    setStocksToDelete([]);
  };

  const toggleClientDelete = (id: string) => {
    setClientsToDelete(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleStockDelete = (id: string) => {
    setStocksToDelete(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- 畫面渲染用的衍生變數 ---
  const enabledClientIds = stockClients.map(sc => sc.clientId);
  const availableClientsToAdd = clients.filter(c => !enabledClientIds.includes(String(c.id)));
  const displayClients = clients.filter(c => enabledClientIds.includes(String(c.id)));

  // 🔺 第三層：交易明細表 (動態上下文對帳表版)
  if (selectedStock && selectedClient) {
    // 這裡未來會從 TaskService 抓取該標的的交易紀錄
    const transactions: StockTransaction[] = []; 

    return (
      <div className="h-full flex flex-col p-4 animate-fade-in bg-gray-50 overflow-hidden">
        {/* 1. 頂部標頭與 KPI 概況 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedStock(null)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm">
              ← 返回
            </button>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-black text-gray-800">{selectedStock.code}</h2>
              <span className="text-lg font-bold text-gray-500">{selectedStock.name}</span>
            </div>
          </div>
          
          <div className="flex gap-4">
             <div className="flex flex-col items-end border-r pr-4 border-gray-200">
                <span className="text-[10px] font-bold text-gray-400">庫存股數</span>
                <span className="text-xl font-black text-blue-600">0</span>
             </div>
             <div className="flex flex-col items-end border-r pr-4 border-gray-200">
                <span className="text-[10px] font-bold text-gray-400">帳列平均成本</span>
                <span className="text-xl font-black text-gray-700">0.00</span>
             </div>
             <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all text-sm">
               + 新增紀錄
             </button>
          </div>
        </div>

        {/* 2. 核心對帳表 (三區塊邏輯) */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {/* 分組標頭 */}
          <div className="grid grid-cols-[1.5fr_3fr_1.5fr] w-full bg-gray-100 border-b border-gray-200">
            <div className="p-2 text-center text-xs font-black text-gray-500 border-r border-gray-200">基本資訊</div>
            <div className="p-2 text-center text-xs font-black text-blue-600 border-r border-gray-200 bg-blue-50/50">交易明細 (買入/賣出動態切換)</div>
            <div className="p-2 text-center text-xs font-black text-orange-600 bg-orange-50/50">當前餘額</div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="border-b border-gray-100">
                  {/* 基本資訊區 */}
                  <th className="w-[12%] p-2 text-[11px] font-bold text-gray-400">日期 / 傳票號</th>
                  <th className="w-[6%] p-2 text-[11px] font-bold text-gray-400 text-center">類別</th>
                  
                  {/* 動態明細區 (根據買賣決定標題意義) */}
                  <th className="w-[10%] p-2 text-[11px] font-bold text-gray-600 text-right">單位數</th>
                  <th className="w-[10%] p-2 text-[11px] font-bold text-gray-600 text-right">成交價 / 帳列成本</th>
                  <th className="w-[10%] p-2 text-[11px] font-bold text-gray-600 text-right">手續費 / 稅額</th>
                  <th className="w-[12%] p-2 text-[11px] font-bold text-gray-600 text-right">實際金額 / 損益</th>
                  
                  {/* 餘額區 */}
                  <th className="w-[10%] p-2 text-[11px] font-bold text-orange-600 text-right bg-orange-50/20">庫存股數</th>
                  <th className="w-[15%] p-2 text-[11px] font-bold text-orange-600 text-right bg-orange-50/20">帳列總成本</th>
                  <th className="w-[15%] p-2 text-[11px] font-bold text-gray-400">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* 範例資料列 (買入範例) */}
                <tr className="hover:bg-blue-50/30 transition-colors group">
                   <td className="p-2">
                      <div className="text-xs font-bold text-gray-700">114/09/04</div>
                      <div className="text-[10px] font-mono text-gray-400">11409040001</div>
                   </td>
                   <td className="p-2 text-center">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">買入</span>
                   </td>
                   <td className="p-2 text-right text-xs font-bold">2,000</td>
                   <td className="p-2 text-right text-xs text-gray-600">741.00</td>
                   <td className="p-2 text-right text-[10px] text-gray-400">2,111</td>
                   <td className="p-2 text-right text-xs font-bold text-blue-600">1,484,111</td>
                   <td className="p-2 text-right text-xs font-bold text-gray-700 bg-orange-50/10 tracking-tighter italic">2,000</td>
                   <td className="p-2 text-right text-xs font-bold text-gray-700 bg-orange-50/10">1,484,111</td>
                   <td className="p-2 text-[10px] text-gray-400 truncate">初始買入</td>
                </tr>

                {/* 範例資料列 (賣出範例) */}
                <tr className="hover:bg-red-50/30 transition-colors group">
                   <td className="p-2">
                      <div className="text-xs font-bold text-gray-700">114/09/10</div>
                      <div className="text-[10px] font-mono text-gray-400">11409100021</div>
                   </td>
                   <td className="p-2 text-center">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">賣出</span>
                   </td>
                   <td className="p-2 text-right text-xs font-bold">1,000</td>
                   <td className="p-2 text-right text-[10px] text-red-500">
                      <div className="font-bold">738.00</div>
                      <div className="scale-90 opacity-60">(742.06)</div>
                   </td>
                   <td className="p-2 text-right text-[10px] text-gray-400">
                      <div>1,051 (費)</div>
                      <div>2,217 (稅)</div>
                   </td>
                   <td className="p-2 text-right text-xs font-bold text-red-600">
                      <div>734,732</div>
                      <div className="text-[10px] text-red-400">(-20,345)</div>
                   </td>
                   <td className="p-2 text-right text-xs font-bold text-gray-700 bg-orange-50/10 tracking-tighter italic">1,000</td>
                   <td className="p-2 text-right text-xs font-bold text-gray-700 bg-orange-50/10">742,056</td>
                   <td className="p-2 text-[10px] text-gray-400 truncate">FIFO 結轉</td>
                </tr>

                {transactions.length === 0 && (
                   <tr>
                     <td colSpan={9} className="py-20 text-center text-gray-300 font-bold text-sm">點擊右上方按鈕開始登錄交易紀錄</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 🔺 第二層：個股資訊牆
  if (selectedClient) {
    // 過濾出屬於目前點擊客戶的股票
    const currentClientStocks = stockTargets.filter(st => st.clientId === String(selectedClient.id));
    
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
          {currentClientStocks.map(stock => (
            <div key={stock.id} onClick={() => setSelectedStock(stock)} className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center group aspect-square relative overflow-hidden">
              <div className="text-blue-600 font-black text-3xl sm:text-4xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">{stock.code}</div>
              <div className="text-gray-600 font-bold text-base sm:text-lg">{stock.name || '未命名標的'}</div>
            </div>
          ))}
          {currentClientStocks.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold text-lg bg-white rounded-2xl border border-dashed border-gray-300">該客戶目前尚無任何股票資料</div>
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
                {currentClientStocks.map(stock => (
                  <label key={stock.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-red-50 transition-colors">
                    <input type="checkbox" checked={stocksToDelete.includes(stock.id)} onChange={() => toggleStockDelete(stock.id)} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" />
                    <span className="ml-3 font-bold text-gray-700">{stock.code} {stock.name}</span>
                  </label>
                ))}
                {currentClientStocks.length === 0 && <div className="text-center p-4 text-gray-400 text-sm">沒有可刪除的股票</div>}
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
        {displayClients.map(client => {
          // 計算該客戶目前有幾檔股票
          const stockCount = stockTargets.filter(st => st.clientId === String(client.id)).length;
          return (
            <div key={client.id} onClick={() => setSelectedClient(client)} className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center text-center group aspect-square relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 group-hover:bg-blue-500 transition-colors"></div>
              <p className="text-gray-400 font-mono text-sm sm:text-base font-bold tracking-widest mb-1 group-hover:text-blue-500 transition-colors">
                {client.code}
              </p>
              <h3 className="font-black text-3xl sm:text-4xl text-gray-800 tracking-tight group-hover:text-blue-700 transition-colors">
                {client.name}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-gray-500 mt-4 bg-gray-50 px-4 py-1.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                共有 {stockCount} 檔標的
              </p>
            </div>
          );
        })}
        {displayClients.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold text-lg bg-white rounded-2xl border border-dashed border-gray-300">目前沒有任何客戶開啟股票進銷存功能</div>
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
                <label key={client.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-red-50 transition-colors">
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
