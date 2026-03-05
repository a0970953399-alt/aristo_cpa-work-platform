import { ReturnIcon } from './Icons';
import React, { useState, useEffect } from 'react';
import { Client, StockClientConfig, StockTarget } from './types';
import { TaskService } from './taskService'; // ✨ 引入我們剛才寫好的 API 服務
// ✨ 新增這行：引入 Recharts 圖表庫
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface StockInventoryViewProps {
  clients: Client[];
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({ clients }) => {
  // --- 狀態管理 (State) ---
  
  // ✨ 改用從資料庫抓回來的真實資料
  const [stockClients, setStockClients] = useState<StockClientConfig[]>([]);
  const [stockTargets, setStockTargets] = useState<StockTarget[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

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

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'ledger'>('overview');

  // --- 新增交易表單的 State (放在元件最上方) ---
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
  const [txDate, setTxDate] = useState('');
  const [txVoucherNo, setTxVoucherNo] = useState('');
  const [txUnits, setTxUnits] = useState<number | ''>('');
  const [txUnitPrice, setTxUnitPrice] = useState<number | ''>('');
  const [txFee, setTxFee] = useState<number | ''>('');
  const [txTax, setTxTax] = useState<number | ''>('');
  const [txPaymentDate, setTxPaymentDate] = useState('');

  // --- 系統自動計算區 (Derived State) ---
  const safeUnits = Number(txUnits) || 0;
  const safeUnitPrice = Number(txUnitPrice) || 0;
  const safeFee = Number(txFee) || 0;
  const safeTax = Number(txTax) || 0;

  // 1. 買入自動計算
  const buyAmount = safeUnits * safeUnitPrice;
  const buyActualCost = buyAmount + safeFee;
  const buyAvgCost = safeUnits > 0 ? (buyActualCost / safeUnits) : 0;

  // 2. 賣出自動計算
  const sellPrice = safeUnits * safeUnitPrice;
  const sellNetAmount = sellPrice - safeFee - safeTax;
  const sellAvgPrice = safeUnits > 0 ? (sellNetAmount / safeUnits) : 0;

  // 🚨 FIFO 帳列成本預估 (這裡先放一個模擬值，下一步我們會寫真實的 FIFO 演算法)
  // 目前先假設歷史平均成本為 740 作為視覺預覽
  const mockHistoricalCostPerUnit = 740; 
  const matchedCost = safeUnits * mockHistoricalCostPerUnit; 
  const realizedPnl = sellNetAmount - matchedCost;


  // --- 重置表單 ---
  const resetTxForm = () => {
    setEditingTxId(null);
    setTxType('buy'); setTxDate(''); setTxVoucherNo(''); setTxUnits('');
    setTxUnitPrice(''); setTxFee(''); setTxTax(''); setTxPaymentDate('');
  };

// ✨ 點擊明細表列時，把資料倒灌回表單
  const handleRowClick = (tx: StockTransaction) => {
    setEditingTxId(tx.id);
    setTxType(tx.type);
    setTxDate(tx.date);
    setTxVoucherNo(tx.voucherNo);
    setTxUnits(tx.units);
    setTxUnitPrice(tx.unitPrice);
    setTxFee(tx.fee);
    setTxTax(tx.sellTax || '');
    setTxPaymentDate(tx.paymentDate);
    setIsAddTxModalOpen(true);
  };

  // ✨ 真正的存檔執行邏輯 (支援新增與更新)
  const handleSaveTransaction = async () => {
    if (!selectedStock || !selectedClient) return;
    if (!txDate || !txVoucherNo || safeUnits <= 0 || safeUnitPrice <= 0) {
        alert("請確實填寫日期、傳票號、股數與單價！");
        return;
    }

    const newTx: StockTransaction = {
        id: editingTxId || Date.now().toString(), // 有編輯ID就用舊的，沒有就產生新的
        stockTargetId: selectedStock.id,
        clientId: String(selectedClient.id),
        type: txType,
        date: txDate,
        voucherNo: txVoucherNo,
        units: safeUnits,
        unitPrice: safeUnitPrice,
        fee: safeFee,
        paymentDate: txPaymentDate,
        createdAt: editingTxId 
            ? (transactions.find(t => t.id === editingTxId)?.createdAt || new Date().toISOString()) 
            : new Date().toISOString(),
    };

    if (txType === 'buy') {
        newTx.buyAmount = buyAmount;
        newTx.buyActualCost = buyActualCost;
    } else {
        newTx.sellAmount = sellPrice;
        newTx.sellTax = safeTax;
        newTx.sellNetAmount = sellNetAmount;
        newTx.matchedCost = matchedCost; 
        newTx.realizedPnl = realizedPnl; 
    }

    // ✨ 判斷是「更新」還是「新增」
    if (editingTxId) {
        await TaskService.updateStockTransaction(newTx);
    } else {
        await TaskService.addStockTransaction(newTx);
    }
    
    await loadData();
    setIsAddTxModalOpen(false);
    resetTxForm();
  };

  // ✨ 刪除單筆交易
  const handleDeleteTransaction = async () => {
    if (!editingTxId) return;
    if (!confirm("確定要刪除這筆交易紀錄嗎？此動作無法復原，並會影響後續餘額計算！")) return;
    
    await TaskService.deleteStockTransaction(editingTxId);
    await loadData();
    setIsAddTxModalOpen(false);
    resetTxForm();
  };

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
    const fetchedTxs = await TaskService.fetchStockTransactions();
    setStockClients(fetchedClients);
    setStockTargets(fetchedTargets);
    setTransactions(fetchedTxs);
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

  // 🔺 第三層：交易明細與分析 (標籤頁重構版)
  if (selectedStock && selectedClient) {
    // ✨ 新增：計算該檔股票的交易紀錄與餘額 (重現 Excel 的向下結轉邏輯)
    const stockTxs = transactions
      .filter(tx => tx.stockTargetId === selectedStock.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // 先照日期舊到新排列算餘額

    let runningUnits = 0;
    let runningTotalCost = 0;

    const enrichedTxs = stockTxs.map(tx => {
      if (tx.type === 'buy') {
        runningUnits += tx.units;
        runningTotalCost += (tx.buyActualCost || 0);
      } else {
        runningUnits -= tx.units;
        runningTotalCost -= (tx.matchedCost || 0); // 賣出時沖銷帳列成本
      }
      const avgCost = runningUnits > 0 ? runningTotalCost / runningUnits : 0;
      
      return {
        ...tx,
        balanceUnits: runningUnits,
        balanceAvgCost: avgCost,
        balanceTotalCost: runningTotalCost
      };
    });

    // ✨ 畫面顯示要倒序 (最新的交易在最上方)
    const displayTxs = [...enrichedTxs].reverse();
    
    // ✨ 取出最新庫存狀態 (餵給 KPI 卡片)
    const currentStockUnits = runningUnits;
    const currentStockTotalCost = runningTotalCost;
    const currentStockAvgCost = runningUnits > 0 ? runningTotalCost / runningUnits : 0;
    
    // ✨ 新增：計算累計已實現損益
    const totalRealizedPnl = enrichedTxs.reduce((sum, tx) => sum + (tx.realizedPnl || 0), 0);

    // 📊 圖表 1：折線圖資料 (成本與均價走勢)
    const trendData = enrichedTxs.map(tx => ({
        date: tx.date.substring(5).replace('-', '/'), // 轉成 MM/DD
        fullDate: tx.date,
        帳列總成本: tx.balanceTotalCost,
        單位均價: Number(tx.balanceAvgCost.toFixed(2))
    }));

    // 📊 圖表 2：圓餅圖資料 (累計資金流向)
    // 注意這裡的變數 t 要對應正確
    const totalBuyCash = enrichedTxs.filter(t => t.type === 'buy').reduce((sum, t) => sum + (t.buyActualCost || 0), 0);
    const totalSellCash = enrichedTxs.filter(t => t.type === 'sell').reduce((sum, t) => sum + (t.sellNetAmount || 0), 0);
    
    const cashFlowData = [
        { name: '累計買入支付', value: totalBuyCash, color: '#3b82f6' }, // 藍色
        { name: '累計賣出收回', value: totalSellCash, color: '#10b981' }  // 綠色
    ];

    return (
      <div className="h-full flex flex-col animate-fade-in bg-gray-50 overflow-hidden">
    
    return (
      <div className="h-full flex flex-col animate-fade-in bg-gray-50 overflow-hidden">
        
        {/* 1. 頂部導航與標題列 */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedStock(null); setActiveSubTab('overview'); }} 
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ReturnIcon className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-black rounded-md tracking-wider">STOCK</span>
                <h2 className="text-xl font-black text-gray-800">{selectedStock.code} {selectedStock.name}</h2>
              </div>
              <p className="text-xs text-gray-400 font-bold tracking-tight">歸屬客戶：{selectedClient.name}</p>
            </div>
          </div>

          {/* 標籤切換按鈕 (Tab Switcher) */}
          <div className="flex p-1 bg-gray-100 rounded-xl w-64 shadow-inner">
            <button 
              onClick={() => setActiveSubTab('overview')}
              className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${activeSubTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              📊 統計圖表
            </button>
            <button 
              onClick={() => setActiveSubTab('ledger')}
              className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${activeSubTab === 'ledger' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              📋 交易明細
            </button>
          </div>
        </div>

        {/* 2. 內容顯示區 */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* --- 分頁一：圖表總覽 (Charts Tab) --- */}
          {activeSubTab === 'overview' && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* 1. KPI 數值摘要 (改為 4 格) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">當前庫存股數</p>
                  <p className="text-3xl font-black text-gray-800">{currentStockUnits.toLocaleString()} <span className="text-sm font-medium text-gray-400">股</span></p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">帳列總成本</p>
                  <p className="text-3xl font-black text-gray-800">${currentStockTotalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">當前平均成本</p>
                  <p className="text-3xl font-black text-gray-500">{currentStockAvgCost.toFixed(4)}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">累計已處分損益</p>
                  <p className={`text-3xl font-black ${totalRealizedPnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {totalRealizedPnl >= 0 ? '+' : ''}{totalRealizedPnl.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 2. 圖示化區塊 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 折線圖 (佔 2/3 寬度) */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-96 flex flex-col lg:col-span-2">
                  <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div> 帳列成本與均價走勢
                  </h4>
                  <div className="flex-1 w-full">
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} minTickGap={20} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-10} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={10} domain={['auto', 'auto']} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                            formatter={(value: number, name: string) => [name === '單位均價' ? `$${value.toFixed(2)}` : `$${value.toLocaleString()}`, name]}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          {/* 💡 會計專用：使用 stepAfter 呈現階梯狀走勢，因為成本只會在交易當天變動 */}
                          <Line yAxisId="left" type="stepAfter" dataKey="帳列總成本" name="帳列總成本" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line yAxisId="right" type="stepAfter" dataKey="單位均價" name="單位均價" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">尚無交易資料可繪製圖表</div>
                    )}
                  </div>
                </div>

                {/* 圓餅圖 (佔 1/3 寬度) */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-96 flex flex-col">
                   <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div> 累計資金流向比例
                  </h4>
                  <div className="flex-1 w-full relative">
                    {cashFlowData.reduce((acc, cur) => acc + cur.value, 0) > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={cashFlowData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value"
                          >
                            {cashFlowData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">尚無資金進出紀錄</div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
          
          {/* --- 分頁二：交易明細表 (Ledger Tab) --- */}
          {activeSubTab === 'ledger' && (
            <div className="max-w-[1600px] mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
              {/* A. 功能操作列 */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-400">排序：日期降序</span>
                  <div className="h-4 w-[1px] bg-gray-200"></div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">● 買入</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">● 賣出</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddTxModalOpen(true)}
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all text-sm">
                   + 登錄新交易
                </button>
              </div>
              
              {/* B. 專業對帳表格 */}
              <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed">
                  {/* 第一層：分組大標頭 */}
                  <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                    <tr className="text-[10px] font-black uppercase tracking-widest">
                      {/* 基本資訊改為 colSpan={3} */}
                      <th colSpan={3} className="p-2 text-gray-400 border-r border-gray-200 text-center">基本資訊</th>
                      <th colSpan={4} className="p-2 text-blue-600 border-r border-gray-200 text-center bg-blue-50/30">交易內容 (共用欄位)</th>
                      <th colSpan={3} className="p-2 text-orange-600 text-center bg-orange-50/30">餘額區 (Balance)</th>
                    </tr>
                    <tr className="bg-white border-b border-gray-100 text-[11px] font-bold text-gray-500">
                      {/* 基本資訊 (佔 26%) */}
                      <th className="w-[11%] p-3">日期 / 傳票號</th>
                      <th className="w-[9%] p-3 text-center">扣款/入款日</th>
                      <th className="w-[6%] p-3 text-center border-r">類別</th>
                      
                      {/* 交易內容 (佔 44%) */}
                      <th className="w-[9%] p-3 text-right">單位數</th>
                      <th className="w-[11%] p-3 text-right">單位成本/售價</th>
                      <th className="w-[10%] p-3 text-right">手續費/稅額</th>
                      <th className="w-[14%] p-3 text-right border-r">實際金額/損益</th>
                      
                      {/* 餘額區 (佔 30%) */}
                      <th className="w-[9%] p-3 text-right bg-orange-50/10">剩餘股數</th>
                      <th className="w-[10%] p-3 text-right bg-orange-50/10 text-orange-700">單位成本</th>
                      <th className="w-[11%] p-3 text-right bg-orange-50/10 font-black text-orange-800">期末總餘額</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {displayTxs.map(tx => (
              <tr 
                key={tx.id} 
                onClick={() => handleRowClick(tx)} 
                className={`cursor-pointer transition-colors ${tx.type === 'buy' ? 'hover:bg-blue-50/80' : 'hover:bg-red-50/80'}`}>
                <td className="p-3">
                          <div className="text-xs font-black text-gray-800">{tx.date}</div>
                          <div className="text-[10px] font-mono text-gray-400">{tx.voucherNo}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-xs font-bold text-gray-600">{tx.paymentDate}</span>
                        </td>
                        <td className="p-3 text-center border-r">
                          {tx.type === 'buy' ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md">買入</span>
                          ) : (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md">賣出</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-800 text-sm">
                          {tx.units.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          {tx.type === 'buy' ? (
                              <div className="text-xs font-medium text-gray-600">{(tx.unitPrice || 0).toFixed(4)}</div>
                          ) : (
                              <div className="text-xs font-bold text-red-600">{(tx.unitPrice || 0).toFixed(4)}</div>
                          )}
                        </td>
                        <td className="p-3 text-right text-[10px] text-gray-400 leading-tight">
                          {tx.type === 'buy' ? (
                              <div>{(tx.fee || 0).toLocaleString()}</div>
                          ) : (
                              <>
                                <div>{(tx.fee || 0).toLocaleString()} (費)</div>
                                <div>{(tx.sellTax || 0).toLocaleString()} (稅)</div>
                              </>
                          )}
                        </td>
                        <td className="p-3 text-right border-r">
                           {tx.type === 'buy' ? (
                               <div className="font-black text-blue-600 text-sm">{(tx.buyActualCost || 0).toLocaleString()}</div>
                           ) : (
                               <>
                                 <div className="text-sm font-black text-red-600">{(tx.sellNetAmount || 0).toLocaleString()}</div>
                                 <div className={`text-[10px] font-bold tracking-tighter ${(tx.realizedPnl || 0) >= 0 ? 'text-red-400' : 'text-green-600'}`}>
                                   (損益: {(tx.realizedPnl || 0) >= 0 ? '+' : ''}{(tx.realizedPnl || 0).toLocaleString()})
                                 </div>
                               </>
                           )}
                        </td>
                        
                        {/* 餘額區 (系統自動計算的結果) */}
                        <td className="p-3 text-right text-xs font-bold text-gray-600 bg-orange-50/5">
                          {tx.balanceUnits.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-xs font-bold text-gray-600 bg-orange-50/5">
                          {tx.balanceAvgCost.toFixed(4)}
                        </td>
                        <td className="p-3 text-right text-sm font-black text-gray-800 bg-orange-50/5 italic underline decoration-orange-200">
                          {tx.balanceTotalCost.toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {/* 空白防呆：如果沒有資料顯示這行 */}
                    {displayTxs.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-20 text-center text-gray-400 font-bold text-lg">
                          📋 尚無交易紀錄，請點擊右上方「+ 登錄新交易」
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 🚀 新增交易 Modal */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* 表單標頭 */}
            <div className={`p-5 border-b flex justify-between items-center text-white ${txType === 'buy' ? 'bg-blue-600' : 'bg-red-600'} transition-colors`}>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {editingTxId ? '編輯' : '登錄'}{txType === 'buy' ? '買入' : '賣出'}紀錄 - {selectedStock?.name}
              </h3>
              <button onClick={() => { setIsAddTxModalOpen(false); resetTxForm(); }} className="text-white/80 hover:text-white text-2xl font-black">✕</button>
            </div>

            {/* 買賣切換器 */}
            <div className="flex p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex bg-gray-200 p-1 rounded-xl w-full max-w-xs mx-auto">
                <button onClick={() => setTxType('buy')} className={`flex-1 py-2 font-bold rounded-lg transition-all text-sm ${txType === 'buy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>買入 (Buy)</button>
                <button onClick={() => setTxType('sell')} className={`flex-1 py-2 font-bold rounded-lg transition-all text-sm ${txType === 'sell' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>賣出 (Sell)</button>
              </div>
            </div>

            {/* 表單輸入區 */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-5">
                
                {/* --- 第一區塊：基本資訊 (手動輸入) --- */}
                <div className="col-span-2 text-sm font-black text-gray-400 border-b pb-2">基本資訊</div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">日期</label><input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none font-mono" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">傳票編號</label><input type="text" value={txVoucherNo} onChange={e => setTxVoucherNo(e.target.value)} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none font-mono" placeholder="例如: 1140904001" /></div>
                
                {/* --- 第二區塊：交易數值 (手動輸入) --- */}
                <div className="col-span-2 text-sm font-black text-gray-400 border-b pb-2 mt-2">交易數值</div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">單位數 (股)</label><input type="number" value={txUnits} onChange={e => setTxUnits(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-bold text-gray-800" placeholder="0" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">{txType === 'buy' ? '單位成本' : '成交單價'}</label><input type="number" value={txUnitPrice} onChange={e => setTxUnitPrice(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-bold text-gray-800" placeholder="0.00" /></div>
                <div><label className="block text-xs font-bold text-gray-600 mb-1">手續費</label><input type="number" value={txFee} onChange={e => setTxFee(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none" placeholder="0" /></div>
                
                {txType === 'sell' && (
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">證交稅</label><input type="number" value={txTax} onChange={e => setTxTax(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-red-400 outline-none" placeholder="0" /></div>
                )}
                
                <div><label className="block text-xs font-bold text-gray-600 mb-1">{txType === 'buy' ? '扣款日' : '入款日'}</label><input type="date" value={txPaymentDate} onChange={e => setTxPaymentDate(e.target.value)} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none font-mono" /></div>

                {/* --- 第三區塊：系統自動計算區 (唯讀) --- */}
                <div className="col-span-2 text-sm font-black text-purple-500 border-b border-purple-100 pb-2 mt-2 flex items-center gap-2">🤖 系統自動計算</div>
                
                {txType === 'buy' ? (
                  <>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">金額 (單位數 * 單價)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{buyAmount.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">實際成本 (金額 + 手續費)</label><div className="w-full bg-blue-50 border border-blue-100 p-2.5 rounded-xl font-mono font-bold text-blue-700">{buyActualCost.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">平均成本 (實際成本 / 單位數)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{buyAvgCost.toFixed(4)}</div></div>
                  </>
                ) : (
                  <>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">賣出總價 (單位數 * 單價)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{sellPrice.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">實際賣出淨額 (賣價-費-稅)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{sellNetAmount.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">平均售價淨額 (淨額 / 單位數)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{sellAvgPrice.toFixed(4)}</div></div>
                    
                    {/* FIFO 關鍵數據 */}
                    <div className="col-span-2 grid grid-cols-2 gap-5 mt-2">
                      <div><label className="block text-xs font-bold text-orange-500 mb-1 flex items-center gap-1">⚡ 帳列成本 (FIFO結轉)</label><div className="w-full bg-orange-50 border border-orange-200 p-2.5 rounded-xl font-mono font-bold text-orange-700">{matchedCost.toLocaleString()}</div></div>
                      <div>
                        <label className="block text-xs font-bold text-red-500 mb-1 flex items-center gap-1">📊 處分損益 (淨額 - 帳列成本)</label>
                        <div className={`w-full p-2.5 rounded-xl font-mono font-black border ${realizedPnl >= 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
                          {realizedPnl >= 0 ? '+' : ''}{realizedPnl.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* 表單底部按鈕 */}
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              {/* 如果是編輯模式，就顯示刪除按鈕 */}
              {editingTxId && (
                <button 
                  onClick={handleDeleteTransaction} 
                  className="px-5 py-3 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors"
                >
                  刪除
                </button>
              )}
              <button onClick={() => { setIsAddTxModalOpen(false); resetTxForm(); }} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">取消</button>
              <button 
                onClick={handleSaveTransaction} 
                className={`flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-all ${txType === 'buy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                確認存檔
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    )}

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
