import React, { useMemo, useState } from 'react';
import { TimesheetView } from './TimesheetView';
import { CheckInRecord, User, UserRole } from './types';

const testUsers: User[] = [
  {
    id: 'boss-test',
    name: '測試老闆',
    role: UserRole.BOSS,
    avatar: '闆',
    isActive: true,
  },
  {
    id: 'supervisor-test',
    name: '測試主管',
    role: UserRole.SUPERVISOR,
    avatar: '管',
    isActive: true,
  },
  {
    id: 'intern-test',
    name: '測試工讀生',
    role: UserRole.INTERN,
    avatar: '工',
    isActive: true,
  },
  {
    id: 'trainee-test',
    name: '測試實習生',
    role: UserRole.TRAINEE,
    avatar: '習',
    isActive: true,
  },
];

const testRecords: CheckInRecord[] = [
  {
    id: 'history-1',
    userId: 'intern-test',
    userName: '測試工讀生',
    date: '2026-06-28',
    startTime: '09:30',
    endTime: '17:30',
    breakHours: 1,
    totalHours: 7,
  },
  {
    id: 'paid-1',
    userId: 'intern-test',
    userName: '測試工讀生',
    date: '2026-07-03',
    startTime: '09:30',
    endTime: '17:30',
    breakHours: 1,
    totalHours: 7,
    paidAt: '2026-07-10T02:00:00.000Z',
    paidBy: '測試老闆',
    paidById: 'boss-test',
  },
  {
    id: 'unpaid-1',
    userId: 'intern-test',
    userName: '測試工讀生',
    date: '2026-07-08',
    startTime: '13:00',
    endTime: '17:30',
    breakHours: 0,
    totalHours: 4.5,
  },
  {
    id: 'unpaid-2',
    userId: 'trainee-test',
    userName: '測試實習生',
    date: '2026-07-09',
    startTime: '09:30',
    endTime: '12:00',
    breakHours: 0,
    totalHours: 2.5,
  },
  {
    id: 'unpaid-3',
    userId: 'trainee-test',
    userName: '測試實習生',
    date: '2026-07-15',
    startTime: '09:30',
    endTime: '17:30',
    breakHours: 1,
    totalHours: 7,
  },
];

const roleHint: Record<UserRole, string> = {
  [UserRole.BOSS]: '可看到結算薪資按鈕，結算後不可逆。',
  [UserRole.SUPERVISOR]: '可管理未結算工時，但不能結算薪資。',
  [UserRole.INTERN]: '只能看自己的工時與結算顏色。',
  [UserRole.TRAINEE]: '只能看自己的工時與結算顏色。',
};

export const TimesheetTestMode: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState(testUsers[0].id);
  const currentUser = useMemo(
    () => testUsers.find(user => user.id === currentUserId) || testUsers[0],
    [currentUserId]
  );

  const exitTestMode = () => {
    window.location.assign(window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="fixed left-4 right-4 top-4 z-[150] rounded-xl border border-sky-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-sky-700">本機工時測試模式</div>
            <div className="mt-1 text-xs font-medium text-gray-500">
              使用假資料與記憶體操作，不會連線或寫入正式 Firebase。
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {testUsers.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => setCurrentUserId(user.id)}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  currentUser.id === user.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {user.name}
              </button>
            ))}
            <button
              type="button"
              onClick={exitTestMode}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              離開測試
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">
          目前視角：{currentUser.name}。{roleHint[currentUser.role]}
        </div>
      </div>

      <TimesheetView
        currentUser={currentUser}
        users={testUsers}
        records={testRecords}
        onUpdate={() => {}}
        onClose={exitTestMode}
        testMode
      />
    </div>
  );
};
