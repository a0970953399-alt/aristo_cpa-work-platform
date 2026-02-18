// src/App.tsx

import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import Dashboard from './Dashboard';
import { User } from './types';
import { TaskService } from './taskService';
import { WorkCheckIn } from './WorkCheckIn'; // 引入打卡組件

const App: React.FC = () => {
  // --- 邏輯區 (State & Logic) ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 新增：控制打卡視窗的開關
  const [showWorkCheckIn, setShowWorkCheckIn] = useState(false);

  // 初始化載入
  useEffect(() => {
    const loadedUsers = TaskService.getUsers();
    setUsers(loadedUsers);

    // 模擬載入畫面
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUserUpdate = () => {
    const updatedUsers = TaskService.getUsers();
    setUsers(updatedUsers);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">載入中...</div>;
  }

  // --- 畫面區 (Render) ---
  return (
    <>
      {/* 🟢 1. 懸浮打卡按鈕 (固定在右下角) */}
      <div className="fixed bottom-6 right-6 z-[50]">
        <button 
            onClick={() => setShowWorkCheckIn(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-full font-bold shadow-2xl transition-transform hover:scale-105 flex items-center gap-2 border-2 border-white"
        >
           ⏰ 打卡系統
        </button>
      </div>

      {/* 🟢 2. 主畫面 (登入 或 儀表板) */}
      {!currentUser ? (
        <LoginScreen onLogin={handleLogin} users={users} />
      ) : (
        <Dashboard 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            users={users} 
            onUserUpdate={handleUserUpdate}
        />
      )}

      {/* 🟢 3. 打卡彈窗 (條件渲染) */}
      {showWorkCheckIn && (
        <WorkCheckIn onClose={() => setShowWorkCheckIn(false)} />
      )}
    </>
  );
};

export default App;
