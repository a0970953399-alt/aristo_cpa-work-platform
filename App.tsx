
import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { User } from './types';
import { TaskService } from './services/taskService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Users and restore session
  useEffect(() => {
    const loadedUsers = TaskService.getUsers();
    setUsers(loadedUsers);

    // Simulate loading for smooth UX
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
    </>
  );
};

export default App;
