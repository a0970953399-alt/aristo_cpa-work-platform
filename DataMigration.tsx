import React, { useState } from 'react';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export const DataMigration = () => {
    const [status, setStatus] = useState('等待匯入...');

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus('讀取檔案中...');
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                
                // 1. 搬運任務 (Tasks)
                if (data.tasks) {
                    setStatus(`正在搬運 ${data.tasks.length} 筆任務...`);
                    for (const task of data.tasks) {
                        // ⚠️ 關鍵：使用原本的 ID，這樣資料關聯才不會斷掉
                        await setDoc(doc(db, "tasks", String(task.id)), task);
                    }
                }

                // 2. 搬運客戶 (Clients)
                if (data.clients) {
                    setStatus(`正在搬運 ${data.clients.length} 筆客戶資料...`);
                    for (const client of data.clients) {
                        await setDoc(doc(db, "clients", String(client.id)), client);
                    }
                }

                // 3. 搬運打卡紀錄 (CheckIns)
                if (data.checkIns) {
                    setStatus(`正在搬運打卡紀錄...`);
                    for (const checkIn of data.checkIns) {
                        await setDoc(doc(db, "checkIns", String(checkIn.id)), checkIn);
                    }
                }

                // 你可以依照需求把 events, mailRecords 等等比照辦理加進來...

                setStatus('🎉 資料搬家大成功！請重整網頁。');
            } catch (error) {
                console.error(error);
                setStatus('❌ 匯入失敗，請檢查檔案格式');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ padding: '20px', border: '2px dashed red', margin: '20px' }}>
            <h3>⚠️ 一次性資料搬家工具 (遷移完成後請刪除此區塊)</h3>
            <input type="file" accept=".json" onChange={handleImport} />
            <p style={{ fontWeight: 'bold', color: 'blue' }}>{status}</p>
        </div>
    );
};
