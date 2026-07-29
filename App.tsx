// src/App.tsx

import React, { Suspense, lazy, useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import { User } from './types';
import { TaskService } from './taskService';
import { GoogleIntegrationService } from './googleIntegrationService';
// 1. 引入通知視窗

const Dashboard = lazy(() => import('./Dashboard'));
const AdminNotification = lazy(() => import('./AdminNotification').then(module => ({
  default: module.AdminNotification,
})));

const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
    Loading...
  </div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [googleUserUid, setGoogleUserUid] = useState<string | null>(null);

  // Initialize Users
  useEffect(() => {
    const loadedUsers = TaskService.getUsers();
    setUsers(loadedUsers);
    const unsubscribeUsers = TaskService.subscribeUsers(setUsers, error => {
      console.error('User real-time sync failed:', error);
    });
    const timer = setTimeout(() => { setIsLoading(false); }, 500);
    return () => {
      unsubscribeUsers();
      clearTimeout(timer);
    };
  }, []);

  const handleLogin = (user: User) => setCurrentUser(user);
  const handleLogout = () => {
    void GoogleIntegrationService.signOut();
    setCurrentUser(null);
  };
  const handleUserUpdate = () => setUsers(TaskService.getUsers());

  useEffect(() => {
    if (!currentUser) return;
    const latestUser = users.find(user => String(user.id) === String(currentUser.id));
    if (latestUser?.isActive === false) setCurrentUser(null);
  }, [users, currentUser]);

  useEffect(() => GoogleIntegrationService.observeAuth(user => {
    setGoogleUserUid(user?.uid || null);
  }), []);

  useEffect(() => {
    if (!googleUserUid) return;
    const linkedUser = users.find(user => user.googleUid === googleUserUid);
    if (!linkedUser) return;
    if (linkedUser.isActive === false) {
      void GoogleIntegrationService.signOut();
      setCurrentUser(null);
      return;
    }
    setCurrentUser(linkedUser);
  }, [googleUserUid, users]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      {!currentUser ? (
        <LoginScreen onLogin={handleLogin} users={users.filter(user => user.isActive !== false)} />
      ) : (
        <Suspense fallback={<AppLoading />}>
          <Dashboard
            currentUser={currentUser}
            onLogout={handleLogout}
            users={users}
            onUserUpdate={handleUserUpdate}
          />
        </Suspense>
      )}

      {/* 🟢 2. 將通知視窗掛在這裡，只有登入後才會運作 */}
      {currentUser && (
        <Suspense fallback={null}>
          <AdminNotification currentUser={currentUser} />
        </Suspense>
      )}
    </>
  );
};

export default App;
