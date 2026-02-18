// src/AdminNotification.tsx

import React, { useState, useEffect } from 'react';
import { User } from './types';
import { NotificationService, Notification } from './notificationService';

interface Props {
  currentUser: User;
}

export const AdminNotification: React.FC<Props> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 只有主管 (周愉) 或 管理員才需要執行這個檢查
  // 假設主管的角色是 'admin' 或是名字叫 '周愉'
  const isSupervisor = currentUser.role === 'admin' || currentUser.name === '周愉';

  useEffect(() => {
    if (!isSupervisor) return;

    // 每 2 秒檢查一次有沒有新通知 (模擬即時感)
    const interval = setInterval(() => {
      const all = NotificationService.getAll();
      setNotifications(all);
    }, 2000);

    return () => clearInterval(interval);
  }, [isSupervisor]);

  const handleAction = (id: string) => {
    NotificationService.resolve(id);
    // 畫面也立刻更新
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!isSupervisor || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80">
      {notifications.map(notif => (
        <div 
          key={notif.id}
          className={`p-4 rounded-lg shadow-2xl border-l-4 animate-slide-up flex flex-col gap-2 
            ${notif.type === 'CLOCK_IN' ? 'bg-white border-green-500' : 'bg-yellow-50 border-yellow-500'}`}
        >
          {/* 標題區 */}
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-gray-800">
                {notif.type === 'CLOCK_IN' ? '🟢 上班通知' : '⚠️ 下班審核'}
              </h4>
              <p className="text-sm text-gray-600">
                <span className="font-bold text-blue-600">{notif.fromUser}</span> 
                {notif.type === 'CLOCK_IN' ? ' 已經上班' : ' 申請下班'}
              </p>
              <p className="text-xs text-gray-400 mt-1">打卡時間: {notif.time}</p>
            </div>
          </div>

          {/* 按鈕區 */}
          <div className="flex justify-end mt-1">
            {notif.type === 'CLOCK_IN' ? (
              <button 
                onClick={() => handleAction(notif.id)}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                知道了
              </button>
            ) : (
              <button 
                onClick={() => handleAction(notif.id)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded font-bold shadow transition-all"
              >
                ✅ 同意下班
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
