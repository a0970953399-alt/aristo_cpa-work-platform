
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update every second (even though we don't show seconds, we need to update minute changes accurately)
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUserClick = (user: User) => {
    // Require PIN for everyone
    setSelectedUser(user);
    setPin('');
    setError('');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
        // Fallback to '1234' if for some reason data is old and missing a pin
        const userPin = selectedUser.pin || '1234';
        if (pin === userPin) {
            onLogin(selectedUser);
        } else {
            setError('密碼錯誤，請重試');
            setPin('');
        }
    }
  };

  const closePinModal = () => {
    setSelectedUser(null);
    setPin('');
    setError('');
  };

  // Helper to render avatar (Image URL or Emoji)
  const renderAvatar = (avatar: string, sizeClass: string = "w-full h-full") => {
    const isUrl = avatar.startsWith('http') || avatar.startsWith('data:');
    if (isUrl) {
      return <img src={avatar} alt="Avatar" className={`${sizeClass} object-cover`} />;
    }
    return <span className="text-6xl">{avatar}</span>;
  };

  // Format Date and Time (No seconds)
  const dateStr = currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = currentTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 select-none">
      <div className="max-w-6xl w-full">
        
        {/* Title Section (Main Focus) */}
        <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-black text-gray-800 mb-6 tracking-tight">
              誰正在使用系統？
            </h1>
            
            {/* Clock Section (Supporting Role) */}
            <div className="inline-flex items-center gap-3 px-5 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                <span className="text-gray-500 font-medium text-sm md:text-base">{dateStr}</span>
                <span className="w-px h-4 bg-gray-300"></span>
                <span className="text-blue-600 font-bold font-mono text-xl">{timeStr}</span>
            </div>
        </div>

        {/* User List - Horizontal Layout */}
        <div className="flex flex-wrap justify-center gap-10">
          {users.map((user) => (
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
          ))}
        </div>
      </div>

      {/* PIN Modal */}
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
            <p className="text-sm text-gray-400 text-center mb-6">請輸入登入密碼</p>
            
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
              
              {error && (
                <p className="text-red-500 text-sm text-center font-bold">{error}</p>
              )}

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
