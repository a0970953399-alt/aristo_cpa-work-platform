// src/InvoiceGenerator.tsx

import React, { useState, useEffect } from 'react';
import { CashRecord } from './types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CloudArrowDownIcon } from './Icons';

// 🔴🔴🔴 請務必更新這裡的 Base64 字串！！！
// 必須是您剛修改完 (包含 ((稅款)) 佔位符) 的 Excel 檔轉出來的編碼
const TEMPLATE_BASE64 = ""; 

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
    
    // 承辦事項
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

    // ✨ 核心功能：生成並下載 Excel (嵌入版)
    const handleDownloadExcel = async () => {
        if (!TEMPLATE_BASE64) {
            alert("請先將新的 Excel (包含 ((稅款)) 佔位符) 轉成 Base64 並貼入程式碼中！");
            return;
        }

        setIsGenerating(true);
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(Buffer.from(TEMPLATE_BASE64, 'base64'));

            // ==========================================
            // SHEET 1: 請款單
            // ==========================================
            const sheet1 = workbook.worksheets[0]; 
            if (sheet1) {
                // 強制設定欄寬
                sheet1.getColumn('A').width = 60; 
                sheet1.getColumn('B').width = 20;

                const ROW_ITEMS = 12; // A12 開始
                
                // 填寫基本資料 (替換佔位符)
                // 這裡我們直接寫入值，因為這些通常是整格替換
                sheet1.getCell('A8').value = `${clientName}`; 
                sheet1.getCell('C8').value = `日期：${invoiceDate}`; 
                sheet1.getCell('C10').value = `單號：${invoiceNo}`;

                // 清空舊資料
                for(let i=0; i<8; i++) {
                    sheet1.getCell(`A${ROW_ITEMS+i}`).value = '';
                    sheet1.getCell(`B${ROW_ITEMS+i}`).value = '';
                }
                
                // 填入承辦事項
                items.forEach((item, index) => {
                    const row = ROW_ITEMS + index;
                    if (item.description) {
                        const cellDesc = sheet1.getCell(`A${row}`);
                        cellDesc.value = `${index + 1}. ${item.description}`;
                        cellDesc.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                        cellDesc.font = { name: '新細明體', size: 12 };

                        const cellAmount = sheet1.getCell(`B${row}`);
                        cellAmount.value = item.amount;
                        cellAmount.font = { name: '新細明體', size: 12 };
                        cellAmount.alignment = { vertical: 'middle', horizontal: 'right' };
                    }
                });

                // 填寫金額統計
                sheet1.getCell('B20').value = serviceTotal; 
                sheet1.getCell('B23').value = advanceTotal;
                sheet1.getCell('B27').value = grandTotal;

                // ✨✨✨ 重點修正：稅額文字替換 (B29) ✨✨✨
                const cellTax = sheet1.getCell('B29');
                
                if (taxAmount > 0) {
                    // 1. 讀取模版裡原本的文字 (例如：(本所依法自行繳納$((稅款))之扣繳稅款))
                    // 如果讀不到，就給一個預設值防止報錯
                    let originalText = cellTax.value ? cellTax.value.toString() : '(本所依法自行繳納$((稅款))之扣繳稅款)';
                    
                    // 2. 進行替換：把 ((稅款)) 換成數字
                    const newText = originalText.replace('((稅款))', taxAmount.toLocaleString());
                    
                    // 3. 寫回去
                    cellTax.value = newText;
                    cellTax.font = { name: '新細明體', size: 10 }; // 維持格式
                } else {
                    // 如果稅額是 0，整行清空
                    cellTax.value = '';
                }
            }

            // ==========================================
            // SHEET 2: 代墊單 (完美框線)
            // ==========================================
            const sheet2 = workbook.worksheets[1]; 
            if (sheet2 && advances.length > 0) {
                sheet2.getCell('A1').value = `公司名稱 : ${clientName}`; 
                
                sheet2.getColumn('A').width = 15; 
                sheet2.getColumn('B').width = 15; 
                sheet2.getColumn('C').width = 15; 
                sheet2.getColumn('D').width = 40; 
                sheet2.getColumn('E').width = 10; 

                const startRow = 4;
                const borderThin: Partial<ExcelJS.Borders> = {
                    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
                };

                advances.forEach((row, index) => {
                    const currentRow = startRow + index;
                    const [y, m, d] = row.date.split('-');
                    const rocDate = `${Number(y)-1911}/${m}/${d}`;
                    
                    sheet2.getCell(`A${currentRow}`).value = rocDate;
                    sheet2.getCell(`B${currentRow}`).value = Number(row.amount);
                    sheet2.getCell(`C${currentRow}`).value = row.category;
                    sheet2.getCell(`D${currentRow}`).value = row.description;
                    sheet2.getCell(`E${currentRow}`).value = row.note;

                    ['A','B','C','D','E'].forEach(col => {
                        const cell = sheet2.getCell(`${col}${currentRow}`);
                        cell.border = borderThin;
                        cell.font = { name: '新細明體', size: 12 };
                        cell.alignment = { vertical: 'middle', horizontal: col === 'D' ? 'left' : 'center', wrapText: true };
                    });
                });

                const totalRowIndex = startRow + advances.length;
                sheet2.getCell(`A${totalRowIndex}`).value = '小計';
                sheet2.getCell(`B${totalRowIndex}`).value = advanceTotal;
                
                const borderDouble: Partial<ExcelJS.Borders> = {
                    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' }
                };

                ['A','B','C','D','E'].forEach(col => {
                    const cell = sheet2.getCell(`${col}${totalRowIndex}`);
                    cell.border = borderDouble;
                    if (!cell.value) cell.value = '';
                });

                for (let i = totalRowIndex + 1; i < totalRowIndex + 20; i++) {
                     ['A','B','C','D','E'].forEach(col => {
                         const cell = sheet2.getCell(`${col}${i}`);
                         cell.value = '';
                         cell.border = {};
                     });
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${clientName}_請款單_${invoiceDate}.xlsx`);
            
        } catch (error) {
            console.error(error);
            alert("生成失敗！請確認 Base64 字串是否正確。");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Render ---
    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">📊 請款單生成器 (嵌入版)</h2>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2">1. 載入資料</h3>
                            <div className="flex gap-2">
                                <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="單號 (如 115R001)" className="flex-1 p-2 border rounded-lg font-mono font-bold" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                                <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">載入</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-500 mb-1">客戶抬頭</label><input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-bold text-gray-500 mb-1">請款日期</label><input value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border shadow-sm">
                                <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-gray-700">代墊款明細</h4><span className="text-blue-600 font-bold text-xl">${advanceTotal.toLocaleString()}</span></div>
                                <div className="max-h-40 overflow-y-auto text-sm border-t mt-2">
                                    {advances.length > 0 ? (
                                        <table className="w-full text-left mt-2"><thead className="text-gray-500"><tr><th>日期</th><th>項目</th><th className="text-right">金額</th></tr></thead><tbody>
                                            {advances.map(r => (<tr key={r.id} className="border-b last:border-0"><td className="py-1 text-gray-500">{r.date.slice(5)}</td><td className="py-1">{r.description}</td><td className="py-1 text-right font-mono">${r.amount}</td></tr>))}
                                        </tbody></table>
                                    ) : <p className="text-gray-400 py-4 text-center">...</p>}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2">2. 填寫業務費用</h3>
                            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <span className="text-gray-400 py-2 w-4 text-center">{idx+1}.</span>
                                        <input placeholder="項目名稱" value={item.description} onChange={e => {const n=[...items];n[idx].description=e.target.value;setItems(n)}} className="flex-1 p-2 border rounded" />
                                        <input type="number" placeholder="$" value={item.amount || ''} onChange={e => {const n=[...items];n[idx].amount=Number(e.target.value);setItems(n)}} className="w-24 p-2 border rounded text-right font-mono" />
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 border-t mt-2"><span className="text-gray-500 font-bold">總計</span><span className="font-bold text-lg">${serviceTotal.toLocaleString()}</span></div>
                            </div>
                            <div><label className="block text-sm font-bold text-gray-500 mb-1">代繳稅款備註 (B29)</label><input type="number" value={taxAmount || ''} onChange={e => setTaxAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg" /></div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white border-t flex justify-between items-center">
                    <div className="text-xl font-bold text-gray-800">總應收：<span className="text-blue-600 text-2xl">${grandTotal.toLocaleString()}</span></div>
                    <div className="flex gap-3"><button onClick={onClose} className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">取消</button><button onClick={handleDownloadExcel} disabled={isGenerating} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg"><CloudArrowDownIcon className="w-6 h-6"/> 下載 Excel</button></div>
                </div>
            </div>
        </div>
    );
};
