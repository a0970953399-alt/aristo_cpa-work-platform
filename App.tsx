// src/App.tsx

import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import Dashboard from './Dashboard';
import { User } from './types';
import { TaskService } from './taskService';
// 1. 引入通知視窗
import { AdminNotification } from './AdminNotification'; 

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Users
  useEffect(() => {
    const loadedUsers = TaskService.getUsers();
    setUsers(loadedUsers);
    const timer = setTimeout(() => { setIsLoading(false); }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (user: User) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);
  const handleUserUpdate = () => setUsers(TaskService.getUsers());

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
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

      {/* 🟢 2. 將通知視窗掛在這裡，只有登入後才會運作 */}
      {currentUser && <AdminNotification currentUser={currentUser} />}
    </>
  );
};

export default App;
