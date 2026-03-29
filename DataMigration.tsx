import React, { useState, useRef } from 'react';
import { TaskService } from './taskService'; // ✨ 引入我們做好的 TaskService

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
                // 1. 將選取的檔案解析成 JSON 物件
                const jsonData = JSON.parse(e.target?.result as string);
                
                setStatus('正在極速寫入雲端...');
                
                // ✨ 2. 關鍵修正：直接把整箱包裹丟給 taskService 的極速批次處理函數！
                // 它會自動幫我們處理全部 15 個資料表，不會再漏掉任何東西了
                await TaskService.saveFullData(jsonData);
                
                setStatus('🎉 搬家成功！請重整');
            } catch (error) {
                console.error(error);
                setStatus('❌ 失敗，請重試');
            } finally {
                setIsImporting(false);
                // 清空 input，讓使用者如果想再點一次也能成功觸發
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex items-center gap-2 w-full">
            {/* 隱藏的檔案選擇器 */}
            <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImport} 
            />
            
            {/* 觸發按鈕 (樣式保持與下拉選單一致) */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex flex-col items-center justify-center gap-1 p-3 w-full hover:bg-indigo-50 rounded-xl text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="m9 13 3-3 3 3"/></svg>
                <span className="text-xs font-bold">{status || '匯入舊資料'}</span>
            </button>
        </div>
    );
};
