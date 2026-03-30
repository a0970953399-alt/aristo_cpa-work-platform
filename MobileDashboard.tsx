// src/MobileDashboard.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CalendarView } from './CalendarView';
import { MessageBoard } from './MessageBoard';
import { TimesheetView } from './TimesheetView';
import { TaskService } from './taskService';
import { NotificationService } from './notificationService';

import {
  User, ClientTask, UserRole, TaskStatusType,
  CalendarEvent, CheckInRecord, MailRecord, CashRecord, Message
} from './types';

import {
  ClockIcon, CalendarIcon, DocumentTextIcon, Squares2X2Icon,
  LightningIcon, ChatBubbleIcon
} from './Icons';

import { DEFAULT_YEAR } from './constants';

// Inline icons not exported from Icons.tsx
const PaperAirplaneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || 'w-6 h-6'}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
);
const LogoutIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || 'w-6 h-6'}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg className="w-4 h-4 text-gray-400 ml-auto flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const FolderIcon2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || 'w-5 h-5'}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
  </svg>
);

type MobileTab = 'checkin' | 'tasks' | 'calendar' | 'dispatch' | 'more';

interface MobileDashboardProps {
  currentUser: User;
  onLogout: () => void;
  users: User[];
  onUserUpdate: () => void;
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({ currentUser, onLogout, users }) => {
  // --- Navigation ---
  const [activeTab, setActiveTab] = useState<MobileTab>('checkin');

  // --- Time ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Data ---
  const [currentYear] = useState<string>(DEFAULT_YEAR);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mailRecords, setMailRecords] = useState<MailRecord[]>([]);
  const [cashRecords, setCashRecords] = useState<CashRecord[]>([]);

