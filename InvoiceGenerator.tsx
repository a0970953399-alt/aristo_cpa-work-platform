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
    const [guiNumber, setGuiNumber] = useState('42553094'); // 扣繳統編
    const [regAddress, setRegAddress] = useState('10642台北市大安區麗水街32號12樓'); // 登記地址
    
    // 事務所抬頭圖片
    const [headerImage, setHeaderImage] = useState<string>(localStorage.getItem('shuoye_invoice_header') || '');

    // 承辦事項 (預設3行)
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: '', amount: 0 },
        { description: '', amount: 0 },
        { description: '', amount: 0 }
    ]);
    
    // 代墊款
    const [advances, setAdvances] = useState<CashRecord[]>([]);
    const [advanceTotal, setAdvanceTotal] = useState(0);
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
            
            {/* Top Toolbar (操作列 - 列印時隱藏) */}
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">🖨️ 請款單生成器 (最終復刻版)</h2>
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
                        
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="block text-sm font-bold text-gray-500 mb-1">扣繳統編</label><input value={guiNumber} onChange={e => setGuiNumber(e.target.value)} className="w-full p-2 border rounded" /></div>
                            <div><label className="block text-sm font-bold text-gray-500 mb-1">登記地址</label><input value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full p-2 border rounded" /></div>
                        </div>

                        <div><label className="block text-sm font-bold text-gray-500 mb-1">扣繳稅款 (選填)</label><input type="number" value={taxAmount || ''} onChange={e => setTaxAmount(Number(e.target.value))} className="w-full p-2 border rounded" /></div>
                    </div>
                </div>

                {/* Right: A4 Preview (預覽區) */}
                <div className="flex-1 bg-gray-500 p-8 overflow-y-auto print:p-0 print:bg-white print:overflow-visible flex justify-center">
                    
                    {/* A4 Page */}
                    <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:w-full print:min-h-0 flex flex-col box-border p-[15mm]"
                         style={{ fontFamily: '"PMingLiU", "MingLiU", "Times New Roman", serif' }}> 
                        
                        {/* ================= PAGE 1: 請款單 ================= */}
                        <div className="flex flex-col h-full relative print:page-break-after-always">
                            
                            {/* 1. Header Image */}
                            <div className="mb-2">
                                {headerImage ? (
                                    <img src={headerImage} alt="Header" className="w-full object-contain max-h-[40mm]" />
                                ) : (
                                    <div className="h-24 bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded">請上傳抬頭圖片</div>
                                )}
                            </div>

                            {/* 2. Title */}
                            <h1 className="text-4xl font-bold text-center tracking-[1.5em] mb-4" style={{ fontFamily: 'DFKai-SB, BiauKai, serif' }}>請款單</h1>

                            {/* 3. Client Info */}
                            <div className="flex justify-between items-end mb-2 text-xl">
                                <div className="font-bold underline decoration-1 underline-offset-4 tracking-wider">{clientName} &nbsp; 台照</div>
                                <div className="text-right leading-tight text-lg">
                                    <div className="tracking-widest">日期：{invoiceDate}</div>
                                    <div className="tracking-widest">單號：{invoiceNo}</div>
                                </div>
                            </div>

                            {/* 4. Main Table (Grid System) */}
                            <table className="w-full border-collapse border-[3px] border-black table-fixed text-xl">
                                <thead>
                                    <tr className="h-14 bg-gray-100">
                                        <th className="border-2 border-black p-2 text-center w-[50%] tracking-[0.8em] font-serif">承辦事項</th>
                                        <th className="border-2 border-black p-2 text-center w-[15%] font-serif">金額(新台幣)</th>
                                        <th className="border-2 border-black p-2 text-center w-[35%] font-serif"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* 服務項目 Loop */}
                                    {/* 我們固定顯示至少 4 行，以維持版面高度 */}
                                    {[...Array(Math.max(4, items.length))].map((_, i) => {
                                        const item = items[i] || { description: '', amount: 0 };
                                        return (
                                            <tr key={i} className="h-12">
                                                <td className="border border-black px-4 py-2 align-middle font-bold text-lg">
                                                    {item.description ? `${i + 1}. ${item.description}` : ''}
                                                </td>
                                                <td className="border border-black px-2 py-2 text-right align-middle font-bold text-lg tracking-wider">
                                                    {item.amount ? item.amount.toLocaleString() : ''}
                                                </td>
                                                
                                                {/* 右側文字：合併儲存格 (RowSpan) */}
                                                {i === 0 && (
                                                    <td rowSpan={Math.max(7, items.length + 3)} className="border border-black p-6 text-xl align-top leading-loose tracking-wider text-justify" style={{ verticalAlign: 'top' }}>
                                                        　  感謝　貴公司支持與愛護，請於收到本聯 7 天內支付左列款項金額於碩業會計師事務所，謝謝合作。
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}

                                    {/* 空白行填充 (Spacer) */}
                                    {[...Array(2)].map((_, i) => (
                                        <tr key={`spacer-${i}`} className="h-12"><td className="border border-black"></td><td className="border border-black"></td></tr>
                                    ))}

                                    {/* 業務收入總額 & 扣繳統編 */}
                                    <tr className="h-12">
                                        <td className="border border-black px-4 py-2 text-right font-bold tracking-widest text-lg">業務收入總額</td>
                                        <td className="border border-black px-2 py-2 text-right font-bold text-lg">{serviceTotal.toLocaleString()}</td>
                                        {/* 第三欄開始顯示資訊 */}
                                        <td className="border border-black px-4 py-2 text-left text-lg align-middle">
                                            扣繳統一編號：{guiNumber}
                                        </td>
                                    </tr>

                                    {/* 登記地址 (跨欄位或塞在左邊?) -> 依據EXCEL是在右邊 */}
                                    <tr className="h-12">
                                        <td className="border border-black px-4 py-2 text-right text-lg">
                                            {/* 這裡左邊留空，但要顯示 "登記地址" 在右邊欄位 */}
                                        </td>
                                        <td className="border border-black"></td>
                                        <td className="border border-black px-4 py-2 text-left text-lg align-top">
                                            <div>登記地址：</div>
                                            <div className="text-base">{regAddress}</div>
                                        </td>
                                    </tr>

                                    {/* 代收代付 */}
                                    <tr className="h-12">
                                        <td className="border border-black px-4 py-2 text-right font-bold tracking-widest text-lg">加：代收代付</td>
                                        <td className="border border-black px-2 py-2 text-right font-bold text-lg">{advanceTotal.toLocaleString()}</td>
                                        <td className="border border-black"></td>
                                    </tr>

                                    {/* 應收金額合計 */}
                                    <tr className="h-16">
                                        <td className="border-t-2 border-black p-2 text-right text-2xl font-bold tracking-[0.5em]">應收金額合計</td>
                                        <td className="border-t-2 border-black p-2 text-right text-2xl font-bold">{grandTotal.toLocaleString()}</td>
                                        <td className="border-t-2 border-black"></td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Tax Note */}
                            {taxAmount > 0 && (
                                <div className="text-center text-xl mb-4 mt-6 tracking-wider">
                                    (本所依法自行繳納 <span className="font-bold">${taxAmount.toLocaleString()}</span> 之扣繳稅款)
                                </div>
                            )}

                            {/* Footer (Fixed at bottom) */}
                            <div className="mt-auto">
                                <p className="mb-2 text-center text-lg">(本請款單未蓋本事務所章者無效)</p>
                                <div className="border-t-2 border-black pt-3 text-lg">
                                    <div className="flex gap-2">
                                        <span className="font-bold">註：</span>
                                        <div className="flex-1 leading-relaxed">
                                            <p className="mb-1">一、請全額到帳匯入本所下列帳戶：</p>
                                            <div className="pl-12 mb-2 font-bold tracking-wide">
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


                        {/* ================= PAGE 2: 代墊單 ================= */}
                        {advances.length > 0 && (
                             <div className="flex flex-col h-full relative print:page-break-before-always pt-[15mm]">
                                <h1 className="text-3xl font-bold text-center mb-8 underline underline-offset-8 decoration-1" style={{ fontFamily: 'DFKai-SB, BiauKai, serif' }}>{clientName} - 代墊費用明細</h1>
                                <table className="w-full border-collapse border border-black text-xl text-center table-fixed">
                                    <thead className="bg-gray-100">
                                        <tr className="h-12">
                                            <th className="border border-black p-2 w-[15%]">日期</th>
                                            <th className="border border-black p-2 w-[15%]">金額</th>
                                            <th className="border border-black p-2 w-[15%]">費用</th>
                                            <th className="border border-black p-2 w-[45%]">說明</th>
                                            <th className="border border-black p-2 w-[10%]">備註</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {advances.map((row) => {
                                            const [y, m, d] = row.date.split('-');
                                            const rocDate = `${Number(y)-1911}/${m}/${d}`;
                                            return (
                                                <tr key={row.id} className="h-12">
                                                    <td className="border border-black p-2">{rocDate}</td>
                                                    <td className="border border-black p-2 text-right">{Number(row.amount).toLocaleString()}</td>
                                                    <td className="border border-black p-2">{row.category}</td>
                                                    <td className="border border-black p-2 text-left">{row.description}</td>
                                                    <td className="border border-black p-2">{row.note}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="h-12 font-bold bg-gray-50">
                                            <td className="border border-black p-2">小計</td>
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
