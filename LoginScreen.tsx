
import React, { useState, useEffect } from 'react';
import type { User } from './types';
import { GoogleIntegrationService } from './googleIntegrationService';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setPin('');
    setError('');
    setNotice('');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
        const userPin = selectedUser.pin || '1234';
        if (pin === userPin) {
            await GoogleIntegrationService.signOut();
            onLogin(selectedUser);
        } else {
            setError('密碼錯誤，請重試');
            setPin('');
        }
    }
  };

  const handleGoogleLogin = async () => {
    if (!selectedUser) return;
    setIsGoogleLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await GoogleIntegrationService.requestAccountBinding(selectedUser.id);
      if (result.status === 'linked' && result.profile) {
        onLogin(result.profile);
        return;
      }
      setNotice('綁定申請已送出，主管確認後會自動完成登入。');
    } catch (loginError) {
      const code = typeof loginError === 'object' && loginError && 'code' in loginError ? String(loginError.code) : '';
      if (code.includes('popup-closed-by-user')) {
        setError('Google 登入視窗已關閉，請重新操作。');
      } else if (code.includes('already-exists')) {
        setError('這個 Gmail 已綁定其他人員，請聯絡主管。');
      } else if (code.includes('failed-precondition')) {
        setError('此人員已綁定其他 Gmail，請聯絡主管。');
      } else {
        setError('Google 登入或綁定失敗，請稍後再試。');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const closePinModal = () => {
    setSelectedUser(null);
    setPin('');
    setError('');
    setNotice('');
  };

  const renderAvatar = (avatar: string, sizeClass: string = "w-full h-full") => {
    const isUrl = avatar.startsWith('http') || avatar.startsWith('data:');
    if (isUrl) {
      return <img src={avatar} alt="Avatar" className={`${sizeClass} object-cover`} />;
    }
    return <span className="text-6xl">{avatar}</span>;
  };

  const dateStr = currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = currentTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });


  const renderUserCard = (user: User) => (
    <div
      key={user.id}
      onClick={() => handleUserClick(user)}
      className="group cursor-pointer flex flex-col items-center"
    >
      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:border-blue-500 group-hover:shadow-2xl">
        {renderAvatar(user.avatar)}
      </div>
      <span className="mt-5 text-xl font-bold text-gray-600 group-hover:text-blue-600 transition-colors">
        {user.name}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 select-none">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-black text-gray-800 mb-6 tracking-tight">
              誰正在使用系統？
            </h1>
            <div className="inline-flex items-center gap-3 px-5 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                <span className="text-gray-500 font-medium text-sm md:text-base">{dateStr}</span>
                <span className="w-px h-4 bg-gray-300"></span>
                <span className="text-blue-600 font-bold font-mono text-xl">{timeStr}</span>
            </div>
        </div>
        <div className="flex flex-nowrap justify-center gap-10">
          {users.map(renderUserCard)}
        </div>
      </div>
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full relative animate-scale-in">
            <button 
              onClick={closePinModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"
            >
              ✕
            </button>
            <div className="flex justify-center mb-6">
               <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                 {renderAvatar(selectedUser.avatar)}
               </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-1 text-gray-800">
              {selectedUser.name}
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6">使用自己的 Google 帳號登入</p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors border border-gray-300 shadow-sm disabled:opacity-50"
            >
              {isGoogleLoading ? '正在連接 Google...' : selectedUser.googleUid ? '使用 Google 帳號登入' : '使用 Google 帳號並申請綁定'}
            </button>
            {notice && <p className="mt-3 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-center font-bold">{notice}</p>}
            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-gray-200"></span>
              <span className="text-xs font-bold text-gray-400">過渡期間登入</span>
              <span className="h-px flex-1 bg-gray-200"></span>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 text-center text-3xl tracking-[0.5em] font-bold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-200"
                placeholder="••••"
                autoFocus
                maxLength={4}
              />
              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
              >
                進入系統
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default LoginScreen;