  // --- Connection ---
  const [dbConnected, setDbConnected] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);

  // --- UI ---
  const [isLoading, setIsLoading] = useState(false);
  const [deductBreak, setDeductBreak] = useState(true);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);

  // --- Calendar ---
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- Dispatch ---
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  const [modalAssigneeId, setModalAssigneeId] = useState('');
  const [modalNote, setModalNote] = useState('');

  // --- Task note edit ---
  const [isNoteEditModalOpen, setIsNoteEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ClientTask | null>(null);
  const [editingNote, setEditingNote] = useState('');

  // --- More modals ---
  const [isMessageBoardOpen, setIsMessageBoardOpen] = useState(false);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);

  const pollingRef = useRef<number | null>(null);

  // --- Computed ---
  const isBoss = currentUser.role === UserRole.BOSS;
  const isSupervisor = currentUser.role === UserRole.SUPERVISOR;
  const isPrivileged = isSupervisor || isBoss;

  const timeStr = currentTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = currentTime.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' });

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getTodayString();

  const myTodayRecord = checkInRecords.find(r => {
    if (!r || !r.userId) return false;
    return (
      String(r.userId) === String(currentUser.id) &&
      (r.date || '').replace(/\//g, '-') === todayStr &&
      (!r.endTime || r.endTime === '')
    );
  });
  const isWorking = !!myTodayRecord;

  const myTasks = useMemo(() => {
    const todayDateStr = new Date().toDateString();
    return tasks.filter(t => {
      if (t.year !== currentYear) return false;
      if (!isPrivileged && t.assigneeId !== currentUser.id) return false;
      if ((t.status === 'done' || t.isNA) && t.lastUpdatedAt) {
        if (new Date(t.lastUpdatedAt).toDateString() !== todayDateStr) return false;
      } else if ((t.status === 'done' || t.isNA) && !t.lastUpdatedAt) {
        return false;
      }
      return true;
    });
  }, [tasks, currentYear, currentUser.id, isPrivileged]);

  // --- Data loading ---
  const loadData = async () => {
    if (!TaskService.isConnected()) return;
    try {
      const [tData, eData, checkInData, messageData, mailData, cashData] = await Promise.all([
        TaskService.fetchTasks(),
        TaskService.fetchEvents(),
        TaskService.fetchCheckIns(),
        TaskService.fetchMessages(),
        TaskService.fetchMailRecords(),
        TaskService.fetchCashRecords(),
      ]);
      setTasks(prev => JSON.stringify(prev) !== JSON.stringify(tData) ? tData : prev);
      setEvents(prev => JSON.stringify(prev) !== JSON.stringify(eData) ? eData : prev);
      setCheckInRecords(prev => JSON.stringify(prev) !== JSON.stringify(checkInData) ? checkInData : prev);
      setMessages(prev => JSON.stringify(prev) !== JSON.stringify(messageData) ? messageData : prev);
      setMailRecords(prev => JSON.stringify(prev) !== JSON.stringify(mailData) ? mailData : prev);
      setCashRecords(prev => JSON.stringify(prev) !== JSON.stringify(cashData) ? cashData : prev);
    } catch {
      setDbConnected(false);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = window.setInterval(() => { /* polling stub */ }, 300000);
  };
  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const handleConnectDB = async () => {
    setIsLoading(true);
    const success = await TaskService.connectDatabase();
    if (success) { setDbConnected(true); setPermissionNeeded(false); await loadData(); startPolling(); }
    else { setDbConnected(false); setPermissionNeeded(true); }
    setIsLoading(false);
  };

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    const init = async () => {
      const status = await TaskService.restoreConnection(false);
      if (status === 'connected') { setDbConnected(true); setPermissionNeeded(false); await loadData(); startPolling(); }
      else if (status === 'permission_needed') { setDbConnected(false); setPermissionNeeded(true); }
    };
    init();
    return () => { stopPolling(); clearInterval(clockTimer); };
  }, []);

  // --- Check-in handlers ---
  const handleCheckIn = async () => {
    if (!confirm(`現在時間 ${timeStr}，確定上班打卡？`)) return;
    setIsLoading(true);
    const newRecord: CheckInRecord = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      date: todayStr,
      startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      breakHours: 0,
      totalHours: 0,
    };
    await TaskService.addCheckIn(newRecord);
    NotificationService.send(currentUser.name, 'CLOCK_IN');
    await loadData();
    setIsLoading(false);
    alert('✅ 上班打卡成功！');
  };

  const handleCheckOut = async () => {
    if (!myTodayRecord) return;
    const endTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const [sh, sm] = myTodayRecord.startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const minutes = (eh * 60 + em) - (sh * 60 + sm);
    const breakH = deductBreak ? 1 : 0;
    const finalHours = Math.max(0, Math.floor((minutes / 60 - breakH) * 2) / 2);
    const updatedRecord: CheckInRecord = { ...myTodayRecord, endTime, breakHours: breakH, totalHours: finalHours };
    await TaskService.updateCheckIn(updatedRecord);
    NotificationService.send(currentUser.name, 'CLOCK_OUT');
    setIsCheckOutModalOpen(false);
    await loadData();
    alert(`⏳ 下班申請已送出！\n今日工時：${finalHours} 小時`);
  };

  // --- Task handlers ---
  const handleUpdateStatus = async (task: ClientTask, newStatus: TaskStatusType) => {
    stopPolling();
    const completionDate = newStatus === 'done' ? `${currentTime.getMonth() + 1}/${currentTime.getDate()}` : '';
    try {
      const updated = await TaskService.updateTaskStatus(task.id, newStatus, currentUser.name, completionDate);
      setTasks(updated);
    } catch { alert('更新失敗'); }
    finally { startPolling(); }
  };

  const handleNoteSubmit = async () => {
    if (!editingTask) return;
    setIsLoading(true);
    try {
      const updated = await TaskService.updateTaskNote(editingTask.id, editingNote, currentUser.name);
      setTasks(updated);
      setIsNoteEditModalOpen(false);
      setEditingTask(null);
    } catch { alert('失敗'); }
    finally { setIsLoading(false); startPolling(); }
  };

  // --- Dispatch handler ---
  const handleMiscSubmit = async () => {
    if (!modalAssigneeId || !modalNote.trim()) return;
    setIsLoading(true);
    const assignee = users.find(u => u.id === modalAssigneeId);
    const newTask: ClientTask = {
      id: Date.now().toString(),
      clientId: 'MISC',
      clientName: '⚡ 行政交辦',
      category: 'MISC_TASK',
      workItem: '臨時事項',
      year: currentYear,
      status: 'todo',
      isNA: false,
      isMisc: true,
      assigneeId: modalAssigneeId,
      assigneeName: assignee?.name || '未知',
      note: modalNote,
      lastUpdatedBy: currentUser.name,
      lastUpdatedAt: new Date().toISOString(),
    };
    try {
      const updated = await TaskService.addTask(newTask);
      setTasks(updated);
      setIsMiscModalOpen(false);
      setModalAssigneeId('');
      setModalNote('');
    } catch { alert('失敗'); }
    finally { setIsLoading(false); startPolling(); }
  };

  // --- Status helpers ---
  const getStatusStyle = (status: TaskStatusType, isNA?: boolean) => {
    if (isNA) return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'N/A' };
    if (status === 'done') return { bg: 'bg-green-100', text: 'text-green-700', label: '完成' };
    if (status === 'in_progress') return { bg: 'bg-blue-100', text: 'text-blue-700', label: '進行中' };
    return { bg: 'bg-gray-100', text: 'text-gray-500', label: '待辦' };
  };

  // --- DB not connected banner ---
  const DbBanner = () => (
    <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
      <p className="font-bold text-yellow-800">尚未連結資料庫</p>
      {permissionNeeded ? (
        <button
          onClick={handleConnectDB}
          disabled={isLoading}
          className="mt-3 flex items-center gap-2 mx-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm"
        >
          <FolderIcon2 className="w-4 h-4" />
          點此連結資料庫
        </button>
      ) : (
        <p className="text-sm text-yellow-600 mt-1">請先在桌面版完成資料庫授權</p>
      )}
    </div>
  );

  // ===== TAB RENDERS =====

  const renderCheckIn = () => (
    <div className="p-4 space-y-4">
      {/* Clock card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-5xl font-bold font-mono text-gray-800 tracking-tight">{timeStr}</p>
        <p className="text-sm text-gray-400 mt-2">{dateStr}</p>

        {!isBoss && (
          <div className="mt-6 space-y-3">
            {isWorking ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-700 font-bold">工作中</span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">上班時間 {myTodayRecord?.startTime}</p>
                </div>
                <button
                  onClick={() => setIsCheckOutModalOpen(true)}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 active:scale-95 transition-all"
                >
                  下班打卡
                </button>
              </>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
              >
                上班打卡
              </button>
            )}
          </div>
        )}

        {isBoss && (
          <p className="mt-4 text-sm text-gray-400">Boss 帳號不需打卡</p>
        )}
      </div>

      {/* Today's attendance (for privileged users) */}
      {isPrivileged && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            今日打卡狀況
            <span className="text-xs text-gray-400 font-normal ml-auto">
              {checkInRecords.filter(r => (r.date || '').replace(/\//g, '-') === todayStr).length} 人
            </span>
          </h3>
          {checkInRecords.filter(r => (r.date || '').replace(/\//g, '-') === todayStr).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">今日尚無打卡紀錄</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {checkInRecords
                .filter(r => (r.date || '').replace(/\//g, '-') === todayStr)
                .map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${!r.endTime ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="font-medium text-gray-700">{r.userName}</span>
                    </div>
                    <div className="text-sm text-right">
                      <span className="text-gray-600 font-mono">{r.startTime}</span>
                      {r.endTime && <span className="text-gray-400 font-mono"> → {r.endTime}</span>}
                      {r.totalHours > 0 && (
                        <span className="ml-2 text-blue-600 font-bold">{r.totalHours}h</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {!dbConnected && <DbBanner />}
    </div>
  );

  const renderTasks = () => {
    const inProgressTasks = myTasks.filter(t => t.status === 'in_progress');
    const todoTasks = myTasks.filter(t => t.status === 'todo' && !t.isNA);
    const doneTasks = myTasks.filter(t => t.status === 'done' || t.isNA);

    const TaskItem = ({ task }: { task: ClientTask }) => {
      const s = getStatusStyle(task.status, task.isNA);
      return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {task.isMisc && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">⚡ 行政</span>
                )}
                <span className="font-semibold text-gray-800 truncate">{task.clientName}</span>
              </div>
              <p className="text-sm text-gray-500">{task.workItem}</p>
              {isPrivileged && task.assigneeName && (
                <p className="text-xs text-blue-500 mt-1">負責：{task.assigneeName}</p>
              )}
              {task.note && (
                <p className="text-xs text-orange-600 mt-1.5 bg-orange-50 px-2 py-1 rounded-lg">備注：{task.note}</p>
              )}
            </div>
            <span className={`flex-none text-xs px-2 py-1 rounded-full font-bold ${s.bg} ${s.text}`}>
              {s.label}
            </span>
          </div>

          {!isPrivileged && task.status !== 'done' && !task.isNA && (
            <div className="flex gap-2 mt-3">
              {task.status === 'todo' && (
                <button
                  onClick={() => handleUpdateStatus(task, 'in_progress')}
                  className="flex-1 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg font-bold active:scale-95 transition-transform"
                >
                  開始處理
                </button>
              )}
              {task.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus(task, 'done')}
                  className="flex-1 py-2 text-sm bg-green-50 text-green-600 rounded-lg font-bold active:scale-95 transition-transform"
                >
                  標記完成
                </button>
              )}
              <button
                onClick={() => {
                  stopPolling();
                  setEditingTask(task);
                  setEditingNote(task.note || '');
                  setIsNoteEditModalOpen(true);
                }}
                className="py-2 px-3 text-sm bg-gray-50 text-gray-500 rounded-lg active:scale-95 transition-transform"
              >
                備注
              </button>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="p-4 space-y-4">
        {!dbConnected && <DbBanner />}

        {inProgressTasks.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              進行中 ({inProgressTasks.length})
            </h3>
            <div className="space-y-2">{inProgressTasks.map(t => <TaskItem key={t.id} task={t} />)}</div>
          </section>
        )}

        {todoTasks.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-gray-500 mb-2">待辦 ({todoTasks.length})</h3>
            <div className="space-y-2">{todoTasks.map(t => <TaskItem key={t.id} task={t} />)}</div>
          </section>
        )}

        {doneTasks.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-green-600 mb-2">今日完成 ({doneTasks.length})</h3>
            <div className="space-y-2 opacity-60">{doneTasks.map(t => <TaskItem key={t.id} task={t} />)}</div>
          </section>
        )}

        {myTasks.length === 0 && dbConnected && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">🎉</p>
            <p className="font-bold text-gray-500">今日沒有待辦任務</p>
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => (
    <div className="flex-1">
      {!dbConnected ? (
        <DbBanner />
      ) : (
        <CalendarView
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          events={events}
          currentUser={currentUser}
          isSupervisor={isPrivileged}
          onDayClick={() => {}}
          onEventClick={() => {}}
        />
      )}
    </div>
  );

  const renderDispatch = () => {
    const pendingMiscTasks = tasks.filter(t => t.isMisc && t.year === currentYear && t.status !== 'done' && !t.isNA);
    const myMiscTasks = tasks.filter(t => t.isMisc && t.year === currentYear && t.assigneeId === currentUser.id);
    const displayTasks = isPrivileged ? pendingMiscTasks : myMiscTasks;

    return (
      <div className="p-4 space-y-4">
        {isPrivileged && (
          <button
            onClick={() => { if (dbConnected) setIsMiscModalOpen(true); }}
            disabled={!dbConnected}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            新增臨時交辦
          </button>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 mb-3">
            {isPrivileged
              ? `未完成交辦 (${pendingMiscTasks.length})`
              : `我的交辦事項 (${myMiscTasks.length})`
            }
          </h3>

          {displayTasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">目前沒有交辦事項</p>
          ) : (
            <div className="space-y-3">
              {displayTasks.map(task => {
                const s = getStatusStyle(task.status, task.isNA);
                return (
                  <div key={task.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {isPrivileged && task.assigneeName && (
                          <p className="text-xs text-blue-600 font-bold mb-1">→ {task.assigneeName}</p>
                        )}
                        <p className="text-sm text-gray-700 break-words">{task.note}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {task.lastUpdatedAt ? new Date(task.lastUpdatedAt).toLocaleDateString('zh-TW') : ''}
                        </p>
                      </div>
                      <span className={`flex-none text-xs px-2 py-1 rounded-full font-bold ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </div>
                    {!isPrivileged && task.status !== 'done' && !task.isNA && (
                      <div className="flex gap-2 mt-2">
                        {task.status === 'todo' && (
                          <button onClick={() => handleUpdateStatus(task, 'in_progress')} className="flex-1 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg font-bold">開始</button>
                        )}
                        <button onClick={() => handleUpdateStatus(task, 'done')} className="flex-1 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg font-bold">完成</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!dbConnected && <DbBanner />}
      </div>
    );
  };

  const renderMore = () => {
    const simplifiedModules = [
      { label: '收發信件', count: mailRecords.length, unit: '筆紀錄' },
      { label: '零用金/代墊款', count: cashRecords.length, unit: '筆紀錄' },
      { label: '股票進銷存', count: null, unit: null },
      { label: '薪資計算', count: null, unit: null },
    ];

    return (
      <div className="p-4 space-y-3">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setIsMessageBoardOpen(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ChatBubbleIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium text-gray-700">留言板</span>
            <ChevronRightIcon />
          </button>

          <button
            onClick={() => setIsTimesheetOpen(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-medium text-gray-700">工時記錄</span>
            <ChevronRightIcon />
          </button>
        </div>

        {/* Simplified (desktop-only) modules */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">完整功能請使用桌面版</p>
          </div>
          {simplifiedModules.map((m, i) => (
            <div
              key={m.label}
              className={`flex items-center gap-4 p-4 ${i < simplifiedModules.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <p className="font-medium text-gray-400 text-sm">{m.label}</p>
                {m.count !== null && (
                  <p className="text-xs text-gray-300">共 {m.count} {m.unit}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <LogoutIcon className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-bold text-red-500">登出系統</span>
        </button>
      </div>
    );
  };

  // --- Bottom nav config ---
  const NAV_TABS: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'checkin', label: '打卡', icon: <ClockIcon className="w-6 h-6" /> },
    { id: 'tasks', label: '任務', icon: <DocumentTextIcon className="w-6 h-6" /> },
    { id: 'calendar', label: '行事曆', icon: <CalendarIcon className="w-6 h-6" /> },
    { id: 'dispatch', label: '派工', icon: <LightningIcon className="w-6 h-6" /> },
    { id: 'more', label: '更多', icon: <Squares2X2Icon className="w-6 h-6" /> },
  ];

  // Unread task badge
  const pendingTaskCount = myTasks.filter(t => t.status === 'todo' && !t.isNA).length;
  const pendingDispatchCount = isPrivileged
    ? tasks.filter(t => t.isMisc && t.year === currentYear && t.status !== 'done' && !t.isNA).length
    : tasks.filter(t => t.isMisc && t.year === currentYear && t.assigneeId === currentUser.id && t.status === 'todo').length;

  const getBadge = (tabId: MobileTab) => {
    if (tabId === 'tasks' && pendingTaskCount > 0) return pendingTaskCount;
    if (tabId === 'dispatch' && pendingDispatchCount > 0) return pendingDispatchCount;
    return 0;
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col select-none overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-none bg-white shadow-sm z-50 border-b border-gray-200">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/app-aristo mountain.png" alt="Logo" className="w-8 h-8 object-contain" />
            <h1 className="font-bold text-base text-gray-800 tracking-tight">碩業工作平台</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {!isBoss && (
                <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              )}
              <span className="text-sm font-bold text-gray-600 font-mono">{timeStr}</span>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'checkin' && renderCheckIn()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'dispatch' && renderDispatch()}
        {activeTab === 'more' && renderMore()}
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex">
          {NAV_TABS.map(tab => {
            const badge = getBadge(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {tab.icon}
                <span className="text-xs font-medium">{tab.label}</span>
                {badge > 0 && (
                  <span className="absolute top-1.5 right-1/4 translate-x-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Check-out Modal ── */}
      {isCheckOutModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-end justify-center animate-fade-in">
          <div className="bg-white rounded-t-3xl shadow-2xl p-6 w-full">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">準備下班了嗎？</h3>
            <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center justify-between">
              <span className="text-gray-700 font-medium">扣除午休 (1小時)</span>
              <input
                type="checkbox"
                checked={deductBreak}
                onChange={e => setDeductBreak(e.target.checked)}
                className="w-6 h-6 text-blue-600 rounded accent-blue-600"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsCheckOutModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">取消</button>
              <button onClick={handleCheckOut} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">確認下班</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Misc Dispatch Modal ── */}
      {isMiscModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-end justify-center animate-fade-in">
          <div className="bg-white rounded-t-3xl shadow-2xl p-6 w-full">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-xl font-bold text-gray-800 mb-4">新增臨時交辦</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">指派給</label>
                <select
                  value={modalAssigneeId}
                  onChange={e => setModalAssigneeId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  <option value="">請選擇人員</option>
                  {users.filter(u => u.role === UserRole.INTERN).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">工作內容</label>
                <textarea
                  value={modalNote}
                  onChange={e => setModalNote(e.target.value)}
                  placeholder="輸入工作內容..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsMiscModalOpen(false); setModalAssigneeId(''); setModalNote(''); }}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
                >
                  取消
                </button>
                <button
                  onClick={handleMiscSubmit}
                  disabled={!modalAssigneeId || !modalNote.trim() || isLoading}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 disabled:opacity-40"
                >
                  確認派工
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Note Edit Modal ── */}
      {isNoteEditModalOpen && editingTask && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-end justify-center animate-fade-in">
          <div className="bg-white rounded-t-3xl shadow-2xl p-6 w-full">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-xl font-bold text-gray-800 mb-1">編輯備注</h3>
            <p className="text-sm text-gray-400 mb-4">{editingTask.clientName} · {editingTask.workItem}</p>
            <textarea
              value={editingNote}
              onChange={e => setEditingNote(e.target.value)}
              rows={4}
              placeholder="輸入備注..."
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setIsNoteEditModalOpen(false); setEditingTask(null); startPolling(); }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
              >
                取消
              </button>
              <button
                onClick={handleNoteSubmit}
                disabled={isLoading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 disabled:opacity-40"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Message Board ── */}
      {isMessageBoardOpen && (
        <MessageBoard
          currentUser={currentUser}
          messages={messages}
          onUpdate={loadData}
          onClose={() => setIsMessageBoardOpen(false)}
        />
      )}

      {/* ── Timesheet ── */}
      {isTimesheetOpen && (
        <TimesheetView
          currentUser={currentUser}
          users={users}
          records={checkInRecords}
          onUpdate={loadData}
          onClose={() => setIsTimesheetOpen(false)}
        />
      )}
    </div>
  );
};

export default MobileDashboard;
