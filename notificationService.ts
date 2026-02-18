// src/notificationService.ts

export interface Notification {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT'; // 上班通知 或 下班申請
  fromUser: string; // 誰打卡的
  time: string;     // 打卡時間
  status: 'UNREAD' | 'PENDING' | 'APPROVED'; // 未讀 | 待審核 | 已核准
  timestamp: number;
}

const STORAGE_KEY = 'admin_notifications';

export const NotificationService = {
  // 1. 取得所有通知
  getAll: (): Notification[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // 2. 發送通知 (工讀生用)
  send: (fromUser: string, type: 'CLOCK_IN' | 'CLOCK_OUT') => {
    const notifications = NotificationService.getAll();
    const newNotif: Notification = {
      id: Date.now().toString(),
      type,
      fromUser,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      status: type === 'CLOCK_IN' ? 'UNREAD' : 'PENDING', // 上班只是通知(未讀)，下班是待審核
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...notifications, newNotif]));
  },

  // 3. 主管審核/已讀 (主管用)
  resolve: (id: string) => {
    const notifications = NotificationService.getAll();
    // 過濾掉已處理的，或者標記為已處理 (這裡我們先直接刪除已處理的，保持介面乾淨)
    const updated = notifications.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};
