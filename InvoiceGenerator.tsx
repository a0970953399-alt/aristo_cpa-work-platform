// src/InvoiceGenerator.tsx

import React, { useState, useRef, useEffect } from 'react';
import { CashRecord } from './types';
import { TaskService } from './taskService';
import { PrinterIcon, CloudArrowUpIcon } from './Icons';

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
    const [guiNumber, setGuiNumber] = useState('42553094'); // 預設扣繳統編
    const [regAddress, setRegAddress] = useState('10642台北市大安區麗水街32號12樓'); // 預設登記地址
    
    // 事務所抬頭圖片
    const [headerImage, setHeaderImage] = useState<string>(localStorage.getItem('shuoye_invoice_header') || '');

    // 承辦事項 (預設給空行)
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: '', amount: 0 },
        { description: '', amount: 0 },
        { description: '', amount: 0 },
        { description: '', amount: 0 }
    ]);
    
    // 代墊款
    const [advances, setAdvances] = useState<CashRecord[]>([]);
    const [advanceTotal, setAdvanceTotal] = useState(0);

    // 稅額
    const [taxAmount, setTaxAmount] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
        // 依照日期舊->新排序
        found.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setAdvances(found);
        setAdvanceTotal(found.reduce((sum, r) => sum + Number(r.amount), 0));
    };

    const serviceTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const grandTotal = serviceTotal + advanceTotal;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const result = evt.target?.result as string;
                setHeaderImage(result);
                localStorage.setItem('shuoye_invoice_header', result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePrint = () => window.print();

    // --- Render ---
    return (
        <div className="fixed inset-0 bg-gray-100 z-[200] flex flex-col animate-fade-in overflow-hidden font-sans">
            
            {/* Top Toolbar (操作列) */}
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">🖨️ 請款單生成器 (EXCEL 復刻版)</h2>
                    <div className="h-6 w-px bg-gray-600"></div>
                    <div className="flex gap-2">
                        <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="單號 (115R001)" className="text-black px-3 py-1 rounded font-bold outline-none w-40" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                        <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded font-bold">載入</button>
                    </div>
                </div>
                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold text-sm"><CloudArrowUpIcon className="w-5 h-5"/> {headerImage ? '更換抬頭' : '上傳抬頭'}</button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold shadow-lg"><PrinterIcon className="w-5 h-5"/> 列印</button>
                    <button onClick={onClose} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold ml-2">關閉</button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden print:block print:h-auto print:overflow-visible">
                
                {/* Left: Editor (編輯區) */}
                <div className="w-1/3 bg-white border-r border-gray-200 p-6 overflow-y-auto custom-scrollbar print:hidden shadow-xl z-10">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">✏️ 編輯內容</h3>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-500 mb-1">客戶名稱</label><input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-2 border rounded" /></div>
                        <div><label className="block text-sm font-bold text-gray-500 mb-1">日期</label><input value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full p-2 border rounded" /></div>
                        
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <label className="block text-sm font-bold text-blue-800 mb-2">承辦事項 (業務費)</label>
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input placeholder={`項目 ${idx + 1}`} value={item.description} onChange={e => { const newItems = [...items]; newItems[idx].description = e.target.value; setItems(newItems); }} className="flex-1 p-1.5 border rounded text-sm" />
                                    <input type="number" placeholder="$" value={item.amount || ''} onChange={e => { const newItems = [...items]; newItems[idx].amount = Number(e.target.value); setItems(newItems); }} className="w-24 p-1.5 border rounded text-sm text-right" />
                                </div>
                            ))}
                            <button onClick={() => setItems([...items, { description: '', amount: 0 }])} className="text-xs text-blue-600 font-bold hover:underline">+ 新增一行</button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-bold text-gray-500 mb-1">扣繳統編</label><input value={guiNumber} onChange={e => setGuiNumber(e.target.value)} className="w-full p-2 border rounded" /></div>
                            <div><label className="block text-sm font-bold text-gray-500 mb-1">登記地址</label><input value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full p-2 border rounded" /></div>
                        </div>

                        <div><label className="block text-sm font-bold text-gray-500 mb-1">扣繳稅款 (選填)</label><input type="number" value={taxAmount || ''} onChange={e => setTaxAmount(Number(e.target.value))} className="w-full p-2 border rounded" /></div>
                    </div>
                </div>

                {/* Right: A4 Preview (預覽區 - 這裡就是重點！) */}
                <div className="flex-1 bg-gray-500 p-8 overflow-y-auto print:p-0 print:bg-white print:overflow-visible flex justify-center">
                    
                    {/* A4 Container */}
                    <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:w-full print:min-h-0 flex flex-col"
                         style={{ fontFamily: '"PMingLiU", "MingLiU", "Times New Roman", serif' }}> 
                        
                        {/* ================= PAGE 1: 請款單 ================= */}
                        <div className="p-[15mm] flex flex-col h-[297mm] relative print:h-[297mm] print:page-break-after-always">
                            
                            {/* Header Image (Full Width) */}
                            <div className="mb-4">
                                {headerImage ? (
                                    <img src={headerImage} alt="Header" className="w-full object-contain" />
                                ) : (
                                    <div className="h-24 bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded">請上傳抬頭圖片</div>
                                )}
                            </div>

                            {/* Title (字距拉大) */}
                            <h1 className="text-4xl font-bold text-center tracking-[1.2em] mb-4" style={{ fontFamily: 'DFKai-SB, BiauKai, serif' }}>請款單</h1>

                            {/* Info Row */}
                            <div className="flex justify-between items-end mb-1 text-lg">
                                <div className="text-2xl font-bold underline decoration-1 underline-offset-4 mb-1 tracking-wider">{clientName} &nbsp; 台照</div>
                                <div className="text-right leading-tight">
                                    <div className="tracking-widest">日期：{invoiceDate}</div>
                                    <div className="tracking-widest">單號：{invoiceNo}</div>
                                </div>
                            </div>

                            {/* Main Table (邊框加粗 border-2, 字距調整) */}
                            <table className="w-full border-collapse border-2 border-black mb-1 table-fixed">
                                <thead>
                                    <tr className="bg-gray-100 h-14">
                                        <th className="border-2 border-black p-2 text-center text-xl w-[48%] tracking-[0.5em]">承辦事項</th>
                                        <th className="border-2 border-black p-2 text-center text-xl w-[17%]">金額(新台幣)</th>
                                        {/* 第三欄標題其實是空的，或是連在一起的 */}
                                        <th className="border-2 border-black p-2 text-center text-xl w-[35%]"></th> 
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Items & Payment Terms */}
                                    {/* 我們預設顯示 4 行，如果不夠會自動補空白行，保持格式固定 */}
                                    {[...Array(Math.max(4, items.length))].map((_, i) => {
                                        const item = items[i] || { description: '', amount: 0 };
                                        return (
                                            <tr key={i} className="h-12">
                                                <td className="border border-black p-2 text-lg align-middle pl-4 font-bold">
                                                    {item.description ? `${i + 1}. ${item.description}` : ''}
                                                </td>
                                                <td className="border border-black p-2 text-lg text-right align-middle font-bold tracking-wider pr-4">
                                                    {item.amount ? item.amount.toLocaleString(undefined, {minimumFractionDigits: 1}) : ''}
                                                </td>
                                                
                                                {/* 右側文字：合併儲存格，只在第一列渲染 */}
                                                {i === 0 && (
                                                    <td rowSpan={Math.max(7, items.length + 3)} className="border-2 border-black p-6 text-xl align-top leading-loose tracking-wider text-justify" style={{ verticalAlign: 'top' }}>
                                                        　  感謝　貴公司支持與愛護，請於收到本聯 7 天內支付左列款項金額於碩業會計師事務所，謝謝合作。
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}

                                    {/* 空白行填充 (確保高度一致) */}
                                    {[...Array(2)].map((_, i) => (
                                        <tr key={`spacer-${i}`} className="h-12"><td className="border border-black"></td><td className="border border-black"></td></tr>
                                    ))}

                                    {/* Totals Section */}
                                    <tr className="h-12">
                                        <td className="border border-black p-2 text-right text-lg font-bold pr-4 tracking-widest">業務收入總額</td>
                                        <td className="border border-black p-2 text-right text-lg font-bold pr-4">{serviceTotal.toLocaleString(undefined, {minimumFractionDigits: 1})}</td>
                                    </tr>
                                    
                                    {/* 隱藏資訊列 (扣繳統編 & 地址) - 這是 EXCEL 裡藏在總額旁邊的 */}
                                    <tr className="h-12">
                                        <td className="border border-black p-2 text-right text-lg font-bold pr-4 flex justify-between items-center relative">
                                            {/* 這裡用絕對定位或 Flex 把地址資訊塞進去，模仿 EXCEL 排版 */}
                                            <span className="absolute left-2 text-sm font-normal">扣繳統一編號：{guiNumber}</span>
                                            <span></span>
                                        </td>
                                        <td className="border border-black p-2 text-right text-lg font-bold"></td> 
                                        {/* 注意：這裡不顯示金額，金額已經在上面了，這一行在 EXCEL 主要是為了右邊的文字空間，但在 HTML table 比較難完全一樣，我們這裡做視覺調整 */}
                                    </tr>
                                     <tr className="h-8">
                                        <td className="border border-black p-1 text-right text-lg font-bold pr-4 flex justify-between items-center relative">
                                            <span className="absolute left-2 text-sm font-normal">登記地址：{regAddress}</span>
                                            <span className="tracking-widest ml-auto">加：代收代付</span>
                                        </td>
                                        <td className="border border-black p-2 text-right text-lg font-bold pr-4">{advanceTotal.toLocaleString(undefined, {minimumFractionDigits: 1})}</td>
                                    </tr>

                                    {/* Grand Total */}
                                    <tr className="h-14">
                                        <td className="border-2 border-black p-2 text-right text-2xl font-bold pr-4 tracking-[0.5em]">應收金額合計</td>
                                        <td className="border-2 border-black p-2 text-right text-2xl font-bold pr-4">{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 1})}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Tax Note */}
                            {taxAmount > 0 && (
                                <div className="text-center text-xl mb-6 mt-4 tracking-wider">
                                    (本所依法自行繳納 <span className="font-bold">${taxAmount.toLocaleString()}</span> 之扣繳稅款)
                                </div>
                            )}

                            {/* Footer Notes (完全依照 EXCEL 格式) */}
                            <div className="mt-auto text-base">
                                <p className="mb-2 text-center text-lg">(本請款單未蓋本事務所章者無效)</p>
                                <div className="border-t-2 border-black pt-3">
                                    <div className="flex gap-1">
                                        <span className="font-bold text-lg">註：</span>
                                        <div className="flex-1 text-lg leading-relaxed">
                                            <p className="mb-1">一、請全額到帳匯入本所下列帳戶：</p>
                                            <div className="pl-10 mb-2 font-bold tracking-wide">
                                                銀行：玉山商業銀行 (808) 仁愛分行<br/>
                                                戶名：碩業會計師事務所鄧博遠<br/>
                                                帳號：0679-940-160222
                                            </div>
                                            <p className="mb-1 text-justify">二、請以劃線支票或匯票抬頭「碩業會計師事務所」，並加註禁止背書轉讓，惠寄本所。</p>
                                            <p className="text-justify">三、依營利事業所得稅查核準則第 85 條第 2 項規定，以匯款支付會計師勞務費者，可以「銀行送金單或匯款回條」(註記 "支付勞務費" 字樣) 作為記帳憑證，免再取具會計師收受該款項之收據。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* ================= PAGE 2: 代墊單 (附件) ================= */}
                        {advances.length > 0 && (
                             <div className="p-[15mm] flex flex-col h-[297mm] relative print:h-[297mm] print:page-break-before-always">
                                <div className="text-xl mb-2 font-bold">公司名稱 : {clientName}</div>
                                <table className="w-full border-collapse border border-black text-lg text-center">
                                    <thead>
                                        <tr>
                                            <th className="border border-black p-2 w-32">日期</th>
                                            <th className="border border-black p-2 w-28">金額</th>
                                            <th className="border border-black p-2 w-32">費用</th>
                                            <th className="border border-black p-2">說明</th>
                                            <th className="border border-black p-2 w-20">備註</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {advances.map((row) => {
                                            const [y, m, d] = row.date.split('-');
                                            const rocDate = `${Number(y)-1911}/${m}/${d}`;
                                            return (
                                                <tr key={row.id}>
                                                    <td className="border border-black p-2">{rocDate}</td>
                                                    <td className="border border-black p-2 text-right">{Number(row.amount).toLocaleString(undefined, {minimumFractionDigits: 1})}</td>
                                                    <td className="border border-black p-2">{row.category}</td>
                                                    <td className="border border-black p-2 text-left">{row.description}</td>
                                                    <td className="border border-black p-2">{row.note}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="font-bold">
                                            <td className="border border-black p-2">小計</td>
                                            <td className="border border-black p-2 text-right">{advanceTotal.toLocaleString(undefined, {minimumFractionDigits: 1})}</td>
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
