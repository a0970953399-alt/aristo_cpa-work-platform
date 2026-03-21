import React, { useState, useRef } from 'react';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export const DataMigration = () => {
    const [status, setStatus] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setStatus('讀取中...');
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                
                if (data.tasks) {
                    setStatus(`搬運 ${data.tasks.length} 筆任務...`);
                    for (const task of data.tasks) await setDoc(doc(db, "tasks", String(task.id)), task);
                }
                if (data.clients) {
                    setStatus(`搬運 ${data.clients.length} 筆客戶...`);
                    for (const client of data.clients) await setDoc(doc(db, "clients", String(client.id)), client);
                }
                if (data.checkIns) {
                    for (const checkIn of data.checkIns) await setDoc(doc(db, "checkIns", String(checkIn.id)), checkIn);
                }
                // (如果有其他如 events, messages 也可以加在這裡)

                setStatus('🎉 搬家成功！請重整');
            } catch (error) {
                console.error(error);
                setStatus('❌ 失敗，請重試');
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex items-center gap-2">
            {/* 隱藏的檔案選擇器 */}
            <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImport} 
            />
            
            {/* 觸發按鈕 */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors disabled:bg-gray-400"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                匯入舊資料
            </button>

            {/* 狀態文字 */}
            {status && (
                <span className={`text-sm font-bold ${status.includes('成功') ? 'text-green-600' : 'text-blue-600'}`}>
                    {status}
                </span>
            )}
        </div>
    );
};
