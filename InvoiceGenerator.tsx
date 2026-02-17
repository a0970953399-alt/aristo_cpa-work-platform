// src/InvoiceGenerator.tsx

import React, { useState, useRef, useEffect } from 'react';
import { CashRecord } from './types';
import { TaskService } from './taskService';
import { PrinterIcon, CloudArrowUpIcon } from './Icons'; // 假設您有這些 Icon，若無可換成文字

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
    const [invoiceNo, setInvoiceNo] = useState(''); // 單號 (關鍵字)
    const [clientName, setClientName] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(''); // 民國年字串
    
    // 事務所抬頭圖片 (預設用 localStorage 存，方便您上傳後保留)
    const [headerImage, setHeaderImage] = useState<string>(localStorage.getItem('shuoye_invoice_header') || '');

    // 承辦事項 (預設3行)
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: '', amount: 0 },
        { description: '', amount: 0 },
        { description: '', amount: 0 }
    ]);
    
    // 自動抓到的代墊款
    const [advances, setAdvances] = useState<CashRecord[]>([]);
    const [advanceTotal, setAdvanceTotal] = useState(0);

    // 稅額
    const [taxAmount, setTaxAmount] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Init ---
    useEffect(() => {
        // 設定預設日期 (民國年)
        const d = new Date();
        const year = d.getFullYear() - 1911;
        setInvoiceDate(`${year}年${d.getMonth() + 1}月${d.getDate()}日`);
    }, []);

    // --- Logic ---

    // 1. 搜尋代墊款
    const handleSearch = () => {
        if (!invoiceNo.trim()) {
            alert("請輸入單號");
            return;
        }

        // 搜尋邏輯：requestId 吻合的代墊款
        // 注意：必須是「支出」且「未請款」(這裡我們先抓全部吻合的，讓使用者自己看)
        const found = cashRecords.filter(r => r.requestId === invoiceNo.trim());
        
        if (found.length === 0) {
            alert("找不到此單號的代墊款紀錄，請確認單號是否正確");
            setAdvances([]);
            setAdvanceTotal(0);
            return;
        }

        // 自動填入客戶名稱 (抓第一筆的 clientName)
        if (found[0].clientName) {
            setClientName(found[0].clientName);
        }

        // 排序 (日期舊->新)
        found.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setAdvances(found);
        
        // 計算總額
        const total = found.reduce((sum, r) => sum + Number(r.amount), 0);
        setAdvanceTotal(total);
    };

    // 2. 計算業務收入總額
    const serviceTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);

    // 3. 應收金額合計
    const grandTotal = serviceTotal + advanceTotal;

    // 4. 處理圖片上傳
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const result = evt.target?.result as string;
                setHeaderImage(result);
                localStorage.setItem('shuoye_invoice_header', result); // 存起來下次用
            };
            reader.readAsDataURL(file);
        }
    };

    // 5. 列印
    const handlePrint = () => {
        window.print();
    };

    // --- Render ---
    return (
        <div className="fixed inset-0 bg-gray-100 z-[200] flex flex-col animate-fade-in overflow-hidden">
            
            {/* Top Toolbar (列印時隱藏) */}
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">🖨️ 請款單生成器</h2>
                    <div className="h-6 w-px bg-gray-600"></div>
                    <div className="flex gap-2">
                        <input 
                            value={invoiceNo} 
                            onChange={e => setInvoiceNo(e.target.value)} 
                            placeholder="輸入單號 (如 115R001)" 
                            className="text-black px-3 py-1 rounded font-bold outline-none w-48"
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded font-bold">載入代墊款</button>
                    </div>
                </div>
                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold text-sm">
                        <CloudArrowUpIcon className="w-5 h-5"/> {headerImage ? '更換抬頭圖片' : '上傳抬頭圖片'}
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold shadow-lg">
                        <PrinterIcon className="w-5 h-5"/> 列印 / 存成 PDF
                    </button>
                    <button onClick={onClose} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold ml-2">關閉</button>
                </div>
            </div>

            {/* Main Content (左右分割：左邊編輯，右邊預覽) */}
            <div className="flex-1 flex overflow-hidden print:block print:h-auto print:overflow-visible">
                
                {/* Left: Editor Panel (列印時隱藏) */}
                <div className="w-1/3 bg-white border-r border-gray-200 p-6 overflow-y-auto custom-scrollbar print:hidden shadow-xl z-10">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">✏️ 編輯內容</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">客戶名稱 (抬頭)</label>
                            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-2 border rounded" placeholder="例如：萬事通國際廣告有限公司" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">日期</label>
                            <input value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full p-2 border rounded" />
                        </div>

                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <label className="block text-sm font-bold text-blue-800 mb-2">承辦事項 (業務費)</label>
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input 
                                        placeholder={`項目 ${idx + 1}`} 
                                        value={item.description}
                                        onChange={e => {
                                            const newItems = [...items];
                                            newItems[idx].description = e.target.value;
                                            setItems(newItems);
                                        }}
                                        className="flex-1 p-1.5 border rounded text-sm"
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
                                        className="w-24 p-1.5 border rounded text-sm text-right"
                                    />
                                </div>
                            ))}
                            <button onClick={() => setItems([...items, { description: '', amount: 0 }])} className="text-xs text-blue-600 font-bold hover:underline">+ 新增一行</button>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">扣繳稅款 (選填)</label>
                            <input 
                                type="number" 
                                value={taxAmount || ''} 
                                onChange={e => setTaxAmount(Number(e.target.value))} 
                                className="w-full p-2 border rounded" 
                                placeholder="如有代繳稅款請輸入金額" 
                            />
                            <p className="text-xs text-gray-400 mt-1">若輸入 0 或留空，請款單上將不顯示該行備註。</p>
                        </div>
                        
                        <div className="mt-8 p-4 bg-gray-50 rounded text-sm text-gray-600">
                            <p>💡 <b>小撇步：</b></p>
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>右側畫面即為列印結果。</li>
                                <li>請先輸入單號並按「載入」，系統會自動帶入代墊款明細。</li>
                                <li>若無抬頭圖片，請點擊上方按鈕上傳。</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right: Preview Panel (這是真正的 A4 紙) */}
                <div className="flex-1 bg-gray-500 p-8 overflow-y-auto print:p-0 print:bg-white print:overflow-visible flex justify-center">
                    
                    {/* A4 Paper Container */}
                    <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:w-full print:min-h-0 flex flex-col">
                        
                        {/* ========================================== */}
                        {/* PAGE 1: 請款單 */}
                        {/* ========================================== */}
                        <div className="p-[15mm] flex flex-col h-[297mm] relative print:h-[297mm] print:page-break-after-always">
                            
                            {/* 1. Header Image */}
                            <div className="mb-6">
                                {headerImage ? (
                                    <img src={headerImage} alt="Header" className="w-full max-h-[40mm] object-contain object-left" />
                                ) : (
                                    <div className="h-24 bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded">
                                        請上傳抬頭圖片
                                    </div>
                                )}
                            </div>

                            {/* 2. Title */}
                            <h1 className="text-3xl font-black text-center tracking-[1em] mb-8 font-serif">請款單</h1>

                            {/* 3. Client Info */}
                            <div className="mb-6 text-lg font-serif">
                                <div className="font-bold text-2xl mb-2 underline decoration-1 underline-offset-4">{clientName} &nbsp; 台照</div>
                                <div className="flex justify-between mt-4 pl-1">
                                    <span>日期：{invoiceDate}</span>
                                    <span>單號：{invoiceNo}</span>
                                </div>
                            </div>

                            {/* 4. Main Table */}
                            <table className="w-full border-collapse border border-black mb-2">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-black p-2 text-center text-lg w-[60%]">承辦事項</th>
                                        <th className="border border-black p-2 text-center text-lg">金額 (新台幣)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Service Items */}
                                    {items.map((item, i) => (
                                        item.description && (
                                            <tr key={i}>
                                                <td className="border border-black p-3 text-lg font-serif">{i + 1}. {item.description}</td>
                                                <td className="border border-black p-3 text-lg font-serif text-right font-bold tracking-wider">
                                                    ${item.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        )
                                    ))}

                                    {/* Spacer Row (填滿空間用) */}
                                    <tr className="h-12"><td className="border border-black"></td><td className="border border-black"></td></tr>

                                    {/* Subtotal: Service */}
                                    <tr>
                                        <td className="border border-black p-2 text-right text-lg font-bold pr-4">業務收入總額</td>
                                        <td className="border border-black p-2 text-right text-lg font-bold">${serviceTotal.toLocaleString()}</td>
                                    </tr>

                                    {/* Subtotal: Advances */}
                                    <tr>
                                        <td className="border border-black p-2 text-right text-lg font-bold pr-4">加：代收代付</td>
                                        <td className="border border-black p-2 text-right text-lg font-bold">${advanceTotal.toLocaleString()}</td>
                                    </tr>

                                    {/* Grand Total */}
                                    <tr>
                                        <td className="border border-black p-3 text-right text-xl font-black pr-4 bg-gray-50">應收金額合計</td>
                                        <td className="border border-black p-3 text-right text-xl font-black bg-gray-50">${grandTotal.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* 5. Tax Note */}
                            {taxAmount > 0 && (
                                <div className="text-center text-lg font-serif mb-8">
                                    (本所依法自行繳納 <span className="font-bold">${taxAmount.toLocaleString()}</span> 之扣繳稅款)
                                </div>
                            )}

                            {/* 6. Footer Notes (Fixed at bottom) */}
                            <div className="mt-auto font-serif text-base leading-relaxed">
                                <p className="mb-4 text-center text-sm text-gray-500">(本請款單未蓋本事務所章者無效)</p>
                                <div className="border-t-2 border-black pt-4">
                                    <p className="font-bold mb-1">註：</p>
                                    <p>一、請全額到帳匯入本所下列帳戶：</p>
                                    <div className="pl-8 my-1 font-bold">
                                        銀行：玉山商業銀行 (808) 仁愛分行<br/>
                                        戶名：碩業會計師事務所鄧博遠<br/>
                                        帳號：0679-940-160222
                                    </div>
                                    <p>二、請以劃線支票或匯票抬頭「碩業會計師事務所」，並加註禁止背書轉讓，惠寄本所。</p>
                                    <p>三、依營利事業所得稅查核準則第85條第2項規定，以匯款支付會計師勞務費者，可以「銀行送金單或匯款回條」(註記"支付勞務費"字樣)作為記帳憑證，免再取具會計師收受該款項之收據。</p>
                                </div>
                            </div>
                        </div>


                        {/* ========================================== */}
                        {/* PAGE 2: 代墊單 (附件) */}
                        {/* ========================================== */}
                        {advances.length > 0 && (
                             <div className="p-[15mm] flex flex-col h-[297mm] relative print:h-[297mm] print:page-break-before-always">
                                
                                {/* Header */}
                                <h1 className="text-2xl font-black text-center mb-6 font-serif underline underline-offset-4">
                                    {clientName} - 代墊費用明細
                                </h1>

                                {/* Table */}
                                <table className="w-full border-collapse border border-black text-base font-serif">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border border-black p-2 w-28">日期</th>
                                            <th className="border border-black p-2 w-24">金額</th>
                                            <th className="border border-black p-2 w-32">費用</th>
                                            <th className="border border-black p-2">說明</th>
                                            <th className="border border-black p-2 w-16 text-center">備註</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {advances.map((row, idx) => {
                                            // 轉換日期格式 2026-02-17 -> 115/02/17
                                            const [y, m, d] = row.date.split('-');
                                            const rocDate = `${Number(y)-1911}/${m}/${d}`;
                                            
                                            // 計算備註序號 (在同一個 requestId 內的順序)
                                            // 這裡我們直接顯示資料庫裡的 note (因為之前已經算好存進去了 1,2,3)
                                            // 或者是動態算也可以，這裡簡單起見直接顯示
                                            return (
                                                <tr key={row.id}>
                                                    <td className="border border-black p-2 text-center">{rocDate}</td>
                                                    <td className="border border-black p-2 text-right">{Number(row.amount).toLocaleString()}</td>
                                                    <td className="border border-black p-2 text-center">{row.category}</td>
                                                    <td className="border border-black p-2">{row.description}</td>
                                                    <td className="border border-black p-2 text-center">{row.note}</td>
                                                </tr>
                                            );
                                        })}
                                        
                                        {/* Total Row */}
                                        <tr className="bg-gray-50 font-bold">
                                            <td className="border border-black p-2 text-center">小計</td>
                                            <td className="border border-black p-2 text-right">{advanceTotal.toLocaleString()}</td>
                                            <td className="border border-black p-2" colSpan={3}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
