import { ReturnIcon, PlusIcon, TrashIcon } from './Icons';
import React, { useState, useEffect } from 'react';
import { Client, StockClientConfig, StockTarget } from './types';
import { TaskService } from './taskService'; // ✨ 引入我們剛才寫好的 API 服務
// ✨ 新增這行：引入 Recharts 圖表庫
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

import { motion, AnimatePresence } from 'framer-motion';

interface StockInventoryViewProps {
  clients: Client[];
}

// ✨ 從 Stocks.tsx 移植過來的專屬動態圓餅圖 (已放大並支援自訂中間文字)
const UniversalDonutChart = React.memo(({ 
  data, total, centerTitle, centerValue, valueColorClass 
}: { 
  data: { name: string, value: number, color: string }[], total: number, centerTitle: string, centerValue: string, valueColorClass: string 
}) => {
  const [hoveredItem, setHoveredItem] = useState<{name: string, value: number, colorText: string} | null>(null);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center justify-center flex-1 relative min-h-[160px] w-full mt-2">
      {/* ✨ 改用 flex-1 與 min-h，確保它會隨畫面縮放而不會撐爆容器 */}
      <svg viewBox="0 0 100 100" className="h-full max-h-[200px] aspect-square transform -rotate-90 overflow-visible">
        <circle cx="50" cy="50" r={radius} stroke="#f8fafc" strokeWidth="10" fill="none" />
        {total > 0 && data.map((item, i) => {
          const percentage = item.value / total;
          const dashLength = percentage * circumference;
          const strokeDasharray = `${dashLength} ${circumference}`;
          const strokeDashoffset = -cumulativeOffset;
          cumulativeOffset += dashLength;

          return (
            <motion.circle
              key={item.name} cx="50" cy="50" r={radius} fill="none" stroke={item.color}
              className="outline-none cursor-pointer"
              initial={{ strokeDasharray: `0 ${circumference}`, strokeWidth: 10 }}
              animate={{ strokeDasharray: strokeDasharray, strokeWidth: 10 }}
              // 👇 hover 變粗幅度微調至 14，避免往內擠壓到文字
              whileHover={{ strokeWidth: 14, opacity: 0.9, transition: { duration: 0.15, ease: "easeOut" } }}
              transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.05 }}
              style={{ strokeDashoffset }}
              onMouseEnter={() => setHoveredItem({ name: item.name, value: item.value, colorText: item.color })}
              onMouseLeave={() => setHoveredItem(null)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div key={hoveredItem ? hoveredItem.name : 'default'} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }} className="text-center flex flex-col items-center">
            {hoveredItem ? (
              <>
                <span className="text-xs font-bold text-gray-500 mb-1 tracking-widest bg-gray-50 px-2 py-0.5 rounded-md">{hoveredItem.name}</span>
                <span className="text-2xl font-black" style={{ color: hoveredItem.colorText }}>${Math.round(hoveredItem.value).toLocaleString()}</span>
              </>
            ) : (
              <>
                {/* 👇 3. 動態接收外層傳進來的標題與數值 */}
                <span className="text-xs text-gray-400 font-bold tracking-widest mb-1">{centerTitle}</span>
                <span className={`text-3xl font-black ${valueColorClass}`}>{centerValue}</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

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

// ✨ 1. 準備一本空的股票大字典
  const [stockDictionary, setStockDictionary] = useState<Record<string, string>>({});

  // ✨ 2. 一進畫面就去抓取上市櫃的股票清單 (加上 CORS 代理伺服器)
  useEffect(() => {
    const fetchDictionary = async () => {
      try {
        const newDict: Record<string, string> = {};
        const timeStamp = new Date().getTime();

        // 🚀 從你的 Stocks.tsx 移植過來的「破壁機」，用來繞過證交所的 CORS 阻擋
        const fetchWithProxy = async (targetUrl: string) => {
          const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
          ];
          for (const proxy of proxies) {
            try {
              const res = await fetch(proxy);
              if (res.ok) return res;
            } catch (e) {}
          }
          return null;
        };
        
        // 抓取上市資料
        const twseRes = await fetchWithProxy(`https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL?t=${timeStamp}`);
        if (twseRes) {
          const twseData = await twseRes.json();
          twseData.forEach((item: any) => { if (item.Code && item.Name) newDict[item.Code] = item.Name.trim(); });
        }
        
        // 抓取上櫃資料
        const tpexRes = await fetchWithProxy(`https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes?t=${timeStamp}`);
        if (tpexRes) {
          const tpexData = await tpexRes.json();
          tpexData.forEach((item: any) => { if (item.SecuritiesCompanyCode && item.CompanyName) newDict[item.SecuritiesCompanyCode] = item.CompanyName.trim(); });
        }
        
        setStockDictionary(newDict);
      } catch (error) {
        console.warn("股票字典載入失敗，將採手動輸入", error);
      }
    };
    fetchDictionary();
  }, []);

  // ✨ 3. 監聽代號輸入框，一打滿 4 碼就自動查字典帶入名稱
  useEffect(() => {
    const code = newStockCode.trim();
    if (code.length >= 4 && stockDictionary[code]) {
      setNewStockName(stockDictionary[code]);
    }
  }, [newStockCode, stockDictionary]);

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

  // ✨ 真正的 FIFO 帳列成本預估 (表單即時運算)
  let previewMatchedCost = 0;
  let previewRealizedPnl = 0;

  if (txType === 'sell' && selectedStock) {
    // 1. 抓出這檔股票「在這筆交易日期之前」的所有歷史紀錄
    const pastTxs = transactions
      .filter(t => t.stockTargetId === selectedStock.id && t.id !== editingTxId && new Date(t.date).getTime() <= new Date(txDate || new Date()).getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    // 2. 模擬重建歷史 FIFO 佇列
    let tempLots: { units: number, actualCost: number }[] = [];
    pastTxs.forEach(t => {
      if (t.type === 'buy') {
        tempLots.push({ units: t.units, actualCost: t.buyActualCost || 0 });
      } else if (t.type === 'sell') {
        let unitsToSell = t.units;
        while (unitsToSell > 0 && tempLots.length > 0) {
          if (tempLots[0].units <= unitsToSell) {
            unitsToSell -= tempLots[0].units;
            tempLots.shift(); // 整批扣完，移除
          } else {
            const costPerUnit = tempLots[0].actualCost / tempLots[0].units;
            tempLots[0].actualCost -= costPerUnit * unitsToSell;
            tempLots[0].units -= unitsToSell;
            unitsToSell = 0; // 扣除部分，結束迴圈
          }
        }
      }
    });
    
    // 3. 試算當前這筆賣出會沖銷掉多少成本
    let unitsToSimulate = safeUnits;
    while (unitsToSimulate > 0 && tempLots.length > 0) {
      let oldestLot = tempLots[0];
      if (oldestLot.units <= unitsToSimulate) {
        unitsToSimulate -= oldestLot.units;
        previewMatchedCost += oldestLot.actualCost;
        tempLots.shift();
      } else {
        const costPerUnit = oldestLot.actualCost / oldestLot.units;
        previewMatchedCost += costPerUnit * unitsToSimulate;
        unitsToSimulate = 0;
      }
    }
    previewRealizedPnl = sellNetAmount - previewMatchedCost;
  }

  const matchedCost = previewMatchedCost;
  const realizedPnl = txType === 'sell' ? previewRealizedPnl : 0;

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
    let buyLots: { units: number, actualCost: number }[] = []; // ✨ 核心：建立 FIFO 庫存佇列

    const enrichedTxs = stockTxs.map(tx => {
      let currentTxMatchedCost = 0;
      let currentTxRealizedPnl = 0;

      if (tx.type === 'buy') {
        runningUnits += tx.units;
        const cost = tx.buyActualCost || 0;
        runningTotalCost += cost;
        buyLots.push({ units: tx.units, actualCost: cost }); // 買進時，將該批貨物放入佇列
      } else {
        // ✨ 賣出時：執行 FIFO 嚴格沖銷
        let unitsToSell = tx.units;
        while (unitsToSell > 0 && buyLots.length > 0) {
          let oldestLot = buyLots[0]; // 永遠從最舊的第一批貨開始抓
          if (oldestLot.units <= unitsToSell) {
            // 要賣的數量大於等於這批貨 -> 整批沖銷
            unitsToSell -= oldestLot.units;
            currentTxMatchedCost += oldestLot.actualCost;
            buyLots.shift(); // 這批貨賣光了，從佇列中剔除
          } else {
            // 要賣的數量小於這批貨 -> 沖銷部分成本
            const costPerUnit = oldestLot.actualCost / oldestLot.units;
            const consumedCost = costPerUnit * unitsToSell;
            oldestLot.units -= unitsToSell;
            oldestLot.actualCost -= consumedCost;
            currentTxMatchedCost += consumedCost;
            unitsToSell = 0;
          }
        }
        
        runningUnits -= tx.units;
        runningTotalCost -= currentTxMatchedCost;
        currentTxRealizedPnl = (tx.sellNetAmount || 0) - currentTxMatchedCost;
      }
      
      const avgCost = runningUnits > 0 ? runningTotalCost / runningUnits : 0;
      
      return {
        ...tx,
        // ✨ 用每次重新跑過的嚴謹計算結果，直接覆蓋資料庫裡的潛在錯誤數字
        matchedCost: tx.type === 'sell' ? currentTxMatchedCost : undefined,
        realizedPnl: tx.type === 'sell' ? currentTxRealizedPnl : undefined,
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
        帳列總成本: Math.round(tx.balanceTotalCost),
        單位均價: Math.round(tx.balanceAvgCost)
    }));
    
    // 📊 圖表 2：圓餅圖資料 (累計資金流向)
    const totalBuyCash = enrichedTxs.filter(t => t.type === 'buy').reduce((sum, t) => sum + (t.buyActualCost || 0), 0);
    const totalSellCash = enrichedTxs.filter(t => t.type === 'sell').reduce((sum, t) => sum + (t.sellNetAmount || 0), 0);
    
    // ✨ 新增：計算已實現報酬率 (總損益 / 處分部位的原始成本)
    const totalMatchedCost = totalSellCash - totalRealizedPnl;
    const roiPercentage = totalMatchedCost > 0 ? ((totalRealizedPnl / totalMatchedCost) * 100).toFixed(2) : '0.00';
    const roiText = `${totalRealizedPnl >= 0 ? '+' : ''}${roiPercentage}%`;
    const roiColorClass = totalRealizedPnl >= 0 ? 'text-red-500' : 'text-green-500';

    const cashFlowData = [
        { name: '累計買入', value: totalBuyCash, color: '#3b82f6' }, // 藍色
        { name: '累計賣出', value: totalSellCash, color: '#10b981' }  // 綠色
    ];

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
        {/* ✨ 將外層改為 overflow-hidden flex flex-col，強迫內容不超出視窗高度 */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col">
          
          {/* --- 分頁一：圖表總覽 (Charts Tab) --- */}
          {activeSubTab === 'overview' && (
            {/* ✨ 加上 h-full 讓它可以被垂直伸展 */}
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-4 sm:gap-6">
              
              {/* 1. KPI 數值摘要 (改為 shrink-0 防止被擠壓，並縮小 padding) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 shrink-0">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">當前庫存股數</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-800">{currentStockUnits.toLocaleString()} <span className="text-xs sm:text-sm font-medium text-gray-400">股</span></p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">帳列總成本</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-800">${currentStockTotalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">當前平均成本</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-500">${Math.round(currentStockAvgCost).toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">累計已處分損益</p>
                  <p className={`text-2xl sm:text-3xl font-black ${totalRealizedPnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {totalRealizedPnl >= 0 ? '+' : ''}{totalRealizedPnl.toLocaleString()}
                  </p>
                </div>
              </div>
                  
  {/* 2. 圖示化區塊 (✨ 加上 flex-1 min-h-0，讓圖表自動吃滿所有剩下的高度) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">
                
                {/* 折線圖 (佔 2/3 寬度) */}
                {/* ✨ 移除固定的 h-96，改為 min-h-0 */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:col-span-2 min-h-0">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 shrink-0">
                    <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div> 帳列成本與均價走勢
                  </h4>
                  <div className="flex-1 w-full min-h-0">
                    {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} minTickGap={20} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-10} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={10} domain={['auto', 'auto']} />
                          
                          {/* 繼承 Stocks.tsx 的精緻 Tooltip，會顯示完整日期 */}
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                            formatter={(value: number, name: string) => [`$${Math.round(value).toLocaleString()}`, name]}
                            labelFormatter={(label, payload) => {
                              return payload && payload.length > 0 ? payload[0].payload.fullDate.replace(/-/g, '/') : label;
                            }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          
                          {/* 💡 完美移植：改用 monotone 平滑曲線，隱藏節點 (dot={false})，並加上勻速動畫 */}
                          <Line 
                            yAxisId="left" type="monotone" dataKey="帳列總成本" name="帳列總成本" 
                            stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} 
                            isAnimationActive={true} animationDuration={2000} animationEasing="linear"
                          />
                          <Line 
                            yAxisId="right" type="monotone" dataKey="單位均價" name="單位均價" 
                            stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} 
                            isAnimationActive={true} animationBegin={800} animationDuration={2000} animationEasing="linear" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">尚無交易資料可繪製圖表</div>
                    )}
                  </div>
                </div>

                {/* 圓餅圖 (佔 1/3 寬度) */}
                {/* ✨ 移除固定的 h-96，改為 min-h-0 */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-0">
                   <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 shrink-0">
                    <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div> 累計資金流向比例
                  </h4>
                  <div className="flex-1 w-full relative flex flex-col min-h-0">
                    {cashFlowData.reduce((acc, cur) => acc + cur.value, 0) > 0 ? (
                      <>
                        <UniversalDonutChart 
                          data={cashFlowData}
                          total={cashFlowData.reduce((acc, cur) => acc + cur.value, 0)}
                          centerTitle="已實現報酬率"
                          centerValue={roiText}
                          valueColorClass={roiColorClass}
                        />
                        {/* 自訂的標籤說明 (Legend) */}
                        <div className="flex justify-center gap-6 mt-auto pb-4">
                          {cashFlowData.map(item => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-sm font-bold text-gray-600">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
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
            {/* ✨ 移除固定的 min-h，改用 h-full 讓明細表完美貼齊視窗高度 */}
            <div className="max-w-[1600px] mx-auto w-full h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              {/* A. 功能操作列 */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-400">排序：日期降序</span>
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
                  <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                    <tr className="text-[10px] font-black uppercase tracking-widest">
                      <th colSpan={3} className="p-2 text-gray-400 border-r border-gray-200 text-center">基本資訊</th>
                      <th colSpan={4} className="p-2 text-blue-600 border-r border-gray-200 text-center bg-blue-50/30">交易內容</th>
                      <th colSpan={3} className="p-2 text-orange-600 text-center bg-orange-50/30">餘額區</th>
                    </tr>
                    <tr className="bg-white border-b border-gray-100 text-[11px] font-bold text-gray-500">
                      {/* 基本資訊 (縮減至 23%) */}
                      <th className="w-[10%] p-3">日期 / 傳票號</th>
                      <th className="w-[8%] p-3 text-center">扣款 / 入款日</th>
                      <th className="w-[5%] p-3 text-center border-r">類別</th>
                      
                      {/* 交易內容 (微調至 43%) */}
                      <th className="w-[8%] p-3 text-right">單位數</th>
                      <th className="w-[10%] p-3 text-right">單位成本 / 售價</th>
                      <th className="w-[8%] p-3 text-right">手續費 / 證交稅</th>
                      <th className="w-[17%] p-3 text-right border-r">實際金額 / 損益</th>
                      
                      {/* 餘額區 (擴展至 34%) */}
                      <th className="w-[8%] p-3 text-right bg-orange-50/10">剩餘股數</th>
                      <th className="w-[10%] p-3 text-right bg-orange-50/10 text-orange-700">平均成本</th>
                      <th className="w-[16%] p-3 text-right bg-orange-50/10 font-black text-orange-800">期末餘額</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {displayTxs.map(tx => (
                      <tr key={tx.id} onClick={() => handleRowClick(tx)} className={`cursor-pointer transition-colors ${tx.type === 'buy' ? 'hover:bg-blue-50/80' : 'hover:bg-red-50/80'}`}>
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
                              <div className="text-xs font-medium text-gray-600">{Math.round(tx.unitPrice || 0).toLocaleString()}</div>
                          ) : (
                              <div className="text-xs font-bold text-red-600">{Math.round(tx.unitPrice || 0).toLocaleString()}</div>
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
                        {/* 實際金額 / 損益區塊 (補上 Math.round) */}
                        <td className="p-3 text-right border-r">
                           {tx.type === 'buy' ? (
                               <div className="font-black text-blue-600 text-sm">{Math.round(tx.buyActualCost || 0).toLocaleString()}</div>
                           ) : (
                               <>
                                 <div className="text-sm font-black text-red-600">{Math.round(tx.sellNetAmount || 0).toLocaleString()}</div>
                                 <div className={`text-[10px] font-bold tracking-tighter ${(tx.realizedPnl || 0) >= 0 ? 'text-red-400' : 'text-green-600'}`}>
                                   (損益: {(tx.realizedPnl || 0) >= 0 ? '+' : ''}{Math.round(tx.realizedPnl || 0).toLocaleString()})
                                 </div>
                               </>
                           )}
                        </td>
                        
                        {/* 餘額區 */}
                        <td className="p-3 text-right text-xs font-bold text-gray-600 bg-orange-50/5">
                          {tx.balanceUnits.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-xs font-bold text-gray-600 bg-orange-50/5">
                          {Math.round(tx.balanceAvgCost).toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-sm font-black text-gray-800 bg-orange-50/5 italic underline decoration-orange-200">
                          {Math.round(tx.balanceTotalCost).toLocaleString()}
                        </td>
                      </tr>
                    ))}
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
                    <div className={`p-5 border-b flex justify-between items-center text-white ${txType === 'buy' ? 'bg-blue-600' : 'bg-red-600'} transition-colors`}>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        {editingTxId ? '編輯' : '登錄'}{txType === 'buy' ? '買入' : '賣出'}紀錄 - {selectedStock?.name}
                      </h3>
                      <button onClick={() => { setIsAddTxModalOpen(false); resetTxForm(); }} className="text-white/80 hover:text-white text-2xl font-black">✕</button>
                    </div>

                    <div className="flex p-4 bg-gray-50 border-b border-gray-100">
                      <div className="flex bg-gray-200 p-1 rounded-xl w-full max-w-xs mx-auto">
                        <button onClick={() => setTxType('buy')} className={`flex-1 py-2 font-bold rounded-lg transition-all text-sm ${txType === 'buy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>買入 (Buy)</button>
                        <button onClick={() => setTxType('sell')} className={`flex-1 py-2 font-bold rounded-lg transition-all text-sm ${txType === 'sell' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>賣出 (Sell)</button>
                      </div>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2 text-sm font-black text-gray-400 border-b pb-2">基本資訊</div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">日期</label><input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none font-mono" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">傳票編號</label><input type="text" value={txVoucherNo} onChange={e => setTxVoucherNo(e.target.value)} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none font-mono" placeholder="例如: 1140904001" /></div>
                        
                        <div className="col-span-2 text-sm font-black text-gray-400 border-b pb-2 mt-2">交易數值</div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">單位數 (股)</label><input type="number" value={txUnits} onChange={e => setTxUnits(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-bold text-gray-800" placeholder="0" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">{txType === 'buy' ? '單位成本' : '成交單價'}</label><input type="number" value={txUnitPrice} onChange={e => setTxUnitPrice(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-bold text-gray-800" placeholder="0.00" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">手續費</label><input type="number" value={txFee} onChange={e => setTxFee(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none" placeholder="0" /></div>
                        {txType === 'sell' && (
                          <div><label className="block text-xs font-bold text-gray-600 mb-1">證交稅</label><input type="number" value={txTax} onChange={e => setTxTax(Number(e.target.value))} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-red-400 outline-none" placeholder="0" /></div>
                        )}
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">{txType === 'buy' ? '扣款日' : '入款日'}</label><input type="date" value={txPaymentDate} onChange={e => setTxPaymentDate(e.target.value)} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-gray-400 outline-none font-mono" /></div>

                <div className="col-span-2 text-sm font-black text-purple-500 border-b border-purple-100 pb-2 mt-2 flex items-center gap-2">🤖 系統自動計算</div>
                
                {txType === 'buy' ? (
                  <>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">金額 (單位數 * 單價)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{buyAmount.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">實際成本 (金額 + 手續費)</label><div className="w-full bg-blue-50 border border-blue-100 p-2.5 rounded-xl font-mono font-bold text-blue-700">{buyActualCost.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">平均成本 (實際成本 / 單位數)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{Math.round(buyAvgCost).toLocaleString()}</div></div>
                  </>
                ) : (
                  <>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">賣出總價 (單位數 * 單價)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{sellPrice.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">實際賣出淨額 (賣價-費-稅)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{sellNetAmount.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-bold text-gray-400 mb-1">平均售價淨額 (淨額 / 單位數)</label><div className="w-full bg-gray-100 p-2.5 rounded-xl font-mono text-gray-600">{Math.round(sellAvgPrice).toLocaleString()}</div></div>
                    
                    {/* FIFO 關鍵數據 */}
                    <div className="col-span-2 grid grid-cols-2 gap-5 mt-2">
                      <div><label className="block text-xs font-bold text-orange-500 mb-1 flex items-center gap-1">⚡ 帳列成本 (FIFO結轉)</label><div className="w-full bg-orange-50 border border-orange-200 p-2.5 rounded-xl font-mono font-bold text-orange-700">{Math.round(matchedCost).toLocaleString()}</div></div>
                      <div>
                        <label className="block text-xs font-bold text-red-500 mb-1 flex items-center gap-1">📊 處分損益 (淨額 - 帳列成本)</label>
                        <div className={`w-full p-2.5 rounded-xl font-mono font-black border ${realizedPnl >= 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
                          {realizedPnl >= 0 ? '+' : ''}{Math.round(realizedPnl).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                      </div>
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex gap-3">
                      {editingTxId && (
                        <button onClick={handleDeleteTransaction} className="px-5 py-3 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors">刪除</button>
                      )}
                      <button onClick={() => { setIsAddTxModalOpen(false); resetTxForm(); }} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">取消</button>
                      <button onClick={handleSaveTransaction} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-all ${txType === 'buy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>確認存檔</button>
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
            {/* ✨ 圓形返回圖示按鈕 (與零用金系統一致) */}
            <button onClick={() => setSelectedClient(null)} title="返回所有客戶" className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
              <ReturnIcon className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-gray-800">{selectedClient.name} 的投資標的</h2>
          </div>
          <div className="flex gap-2">
            {/* ✨ 新增交易股票按鈕 (純圖示) */}
            <button onClick={() => setIsAddStockModalOpen(true)} title="新增交易股票" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center">
              <PlusIcon className="w-5 h-5" />
            </button>
            
            {/* ✨ 刪除標的按鈕 (純圖示) */}
            <button onClick={() => { setStocksToDelete([]); setIsDeleteStockModalOpen(true); }} title="刪除標的" className="p-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center">
              <TrashIcon className="w-5 h-5" />
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
          {/* ✨ 加入進銷存客戶按鈕 (純圖示) */}
          <button onClick={() => setIsAddClientModalOpen(true)} title="加入進銷存客戶" className="p-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors flex items-center justify-center">
            <PlusIcon className="w-5 h-5" />
          </button>
          
          {/* ✨ 移除客戶按鈕 (純圖示) */}
          <button onClick={() => { setClientsToDelete([]); setIsDeleteClientModalOpen(true); }} title="移除客戶" className="p-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center">
            <TrashIcon className="w-5 h-5" />
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
