// src/InvoiceGenerator.tsx

import React, { useState, useEffect } from 'react';
import { CashRecord } from './types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CloudArrowDownIcon } from './Icons';

interface InvoiceGeneratorProps {
    onClose: () => void;
    cashRecords: CashRecord[];
}

interface InvoiceItem {
    description: string;
    amount: number;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ onClose, cashRecords }) => {
    // --- State ---
    const [invoiceNo, setInvoiceNo] = useState('');
    const [clientName, setClientName] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    
    // 承辦事項 (預設4行)
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: '', amount: 0 },
        { description: '', amount: 0 },
        { description: '', amount: 0 },
        { description: '', amount: 0 }
    ]);
    
    // 代墊款
    const [advances, setAdvances] = useState<CashRecord[]>([]);
    const [advanceTotal, setAdvanceTotal] = useState(0);
    const [taxAmount, setTaxAmount] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(false);

    // --- Init ---
    useEffect(() => {
        const d = new Date();
        const year = d.getFullYear() - 1911;
        setInvoiceDate(`${year}年${d.getMonth() + 1}月${d.getDate()}日`);
    }, []);

    // --- Logic ---
    const handleSearch = () => {
        if (!invoiceNo.trim()) { alert("請輸入單號"); return; }
        const found = cashRecords.filter(r => r.requestId === invoiceNo.trim());
        
        if (found.length === 0) {
            alert("找不到此單號的代墊款紀錄");
            setAdvances([]);
            setAdvanceTotal(0);
            return;
        }

        if (found[0].clientName) setClientName(found[0].clientName);
        found.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setAdvances(found);
        setAdvanceTotal(found.reduce((sum, r) => sum + Number(r.amount), 0));
    };

    const serviceTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const grandTotal = serviceTotal + advanceTotal;

    // ✨ 核心功能：生成並下載 Excel
    const handleDownloadExcel = async () => {
        setIsGenerating(true);
        try {
            // 1. 讀取 Public 資料夾裡的模版檔案
            const response = await fetch('/invoice_template.xlsx');
            if (!response.ok) throw new Error('找不到模版檔案，請確認 public/invoice_template.xlsx 是否存在');
            const arrayBuffer = await response.arrayBuffer();

            // 2. 解析 Excel
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            // ==========================================
            // SHEET 1: 請款單 (依照我們約定的座標)
            // ==========================================
            const sheet1 = workbook.getWorksheet(1);
            if (sheet1) {
                // 📍 座標設定區 (如果您以後要改位置，改這裡就好)
                const CELL_CLIENT = 'A8';
                const CELL_DATE   = 'C8';
                const CELL_NO     = 'C10';
                const ROW_ITEMS   = 13;   // 承辦事項從第 13 列開始
                const CELL_TOTAL1 = 'B21'; // 業務總額
                const CELL_TOTAL2 = 'B24'; // 代收代付
                const CELL_TOTAL3 = 'B28'; // 總計
                const CELL_TAX    = 'A29'; // 稅額備註

                // 填寫基本資料
                sheet1.getCell(CELL_CLIENT).value = `${clientName}  台照`; 
                sheet1.getCell(CELL_DATE).value   = `日期：${invoiceDate}`; 
                sheet1.getCell(CELL_NO).value     = `單號：${invoiceNo}`;

                // 填寫承辦事項 (迴圈寫入)
                items.forEach((item, index) => {
                    const row = ROW_ITEMS + index;
                    if (item.description) {
                        sheet1.getCell(`A${row}`).value = `${index + 1}. ${item.description}`;
                        sheet1.getCell(`B${row}`).value = item.amount;
                    } else {
                        // 清空該行 (防止舊模版有資料)
                        sheet1.getCell(`A${row}`).value = '';
                        sheet1.getCell(`B${row}`).value = '';
                    }
                });

                // 填寫金額統計
                sheet1.getCell(CELL_TOTAL1).value = serviceTotal; 
                sheet1.getCell(CELL_TOTAL2).value = advanceTotal;
                sheet1.getCell(CELL_TOTAL3).value = grandTotal;

                // 填寫稅額備註
                if (taxAmount > 0) {
                    sheet1.getCell(CELL_TAX).value = `(本所依法自行繳納$${taxAmount.toLocaleString()}之扣繳稅款)`;
                } else {
                    sheet1.getCell(CELL_TAX).value = '';
                }
            }

            // ==========================================
            // SHEET 2: 代墊款 (假設在第 2 頁)
            // ==========================================
            const sheet2 = workbook.getWorksheet(2);
            if (sheet2 && advances.length > 0) {
                // 標題
                sheet2.getCell('A1').value = `公司名稱 : ${clientName}`; 

                // 從第 4 列開始填寫資料
                advances.forEach((row, index) => {
                    const r = 4 + index;
                    const [y, m, d] = row.date.split('-');
                    const rocDate = `${Number(y)-1911}/${m}/${d}`;
                    
                    // 強制寫入資料
                    sheet2.getCell(`A${r}`).value = rocDate;
                    sheet2.getCell(`B${r}`).value = Number(row.amount);
                    sheet2.getCell(`C${r}`).value = row.category;
                    sheet2.getCell(`D${r}`).value = row.description;
                    sheet2.getCell(`E${r}`).value = row.note;
                });

                // 清除剩餘的空行 (假設清到第 24 行)
                const dataEndRow = 4 + advances.length;
                for (let i = dataEndRow; i < 24; i++) {
                     ['A','B','C','D','E'].forEach(col => {
                         sheet2.getCell(`${col}${i}`).value = '';
                     });
                }

                // 填上小計
                sheet2.getCell(`A${dataEndRow}`).value = '小計';
                sheet2.getCell(`B${dataEndRow}`).value = advanceTotal;
            }

            // 3. 輸出檔案
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${clientName}_請款單_${invoiceDate}.xlsx`);
            
        } catch (error) {
            console.error(error);
            alert("生成失敗！請檢查 public 資料夾內是否有 invoice_template.xlsx");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Render ---
    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">📊 請款單生成器 (Excel 填充模式)</h2>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Left: Basic Info */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2">1. 載入資料</h3>
                            <div className="flex gap-2">
                                <input 
                                    value={invoiceNo} 
                                    onChange={e => setInvoiceNo(e.target.value)} 
                                    placeholder="輸入單號 (如 115R001)" 
                                    className="flex-1 p-2 border rounded-lg shadow-sm font-mono font-bold"
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                                <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm">
                                    載入
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">客戶抬頭 (寫入 A8)</label>
                                    <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">請款日期 (寫入 C8)</label>
                                    <input value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl border shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-gray-700">代墊款明細 ({advances.length} 筆)</h4>
                                    <span className="text-blue-600 font-bold text-xl">${advanceTotal.toLocaleString()}</span>
                                </div>
                                <div className="max-h-40 overflow-y-auto text-sm border-t">
                                    {advances.length > 0 ? (
                                        <table className="w-full text-left mt-2">
                                            <thead className="text-gray-500"><tr><th>日期</th><th>項目</th><th className="text-right">金額</th></tr></thead>
                                            <tbody>
                                                {advances.map(r => (
                                                    <tr key={r.id} className="border-b last:border-0">
                                                        <td className="py-1 text-gray-500">{r.date.slice(5)}</td>
                                                        <td className="py-1">{r.description}</td>
                                                        <td className="py-1 text-right font-mono">${r.amount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <p className="text-gray-400 py-4 text-center">請先輸入單號並載入...</p>}
                                </div>
                            </div>
                        </div>

                        {/* Right: Items & Actions */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2">2. 填寫業務費用 (寫入 Row 13+)</h3>
                            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <span className="text-gray-400 py-2 w-4 text-center">{idx+1}.</span>
                                        <input 
                                            placeholder="項目名稱" 
                                            value={item.description}
                                            onChange={e => {
                                                const newItems = [...items];
                                                newItems[idx].description = e.target.value;
                                                setItems(newItems);
                                            }}
                                            className="flex-1 p-2 border rounded"
                                        />
                                        <input 
                                            type="number"
                                            placeholder="$" 
                                            value={item.amount || ''}
                                            onChange={e => {
                                                const newItems = [...items];
                                                newItems[idx].amount = Number(e.target.value);
                                                setItems(newItems);
                                            }}
                                            className="w-24 p-2 border rounded text-right font-mono"
                                        />
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 border-t mt-2">
                                    <span className="text-gray-500 font-bold">業務費總計 (寫入 B21)</span>
                                    <span className="font-bold text-lg">${serviceTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-1">代繳稅款備註 (寫入 A29)</label>
                                <input type="number" value={taxAmount || ''} onChange={e => setTaxAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg" placeholder="0" />
                                <p className="text-xs text-gray-400 mt-1">若為 0 則不顯示</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t flex justify-between items-center">
                    <div className="text-xl font-bold text-gray-800">
                        總應收金額：<span className="text-blue-600 text-2xl">${grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">取消</button>
                        <button 
                            onClick={handleDownloadExcel} 
                            disabled={isGenerating}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? '生成中...' : (
                                <>
                                    <CloudArrowDownIcon className="w-6 h-6" />
                                    下載 Excel
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
