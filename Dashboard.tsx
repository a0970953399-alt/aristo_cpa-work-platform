// src/Dashboard.tsx

import { ClientMasterView } from './ClientMasterView'; 
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InvoiceGenerator } from './InvoiceGenerator';
import { MessageBoard } from './MessageBoard';
import { TimesheetView } from './TimesheetView'; 
import { ClientDrawer } from './ClientDrawer';
import { MatrixView } from './MatrixView';
import { CalendarView } from './CalendarView';
import { ListView } from './ListView';
import { MailLogView } from './MailLogView';
import { CashLogView } from './CashLogView';
import { TaskService } from './taskService';
import { NotificationService } from './notificationService';
import { StockInventoryView } from './StockInventoryView';

// Types & Icons
import { 
    User, TabCategory, ClientTask, UserRole, TaskStatusType, Client, Instruction, 
    HistoryEntry, ClientProfile, CalendarEvent, EventType, 
    CheckInRecord, MailRecord, CashRecord, Message 
} from './types';

import { 
    RefreshSvg, FolderIcon, LightningIcon, TrashIcon, UserGroupIcon, TableCellsIcon, 
    ReturnIcon, BellAlertIcon, GearIcon, CameraIcon, LockClosedIcon, CalendarIcon, 
    LightBulbIcon, ClockIcon, DocumentTextIcon, Squares2X2Icon, FunnelIcon, ChatBubbleIcon 
} from './Icons';

// ✨ 新增：用於編輯懶人包的鉛筆圖示
const PencilIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

import { 
    COLUMN_CONFIG, ACCOUNTING_SUB_ITEMS, TAX_SUB_ITEMS, 
    YEAR_OPTIONS, DEFAULT_YEAR, INSTRUCTIONS 
} from './constants';

// ✨ 新增：用於「臨時交辦」的紙飛機圖示
const PaperAirplaneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
);

// ✨ 新增：用於「登出」的標準離開圖示
const LogoutIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);

const TABS = ['帳務處理', '營業稅申報', '所得扣繳', '年度申報', '送件', '收發信件', '零用金/代墊款', '股票進銷存'];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const totalMinutes = i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
  users: User[];
  onUserUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout, users, onUserUpdate }) => {
  // --- Global State ---
  const [currentYear, setCurrentYear] = useState<string>(DEFAULT_YEAR);
  const [activeTab, setActiveTab] = useState<TabCategory>(TabCategory.ACCOUNTING);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]); // ✨ 新增：動態懶人包資料
  const [isLoading, setIsLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- UI State ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDailyReminderOpen, setIsDailyReminderOpen] = useState(false);
  const [showMyList, setShowMyList] = useState(false);
  const [viewTargetId, setViewTargetId] = useState<string>('ALL');
  const [showOverview, setShowOverview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false); // ✨ 新增：懶人包編輯視窗狀態
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNoteEditModalOpen, setIsNoteEditModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isUserDeleteModalOpen, setIsUserDeleteModalOpen] = useState(false);
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [isMessageBoardOpen, setIsMessageBoardOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isEventDeleteModalOpen, setIsEventDeleteModalOpen] = useState(false);
  const [isClientMasterOpen, setIsClientMasterOpen] = useState(false);

  // --- Data State ---
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>('reminder');
  const [newEventOwnerId, setNewEventOwnerId] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [dailyReminders, setDailyReminders] = useState<CalendarEvent[]>([]);
  const [dontShowDailyAgain, setDontShowDailyAgain] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<Instruction | null>(null);
  const [editingInstruction, setEditingInstruction] = useState<Partial<Instruction> | null>(null); // ✨ 新增：正在編輯的懶人包
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<Client | null>(null);
  const [selectedCell, setSelectedCell] = useState<{client: Client, column: string, task?: ClientTask} | null>(null);
  const [modalAssigneeId, setModalAssigneeId] = useState<string>('');
  const [modalNote, setModalNote] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<ClientTask | null>(null);
  const [editingTask, setEditingTask] = useState<ClientTask | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserPin, setNewUserPin] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mailRecords, setMailRecords] = useState<MailRecord[]>([]);
  const [cashRecords, setCashRecords] = useState<CashRecord[]>([]);
  const [deductBreak, setDeductBreak] = useState(true);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const instructionFileInputRef = useRef<HTMLInputElement>(null); // ✨ 新增：懶人包圖片上傳的 Ref
  const prevCompletedColsRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<number | null>(null);
  const appMenuRef = useRef<HTMLDivElement>(null);

  // --- Computed ---
  const dateStr = currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = currentTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  const isSupervisor = currentUser.role === UserRole.SUPERVISOR;
  const activeUser = users.find(u => u.id === currentUser.id) || currentUser;

  // -----------------------------------------------------------
  const getTodayString = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };
  
  const todayStr = getTodayString();

  const myTodayRecord = checkInRecords.find(r => {
      if (!r || !r.userId) return false;
      const sameUser = String(r.userId) === String(currentUser.id);
      const recordDate = (r.date || '').replace(/\//g, '-'); 
      const sameDate = recordDate === todayStr;
      const isActive = !r.endTime || r.endTime === '';
      return sameUser && sameDate && isActive;
  });

  const isWorking = !!myTodayRecord;
  // -----------------------------------------------------------

  // --- Effects ---
  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (appMenuRef.current && !appMenuRef.current.contains(event.target as Node)) {
              setIsAppMenuOpen(false);
          }
      }
      if (isAppMenuOpen) document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAppMenuOpen]);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    const initConnection = async () => {
      const status = await TaskService.restoreConnection(false);
      if (status === 'connected') { setDbConnected(true); setPermissionNeeded(false); await loadData(); startPolling(); }
      else if (status === 'permission_needed') { setDbConnected(false); setPermissionNeeded(true); }
      else { setDbConnected(false); setPermissionNeeded(false); }
    };
    initConnection();
    return () => { stopPolling(); clearInterval(clockTimer); };
  }, []);

  useEffect(() => { if (events.length > 0) checkDailyReminders(); }, [events]);

  const checkDailyReminders = () => {
      const today = getTodayString();
      const storageKey = `shuoye_dismissed_reminder_${today}_${currentUser.id}`;
      if (localStorage.getItem(storageKey) === 'true') return;
      
      const reminders = events.filter(e => {
          const eventDate = e.date.replace(/\//g, '-');
          if (eventDate !== today) return false;
          if (e.type === 'shift' && e.ownerId === currentUser.id) return true;
          if (e.type === 'reminder' && e.ownerId === currentUser.id) return true;
          return false;
      });
      if (reminders.length > 0) { setDailyReminders(reminders); setIsDailyReminderOpen(true); }
  };

  const handleDismissDaily = () => {
      if (dontShowDailyAgain) {
          const today = getTodayString();
          const storageKey = `shuoye_dismissed_reminder_${today}_${currentUser.id}`;
          localStorage.setItem(storageKey, 'true');
      }
      setIsDailyReminderOpen(false);
  };

  useEffect(() => {
    let targetSubItems: string[] = [];
    if (activeTab === TabCategory.ACCOUNTING) targetSubItems = ACCOUNTING_SUB_ITEMS;
    else if (activeTab === TabCategory.TAX) targetSubItems = TAX_SUB_ITEMS;
    if (targetSubItems.length === 0) return;
    
    const columns = COLUMN_CONFIG[activeTab] || [];
    const currentCompletedCols = new Set<string>();
    
    columns.forEach(col => {
        const isColumnComplete = clients.every(client => {
            return targetSubItems.every(subItem => {
                 const task = tasks.find(t => !t.isMisc && t.clientId === client.id && t.category === activeTab && t.workItem === `${col}-${subItem}` && t.year === currentYear);
                 return task && (task.status === 'done' || task.isNA);
            });
        });
        if (isColumnComplete) currentCompletedCols.add(col);
    });

    const colsToAutoCollapse: string[] = [];
    currentCompletedCols.forEach(col => { if (!prevCompletedColsRef.current.has(col)) colsToAutoCollapse.push(col); });
    prevCompletedColsRef.current = currentCompletedCols;
    
    if (colsToAutoCollapse.length > 0) {
        setCollapsedColumns(prev => { const newSet = new Set(prev); colsToAutoCollapse.forEach(c => newSet.add(c)); return newSet; });
    }
  }, [tasks, activeTab, currentYear, clients]);

  const startPolling = () => { 
      if (pollingRef.current) return; 
      pollingRef.current = window.setInterval(async () => { 
          if (TaskService.isConnected() && !hasOpenModal()) { 
              try { await loadData(); } catch (e) { } 
          } 
      }, 3000); 
  };
  
  const hasOpenModal = () => {
      return isAssignModalOpen || isDateModalOpen || isNoteEditModalOpen || isMiscModalOpen || 
             isDeleteModalOpen || isGalleryOpen || selectedClientForDrawer || isUserModalOpen || 
             isUserDeleteModalOpen || isEventModalOpen || isCalendarOpen || isEventDeleteModalOpen || 
             isCheckOutModalOpen || isTimesheetOpen || isClientMasterOpen || isInstructionModalOpen;
  };

  const stopPolling = () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };

  const loadData = async () => { 
      if (!TaskService.isConnected()) return; 
      try { 
          const tData = await TaskService.fetchTasks(); 
          const eData = await TaskService.fetchEvents(); 
          const cData = await TaskService.fetchClients();
          const checkInData = await TaskService.fetchCheckIns();
          const messageData = await TaskService.fetchMessages();
          const mailData = await TaskService.fetchMailRecords();
          const cashData = await TaskService.fetchCashRecords();
          const instData = await TaskService.fetchInstructions(); // ✨ 新增：讀取懶人包
          
          setTasks(prev => JSON.stringify(prev) !== JSON.stringify(tData) ? tData : prev); 
          setEvents(prev => JSON.stringify(prev) !== JSON.stringify(eData) ? eData : prev); 
          setClients(prev => JSON.stringify(prev) !== JSON.stringify(cData) ? cData : prev);
          setCheckInRecords(prev => JSON.stringify(prev) !== JSON.stringify(checkInData) ? checkInData : prev);
          setMessages(prev => JSON.stringify(prev) !== JSON.stringify(messageData) ? messageData : prev);
          setMailRecords(prev => JSON.stringify(prev) !== JSON.stringify(mailData) ? mailData : prev);
          setCashRecords(prev => JSON.stringify(prev) !== JSON.stringify(cashData) ? cashData : prev);
          setInstructions(prev => JSON.stringify(prev) !== JSON.stringify(instData) ? instData : prev); // ✨ 新增：更新懶人包狀態
      } catch (error) { 
          setDbConnected(false); setPermissionNeeded(true); 
      } 
  };

  // 🔌 連線邏輯
  const handleConnectDB = async () => {
      setIsLoading(true);
      const success = await TaskService.connectDatabase(); 
      if (success) { 
          setDbConnected(true); 
          setPermissionNeeded(false); 
          await loadData(); 
          startPolling(); 
      } else { 
          setDbConnected(false); 
          setPermissionNeeded(true); 
      }
      setIsLoading(false);
      setIsAppMenuOpen(false);
  };

  // --- Handlers ---
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
          totalHours: 0
      };
      
      await TaskService.addCheckIn(newRecord);
      NotificationService.send(currentUser.name, 'CLOCK_IN');

      await loadData();
      setIsLoading(false);
      alert("✅ 上班打卡成功！");
  };

  const handleCheckOut = async () => {
      if (!myTodayRecord) return;
      const endTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const [sh, sm] = myTodayRecord.startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const minutes = (eh * 60 + em) - (sh * 60 + sm);
      
      const breakH = deductBreak ? 1 : 0;
      let hours = minutes / 60 - breakH;
      if (hours < 0) hours = 0;
      const finalHours = Math.floor(hours * 2) / 2;

      const updatedRecord: CheckInRecord = {
          ...myTodayRecord,
          endTime: endTime,
          breakHours: breakH,
          totalHours: finalHours
      };
      await TaskService.updateCheckIn(updatedRecord);
      
      NotificationService.send(currentUser.name, 'CLOCK_OUT');
      
      setIsCheckOutModalOpen(false);
      await loadData();
      alert(`⏳ 下班申請已送出！\n今日工時：${finalHours} 小時`);
  };

  const handleUpdateStatus = async (task: ClientTask, newStatus: TaskStatusType) => { stopPolling(); const completionDateStr = newStatus === 'done' ? `${currentTime.getMonth() + 1}/${currentTime.getDate()}` : ''; try { const updatedList = await TaskService.updateTaskStatus(task.id, newStatus, currentUser.name, completionDateStr); setTasks(updatedList); } catch (error) { alert("失敗"); } finally { startPolling(); } };
  const openInternNoteEdit = (task: ClientTask) => { setEditingTask(task); setModalNote(task.note); setIsNoteEditModalOpen(true); stopPolling(); };
  const handleInternNoteSubmit = async () => { if (!editingTask) return; setIsLoading(true); try { const updatedList = await TaskService.updateTaskNote(editingTask.id, modalNote, currentUser.name); setTasks(updatedList); setIsNoteEditModalOpen(false); setEditingTask(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleOpenMiscModal = () => { if(!dbConnected) return; setModalAssigneeId(''); setModalNote(''); setIsMiscModalOpen(true); stopPolling(); }
  const handleMiscSubmit = async () => { if (!modalAssigneeId || !modalNote.trim()) return; setIsLoading(true); const assignee = users.find(u => u.id === modalAssigneeId); const newTask: ClientTask = { id: Date.now().toString(), clientId: 'MISC', clientName: '⚡ 行政交辦', category: 'MISC_TASK', workItem: '臨時事項', year: currentYear, status: 'todo', isNA: false, isMisc: true, assigneeId: modalAssigneeId, assigneeName: assignee?.name || '未知', note: modalNote, lastUpdatedBy: currentUser.name, lastUpdatedAt: new Date().toISOString() }; try { const updatedList = await TaskService.addTask(newTask); setTasks(updatedList); setIsMiscModalOpen(false); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } }

// 修正後的「精簡版」工作匯報功能
  const handleGenerateDailyReport = () => {
    const myName = currentUser?.name || '未知使用者'; 
    const today = new Date().toLocaleDateString('zh-TW');

    // 1. 過濾屬於自己的今日事項
    const myTodayTasks = tasks.filter(task => {
      if (task.assigneeId !== currentUser?.id) return false;
      if (!task.lastUpdatedAt) return false;
      const taskDate = new Date(task.lastUpdatedAt).toLocaleDateString('zh-TW');
      return taskDate === today;
    });

    // 2. 依照狀態拆分
    const completedTasks = myTodayTasks.filter(task => task.status === 'done' || task.isNA);
    const inProgressTasks = myTodayTasks.filter(task => task.status === 'in_progress');
    const pendingTasks = myTodayTasks.filter(task => task.status === 'todo');

    // 3. 雙重分組 (客戶 + 類別)，並優化類別顯示名稱
    const groupedCompleted = completedTasks.reduce((groups, task) => {
      const client = task.clientName || '事務所行政';
      // 如果是 MISC_TASK 則顯示「行政交辦」，否則顯示原本的 category 名稱
      const categoryLabel = task.category === 'MISC_TASK' ? '行政交辦' : (task.category || '一般事項');
      const groupKey = `📌 ${client} [${categoryLabel}]`; 
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(task);
      return groups;
    }, {} as Record<string, ClientTask[]>);

    // 4. 開始組裝文字
    let reportText = `📅 日期：${today}\n👤 負責人：${myName}\n\n`;

    // --- 已完成區塊 (只在有資料時顯示) ---
    if (completedTasks.length > 0) {
      reportText += `✅ 【今日已完成事項】\n`;
      Object.entries(groupedCompleted).forEach(([groupHeader, clientTasks]) => {
        reportText += `${groupHeader}：\n`;
        clientTasks.forEach(task => {
          // ✨ 移除原本的 [帳] / [行] 標籤，直接顯示工作內容與備註
          reportText += `   - ${task.workItem}${task.note ? ` (${task.note})` : ''}\n`;
        });
      });
      reportText += `\n`;
    }

    // --- 進行中區塊 (不出現「無」，沒資料就隱藏) ---
    if (inProgressTasks.length > 0) {
      reportText += `🔄 【進行中事項】\n`;
      inProgressTasks.forEach(task => {
        const clientPrefix = task.clientName ? `[${task.clientName}] ` : '';
        reportText += `   - ${clientPrefix}${task.workItem}${task.note ? ` (${task.note})` : ''}\n`;
      });
      reportText += `\n`;
    }

    // --- 待辦區塊 (不出現「無」，沒資料就隱藏) ---
    if (pendingTasks.length > 0) {
      reportText += `📝 【待辦事項】\n`;
      pendingTasks.forEach(task => {
        const clientPrefix = task.clientName ? `[${task.clientName}] ` : '';
        reportText += `   - ${clientPrefix}${task.workItem}\n`;
      });
    }

    // 5. 複製功能
    if (myTodayTasks.length === 0) {
      alert("今天尚未有任何工作紀錄。");
      return;
    }

    navigator.clipboard.writeText(reportText).then(() => {
      alert("工作匯報已成功複製！");
    });
  };
    
  // Calendar
  const handleDayClick = (dateStr: string) => { if (!dbConnected) return; setSelectedCalendarDate(dateStr); setNewEventTitle(''); setNewEventDesc(''); setNewEventType('reminder'); setNewEventOwnerId(currentUser.id); setShiftStart('09:00'); setShiftEnd('18:00'); setSelectedEvent(null); setIsEventModalOpen(true); stopPolling(); };
  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => { e.stopPropagation(); if (!dbConnected) return; setSelectedCalendarDate(event.date); setNewEventTitle(event.title); setNewEventDesc(event.description || ''); setNewEventType(event.type); setNewEventOwnerId(event.ownerId); if (event.type === 'shift' && event.title.includes(' - ')) { const parts = event.title.split(' - '); if (parts.length === 2) { setShiftStart(parts[0]); setShiftEnd(parts[1]); } else { setShiftStart('09:00'); setShiftEnd('18:00'); } } else { setShiftStart('09:00'); setShiftEnd('18:00'); } setSelectedEvent(event); setIsEventModalOpen(true); stopPolling(); };
  const handleEventSubmit = async () => { let finalTitle = newEventTitle; if (newEventType === 'shift') { finalTitle = `${shiftStart} - ${shiftEnd}`; } else { if (!newEventTitle.trim()) { alert("請輸入標題"); return; } } const owner = users.find(u => u.id === newEventOwnerId); if (newEventType === 'reminder' && newEventOwnerId !== currentUser.id) { alert("提醒事項只能設定給自己"); return; } setIsLoading(true); try { const eventPayload: CalendarEvent = { id: selectedEvent ? selectedEvent.id : Date.now().toString(), date: selectedCalendarDate, type: newEventType, title: finalTitle, description: newEventDesc, ownerId: newEventOwnerId, ownerName: owner?.name || '未知', creatorId: selectedEvent ? selectedEvent.creatorId : currentUser.id, createdAt: selectedEvent ? selectedEvent.createdAt : new Date().toISOString() }; let updatedList; if (selectedEvent) { updatedList = await TaskService.updateEvent(eventPayload); } else { updatedList = await TaskService.addEvent(eventPayload); } setEvents(updatedList); setIsEventModalOpen(false); setSelectedEvent(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleEventDelete = () => { if (!selectedEvent) return; setIsEventDeleteModalOpen(true); };
  const handleConfirmEventDelete = async () => { if (!selectedEvent) return; setIsLoading(true); try { const updatedList = await TaskService.deleteEvent(selectedEvent.id); setEvents(updatedList); setIsEventDeleteModalOpen(false); setIsEventModalOpen(false); setSelectedEvent(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };

  // ✨ 懶人包 (Instructions) 專用 Handlers
  const handleInstructionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      const formData = new FormData(e.currentTarget);
      
      const newInst: Instruction = {
          id: editingInstruction?.id || Date.now().toString(),
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          category: formData.get('category') as string,
          imageUrl: editingInstruction?.imageUrl || ''
      };

      try {
          if (editingInstruction && editingInstruction.id) {
              await TaskService.updateInstruction(newInst);
          } else {
              await TaskService.addInstruction(newInst);
          }
          await loadData();
          setIsInstructionModalOpen(false);
          setEditingInstruction(null);
      } catch (error) {
          alert("儲存失敗，請重試");
      } finally {
          setIsLoading(false);
      }
  };

  const handleInstructionDelete = async (id: string) => {
      if (!confirm("確定要刪除這個懶人包嗎？此動作無法復原。")) return;
      setIsLoading(true);
      try {
          await TaskService.deleteInstruction(id);
          await loadData();
          setSelectedInstruction(null);
      } catch (error) {
          alert("刪除失敗");
      } finally {
          setIsLoading(false);
      }
  };

  const handleInstructionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) { // 限制 2MB
              alert("圖片大小請小於 2MB，以免拖慢系統效能！");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingInstruction(prev => ({
                  ...prev,
                  imageUrl: reader.result as string
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  // User Mgmt
  const handleAddUser = () => { if (!newUserName.trim()) return; const newUser: User = { id: Date.now().toString(), name: newUserName.trim(), role: UserRole.INTERN, avatar: `https://api.dicebear.com/9.x/micah/svg?seed=${newUserName}&backgroundColor=c0aede&radius=50`, pin: '1234' }; const currentUsers = TaskService.getUsers(); const updatedUsers = [...currentUsers, newUser]; TaskService.saveUsers(updatedUsers); onUserUpdate(); setNewUserName(''); };
  const handleDeleteUserClick = (user: User) => { setUserToDelete(user); setIsUserDeleteModalOpen(true); };
  const handleConfirmDeleteUser = () => { if (!userToDelete) return; const currentUsers = TaskService.getUsers(); const updatedUsers = currentUsers.filter(u => u.id !== userToDelete.id); TaskService.saveUsers(updatedUsers); onUserUpdate(); setIsUserDeleteModalOpen(false); setUserToDelete(null); };
  const handleAvatarClick = (userId: string) => { setEditingUserId(userId); if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && editingUserId) { if (file.size > 500 * 1024) { alert("圖片大小請小於 500KB"); return; } const reader = new FileReader(); reader.onloadend = () => { const base64String = reader.result as string; const currentUsers = TaskService.getUsers(); const updatedUsers = currentUsers.map(u => u.id === editingUserId ? { ...u, avatar: base64String } : u ); TaskService.saveUsers(updatedUsers); onUserUpdate(); setEditingUserId(null); }; reader.readAsDataURL(file); } };
  const handleUpdatePin = () => { if (!newUserPin.trim()) return; if (newUserPin.length !== 4 || isNaN(Number(newUserPin))) { alert("請輸入 4 位數字密碼"); return; } const currentUsers = TaskService.getUsers(); const updatedUsers = currentUsers.map(u => u.id === currentUser.id ? { ...u, pin: newUserPin.trim() } : u ); TaskService.saveUsers(updatedUsers); onUserUpdate(); setNewUserPin(''); alert("密碼已更新"); };

  // Matrix Logic
  const handleCellClick = (client: Client, column: string, task?: ClientTask) => { if (!dbConnected) return; setSelectedCell({ client, column, task }); setModalNote(task?.note || ''); setModalAssigneeId(task?.assigneeId || ''); const canModify = isSupervisor; if (task && (task.status === 'done' || task.isNA)) { setModalDate(task.completionDate || ''); setIsDateModalOpen(true); stopPolling(); return; } if (task) { if (!canModify) { setModalDate(''); setIsDateModalOpen(true); stopPolling(); return; } setIsAssignModalOpen(true); stopPolling(); } else { if (canModify) { setIsAssignModalOpen(true); stopPolling(); } } };
  const handleClientNameClick = (client: Client) => { if (!dbConnected) return; setSelectedClientForDrawer(client); stopPolling(); };
  const handleSaveProfile = (profile: ClientProfile) => { TaskService.saveClientProfile(profile); };
  const handleAssignSubmit = async (isNA: boolean = false) => { if (!selectedCell) return; setIsLoading(true); const assignee = users.find(u => u.id === modalAssigneeId); if (!isNA && !modalAssigneeId) { alert("請選擇負責人"); setIsLoading(false); return; } const newTask: ClientTask = { id: selectedCell.task?.id || Date.now().toString(), clientId: selectedCell.client.id, clientName: selectedCell.client.name, category: activeTab, workItem: selectedCell.column, year: currentYear, status: isNA ? 'done' : 'todo', isNA: isNA, assigneeId: isNA ? '' : modalAssigneeId, assigneeName: isNA ? '' : assignee?.name.substring(assignee.name.length - 2) || '', note: modalNote, lastUpdatedBy: currentUser.name, lastUpdatedAt: new Date().toISOString(), history: selectedCell.task?.history || [] }; try { const updatedList = await TaskService.addTask(newTask); setTasks(updatedList); setIsAssignModalOpen(false); setSelectedCell(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleRevertStatus = async () => { if (!selectedCell || !selectedCell.task) return; setIsLoading(true); try { if (selectedCell.task.isNA) { await TaskService.deleteTask(selectedCell.task.id); } else { await TaskService.updateTaskStatus(selectedCell.task.id, 'in_progress', currentUser.name); } const tData = await TaskService.fetchTasks(); setTasks(tData); setIsDateModalOpen(false); setSelectedCell(null); } catch(e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleConfirmDelete = async () => { if(!taskToDelete) return; setIsLoading(true); try { const updatedList = await TaskService.deleteTask(taskToDelete.id); setTasks(updatedList); setIsDeleteModalOpen(false); setTaskToDelete(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  
  const toggleColumn = (col: string) => { const newSet = new Set(collapsedColumns); if (newSet.has(col)) newSet.delete(col); else newSet.add(col); setCollapsedColumns(newSet); };

  // --- Render ---

  return (
    <div className="h-screen bg-gray-50 flex flex-col select-none overflow-hidden">
      {/* 1. App Header */}
      <header className="flex-none bg-white shadow-sm z-50 h-20 border-b border-gray-200">
        <div className="w-full px-6 h-full flex items-center justify-between">
          
          {/* Left: Logo & Year */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <img src="/app-aristo mountain.png" alt="Logo" className="w-10 h-10 object-contain"/>
                <h1 className="font-bold text-2xl text-gray-800 hidden md:block tracking-tight">碩業工作平台</h1>
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <select value={currentYear} onChange={(e) => { setCurrentYear(e.target.value); stopPolling(); setTimeout(() => { loadData(); startPolling(); }, 100); }} className="bg-transparent text-lg font-bold text-gray-700 focus:outline-none px-3 py-1 cursor-pointer">
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>民國{y}年</option>)}
                </select>
            </div>
          </div>

            {/* Right: Actions */}
          <div className="flex items-center gap-3">
            
            {/* 時間顯示 */}
            <div className="flex flex-col items-end mr-2 leading-tight">
                <span className="text-xs text-gray-400 font-medium">{dateStr}</span>
                <span className="text-base font-bold text-gray-600 font-mono">{timeStr}</span>
            </div>
            
            {/* 1. 臨時交辦 (純圖示：紙飛機) */}
            {isSupervisor && dbConnected && (
                <button onClick={handleOpenMiscModal} title="新增臨時交辦" className="flex items-center justify-center p-2.5 bg-purple-600 text-white rounded-xl shadow-sm hover:bg-purple-700 transition-all active:scale-95 border border-purple-700">
                    <PaperAirplaneIcon className="w-5 h-5" />
                </button>
            )}

            {/* 2. 上班打卡 (純圖示：時鐘) */}
            <button 
                onClick={() => isWorking ? setIsCheckOutModalOpen(true) : handleCheckIn()} 
                title={isWorking ? "工作中...點擊下班" : "上班打卡"}
                className={`flex items-center justify-center p-2.5 rounded-xl shadow-sm transition-all active:scale-95 border ${
                    isWorking 
                    ? 'bg-green-500 border-green-600 text-white hover:bg-green-600 animate-pulse' 
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
            >
                <ClockIcon className="w-5 h-5" />
            </button>

            {/* 3. 視圖切換 (純圖示：群組/表格) */}
            {isSupervisor ? (
                <button onClick={() => setShowMyList(!showMyList)} title={showMyList ? "返回全所進度" : "查看每日進度"} className={`flex items-center justify-center p-2.5 rounded-xl transition-colors border shadow-sm ${showMyList ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {showMyList ? <ReturnIcon className="w-5 h-5"/> : <UserGroupIcon className="w-5 h-5"/>}
                </button>
            ) : (
                <button onClick={() => setShowOverview(!showOverview)} title={showOverview ? "返回我的進度" : "查看全所進度"} className={`flex items-center justify-center p-2.5 rounded-xl transition-colors border shadow-sm ${showOverview ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {showOverview ? <ReturnIcon className="w-5 h-5"/> : <TableCellsIcon className="w-5 h-5"/>}
                </button>
            )}

            {/* 4. 應用程式選單 */}
            <div className="relative" ref={appMenuRef}>
                <button 
                    onClick={() => setIsAppMenuOpen(!isAppMenuOpen)} 
                    title="應用程式選單"
                    className={`flex items-center justify-center p-2.5 rounded-xl transition-all border shadow-sm ${isAppMenuOpen ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                    <Squares2X2Icon className="w-5 h-5" />
                </button>

                {isAppMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in p-2 grid grid-cols-2 gap-2">
                        <button onClick={() => { setIsMessageBoardOpen(true); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-blue-50 rounded-xl text-gray-600 hover:text-blue-600 transition-colors">
                            <ChatBubbleIcon className="w-6 h-6" />
                            <span className="text-xs font-bold">留言板</span>
                        </button>
                        {dbConnected ? (
                            <button onClick={() => { loadData(); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-green-50 rounded-xl text-gray-600 hover:text-green-600 transition-colors">
                                <RefreshSvg className="w-6 h-6" />
                                <span className="text-xs font-bold">重新整理</span>
                            </button>
                        ) : (
                            <button onClick={handleConnectDB} className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-600 hover:text-blue-700 transition-colors shadow-sm">
                                <FolderIcon className="w-6 h-6 animate-pulse" />
                                <span className="text-xs font-bold">連結資料庫</span>
                            </button>
                        )}
                        <button onClick={() => { setIsGalleryOpen(true); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-yellow-50 rounded-xl text-gray-600 hover:text-yellow-600 transition-colors">
                            <LightBulbIcon className="w-6 h-6" />
                            <span className="text-xs font-bold">懶人包</span>
                        </button>
                        <button onClick={() => { setIsUserModalOpen(true); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-gray-100 rounded-xl text-gray-600 hover:text-gray-900 transition-colors">
                            <GearIcon className="w-6 h-6" />
                            <span className="text-xs font-bold">{isSupervisor ? "人員管理" : "個人設定"}</span>
                        </button>
                        <button onClick={() => { setIsCalendarOpen(true); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-purple-50 rounded-xl text-gray-600 hover:text-purple-600 transition-colors">
                            <CalendarIcon className="w-6 h-6" />
                            <span className="text-xs font-bold">行事曆</span>
                        </button>
                         <button onClick={() => { setIsTimesheetOpen(true); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-red-50 rounded-xl text-gray-600 hover:text-red-600 transition-colors">
                            <ClockIcon className="w-6 h-6" />
                            <span className="text-xs font-bold">工時紀錄</span>
                        </button>
                        <button onClick={() => { setIsInvoiceOpen(true); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-pink-50 rounded-xl text-gray-600 hover:text-pink-600 transition-colors">
                            <DocumentTextIcon className="w-6 h-6" />
                            <span className="text-xs font-bold">請款單</span>
                        </button>
                        <button onClick={() => { setIsClientMasterOpen(true); setIsAppMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-indigo-50 rounded-xl text-gray-600 hover:text-indigo-600 transition-colors">
                            <div className="w-6 h-6 flex items-center justify-center text-lg">🏢</div>
                            <span className="text-xs font-bold">客戶</span>
                        </button>
                    </div>
                )}
            </div>

            {/* 視覺分隔線 */}
            <div className="h-8 w-px bg-gray-200 mx-1"></div>

            {/* 5. 人員頭像與登出區 (純圖示) */}
            <div className="flex items-center justify-center gap-3">
                {/* 圓形頭像，Hover時會顯示名字，並附帶上線狀態小綠點 */}
                <div className={`relative rounded-full border-2 cursor-help ${isSupervisor ? 'border-purple-300' : 'border-blue-300'} p-0.5`} title={currentUser.name}>
                    <img src={activeUser.avatar} alt="User" className="w-9 h-9 rounded-full object-cover bg-white" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isWorking ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                </div>

                {/* 登出按鈕 (純圖示) */}
                <button onClick={onLogout} title="登出系統" className="flex items-center justify-center p-2.5 bg-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 shadow-sm">
                    <LogoutIcon className="w-5 h-5" />
                </button>
            </div>
            
          </div>
        </div>
      </header>

      {/* 2. Tabs */}
      {((isSupervisor && !showMyList) || (!isSupervisor && showOverview)) ? (
          <div className="flex-none bg-white border-b border-gray-200 z-40">
              <div className="w-full px-6">
                  <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
                      {TABS.map((tab) => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-4 px-4 border-b-4 font-medium text-xl transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                              {tab}
                          </button>
                      ))}
                  </nav>
              </div>
          </div>
      ) : null}

      {/* 3. Main Content */}
      <main className="flex-1 overflow-hidden relative w-full bg-gray-50">
        {((isSupervisor && !showMyList) || (!isSupervisor && showOverview)) ? (
            <div className="absolute inset-0 px-6 py-6">
                {!dbConnected ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-5">
                        <p className="text-2xl font-bold text-gray-400">系統尚未取得本地資料庫授權</p>
                        <button onClick={handleConnectDB} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all font-bold text-lg">
                            <FolderIcon className="w-6 h-6" />
                            點此連結資料庫
                        </button>
                    </div>
                ) :
                activeTab === '收發信件' ? (
                    <MailLogView 
                        records={mailRecords} 
                        onUpdate={loadData}
                        isSupervisor={isSupervisor}
                    />
                ) : 
                activeTab === '零用金/代墊款' ? (
                    <CashLogView 
                        records={cashRecords}
                        clients={clients}
                        onUpdate={loadData}
                        isSupervisor={isSupervisor}
                    />
                    ) : 
                    activeTab === '股票進銷存' ? (
                        <StockInventoryView 
                            clients={clients} 
                            />
                ) : (
                    <MatrixView 
                        tasks={tasks}
                        activeTab={activeTab}
                        currentYear={currentYear}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        collapsedColumns={collapsedColumns}
                        toggleColumn={toggleColumn}
                        users={users}
                        onCellClick={handleCellClick}
                        onClientNameClick={handleClientNameClick}
                        clients={clients}
                    />
                )}
            </div>
        ) : (
            <ListView 
                tasks={tasks}
                currentUser={currentUser}
                isSupervisor={isSupervisor}
                currentYear={currentYear}
                users={users}
                viewTargetId={viewTargetId}
                setViewTargetId={setViewTargetId}
                onUpdateStatus={handleUpdateStatus}
                onEditNote={openInternNoteEdit}
                onDelete={(t) => { setTaskToDelete(t); setIsDeleteModalOpen(true); }}
                onGenerateReport={handleGenerateDailyReport}
            />
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Calendar Modal */}
      {isCalendarOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsCalendarOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex-1 overflow-auto bg-gray-50">
                      <div className="h-full min-h-[500px]">
                          {!dbConnected ? <div className="text-center py-40 opacity-50"><p className="text-2xl">請先連結資料庫</p></div> : 
                          <CalendarView 
                              currentMonth={currentMonth}
                              setCurrentMonth={setCurrentMonth}
                              events={events}
                              currentUser={currentUser}
                              isSupervisor={isSupervisor}
                              onDayClick={handleDayClick}
                              onEventClick={handleEventClick}
                          />}
                      </div>
                  </div>
                  <div className="p-4 border-t bg-white flex justify-end">
                      <button onClick={() => setIsCalendarOpen(false)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 text-base transition-colors">關閉</button>
                  </div>
              </div>
          </div>
      )}

      {/* Daily Reminder Popup */}
      {isDailyReminderOpen && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                          <BellAlertIcon className="w-8 h-8 text-yellow-600" />
                      </div>
                      <h3 className="text-xl font-black text-gray-800">今日提醒事項 ({dailyReminders.length})</h3>
                      <p className="text-base text-gray-500 mt-1">{dateStr}</p>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-6 custom-scrollbar px-2">
                      {dailyReminders.map(ev => (
                          <div key={ev.id} className={`p-3 rounded-xl border text-left ${ev.type === 'shift' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${ev.type === 'shift' ? 'bg-blue-200 text-blue-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                      {ev.type === 'shift' ? '排班' : '提醒'}
                                  </span>
                                  <span className="font-bold text-gray-700 text-base">{ev.title}</span>
                              </div>
                              {ev.description && <p className="text-sm text-gray-500">{ev.description}</p>}
                          </div>
                      ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 mb-4">
                      <input 
                          type="checkbox" 
                          id="dontShowAgain" 
                          checked={dontShowDailyAgain} 
                          onChange={(e) => setDontShowDailyAgain(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="dontShowAgain" className="text-sm text-gray-500 cursor-pointer">今日不再顯示</label>
                  </div>

                  <button onClick={handleDismissDaily} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md text-base">我知道了</button>
              </div>
          </div>
      )}

      {/* Calendar Event Modal */}
      {isEventModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsEventModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="text-xl font-bold text-gray-800 flex flex-row items-center gap-2 whitespace-nowrap">
                          <CalendarIcon className="text-blue-600 w-6 h-6" /> 
                          {selectedEvent ? '編輯事項' : '新增事項'}
                      </h3>
                      <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                  </div>
                  
                  <div className="p-6 space-y-5 overflow-y-auto flex-1">
                      <div className="text-center bg-gray-100 p-2 rounded-lg text-base font-bold text-gray-600">{selectedCalendarDate}</div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">類型</label>
                          <div className="flex p-1 bg-gray-100 rounded-xl">
                              <button onClick={() => setNewEventType('reminder')} disabled={selectedEvent && selectedEvent.type === 'shift' && !isSupervisor} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newEventType === 'reminder' ? 'bg-white shadow text-yellow-600' : 'text-gray-500 hover:bg-gray-200'}`}>提醒</button>
                              {isSupervisor && <button onClick={() => { setNewEventType('shift'); if(selectedEvent && selectedEvent.type === 'reminder') setNewEventOwnerId(''); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newEventType === 'shift' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}>排班</button>}
                          </div>
                      </div>

                      {newEventType === 'shift' ? (
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">排班對象</label>
                              <select value={newEventOwnerId} onChange={(e) => setNewEventOwnerId(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-base" disabled={!isSupervisor}>
                                  <option value="">請選擇人員...</option>
                                  {users.filter(u => u.role === UserRole.INTERN).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                          </div>
                      ) : <div className="text-xs text-gray-400 italic">* 提醒事項僅自己可見</div>}

                      {newEventType === 'shift' ? (
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">時間</label>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><span className="text-xs text-gray-500 mb-1 block">上班</span><select value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono text-base" disabled={!isSupervisor}>{TIME_OPTIONS.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}</select></div>
                                  <div><span className="text-xs text-gray-500 mb-1 block">下班</span><select value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono text-base" disabled={!isSupervisor}>{TIME_OPTIONS.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}</select></div>
                              </div>
                          </div>
                      ) : (
                          <div><label className="block text-sm font-bold text-gray-700 mb-1">標題</label><input type="text" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="例如：跟客戶開會..." /></div>
                      )}

                      <div><label className="block text-sm font-bold text-gray-700 mb-1">備註 (選填)</label><textarea value={newEventDesc} onChange={(e) => setNewEventDesc(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-base" placeholder="輸入詳細內容..." readOnly={selectedEvent && selectedEvent.type === 'shift' && !isSupervisor} /></div>
                  </div>

                  <div className="p-6 border-t bg-white flex gap-3">
                      {selectedEvent && ((isSupervisor || (selectedEvent.type === 'reminder' && selectedEvent.ownerId === currentUser.id)) && <button onClick={handleEventDelete} disabled={isLoading} className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors text-base">刪除</button>)}
                      {(!selectedEvent || isSupervisor || (selectedEvent.type === 'reminder' && selectedEvent.ownerId === currentUser.id)) && <button onClick={handleEventSubmit} disabled={isLoading || (newEventType === 'shift' && !newEventOwnerId)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed text-base">{selectedEvent ? '更新' : '新增'}</button>}
                  </div>
              </div>
          </div>
      )}

      {/* Event Delete Modal */}
      {isEventDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><TrashIcon className="w-8 h-8 text-red-500" /></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">確定刪除此事項？</h3>
                <p className="text-base text-gray-500 mb-6">此動作無法復原，請確認是否繼續。</p>
                <div className="flex gap-3">
                    <button onClick={() => setIsEventDeleteModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 text-base">取消</button>
                    <button onClick={handleConfirmEventDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 text-base">確認刪除</button>
                </div>
            </div>
        </div>
      )}

      {/* Settings Modal (純人員設定) */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsUserModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800"><GearIcon className="w-6 h-6 text-gray-600" />{isSupervisor ? '人員管理' : '個人設定'}</h3>
                        <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} />

                  <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                      {isSupervisor ? (
                          <>
                              <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-gray-100 mb-6">
                                  <div className="relative w-24 h-24 mb-4 cursor-pointer group" onClick={() => handleAvatarClick(currentUser.id)}>
                                      <img src={activeUser.avatar} className="w-full h-full rounded-full bg-white border-4 border-white shadow-lg object-cover" alt={currentUser.name} />
                                      <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"><CameraIcon className="w-8 h-8 text-white" /></div>
                                  </div>
                                  <h4 className="text-2xl font-bold text-gray-800">{currentUser.name}</h4>
                                  <p className="text-sm text-gray-500 mt-2">點擊上方圖片即可更換大頭貼</p>
                              </div>
                              
                              <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                  <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-2 flex items-center gap-1"><LockClosedIcon className="w-4 h-4" /> 修改登入密碼</h4>
                                  <div className="flex gap-2">
                                      <input type="text" placeholder="輸入新密碼 (4位數字)..." value={newUserPin} onChange={e => setNewUserPin(e.target.value)} className="flex-1 p-2 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-base bg-white" maxLength={4} />
                                      <button onClick={handleUpdatePin} disabled={!newUserPin.trim()} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">更新</button>
                                  </div>
                              </div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pl-1">工讀生名單</h4>
                              <div className="space-y-3 mb-6">
                                  {users.filter(u => u.role === UserRole.INTERN).map(user => (
                                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                          <div className="flex items-center gap-3">
                                              <div className="relative w-10 h-10"><img src={user.avatar} className="w-full h-full rounded-full bg-white border object-cover" alt={user.name} /></div>
                                              <span className="font-bold text-gray-700 text-lg">{user.name}</span>
                                          </div>
                                          <button onClick={() => handleDeleteUserClick(user)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded transition-colors"><TrashIcon className="w-5 h-5 pointer-events-none" /></button>
                                      </div>
                                  ))}
                                  {users.filter(u => u.role === UserRole.INTERN).length === 0 && <p className="text-gray-400 text-center text-sm py-4">目前沒有工讀生資料</p>}
                              </div>
                              <div className="border-t border-gray-100 pt-4">
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">新增工讀生</label>
                                  <div className="flex gap-2">
                                      <input type="text" placeholder="輸入姓名..." value={newUserName} onChange={e => setNewUserName(e.target.value)} className="flex-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-base" onKeyDown={e => e.key === 'Enter' && handleAddUser()} />
                                      <button onClick={handleAddUser} disabled={!newUserName.trim()} className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">新增</button>
                                  </div>
                              </div>
                          </>
                      ) : (
                          <div className="mb-6">
                              <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-gray-100 mb-6">
                                  <div className="relative w-24 h-24 mb-4 cursor-pointer group" onClick={() => handleAvatarClick(currentUser.id)}>
                                      <img src={activeUser.avatar} className="w-full h-full rounded-full bg-white border-4 border-white shadow-lg object-cover" alt={currentUser.name} />
                                      <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"><CameraIcon className="w-8 h-8 text-white" /></div>
                                  </div>
                                  <h4 className="text-2xl font-bold text-gray-800">{currentUser.name}</h4>
                                  <p className="text-sm text-gray-500 mt-2">點擊上方圖片即可更換大頭貼</p>
                              </div>
                              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                  <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-2 flex items-center gap-1"><LockClosedIcon className="w-4 h-4" /> 修改登入密碼</h4>
                                  <div className="flex gap-2">
                                      <input type="text" placeholder="輸入新密碼 (4位數字)..." value={newUserPin} onChange={e => setNewUserPin(e.target.value)} className="flex-1 p-2 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-base bg-white" maxLength={4} />
                                      <button onClick={handleUpdatePin} disabled={!newUserPin.trim()} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">更新</button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t bg-white flex justify-end"><button onClick={() => setIsUserModalOpen(false)} className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2 text-base">關閉</button></div>
              </div>
          </div>
      )}

      {/* Delete Modals */}
      {isUserDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><TrashIcon className="w-8 h-8 text-red-600" /></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">確認刪除人員？</h3>
                <p className="text-base text-gray-500 mb-6">您確定要刪除 <span className="font-bold text-gray-800">{userToDelete.name}</span> 嗎？此動作無法復原。</p>
                <div className="flex gap-3">
                    <button onClick={() => setIsUserDeleteModalOpen(false)} className="flex-1 py-2.5 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-base">取消</button>
                    <button onClick={handleConfirmDeleteUser} className="flex-1 py-2.5 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-200 text-base">確認刪除</button>
                </div>
            </div>
        </div>
      )}

      {/* Drawer */}
      {selectedClientForDrawer && (
          <ClientDrawer 
              client={selectedClientForDrawer} 
              isOpen={true} 
              onClose={() => { setSelectedClientForDrawer(null); startPolling(); }}
              onSave={handleSaveProfile}
              currentYear={currentYear}
              tasks={tasks}
              isReadOnly={!isSupervisor}
          />
      )}

      {/* ✨ Gallery Modal (懶人包總覽) */}
      {isGalleryOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsGalleryOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-yellow-600">
                          <LightBulbIcon className="w-8 h-8" />
                          {/* ✨ 標題修改 */}
                          <h3 className="text-2xl font-black">懶人包提醒</h3>
                      </div>
                      <div className="flex items-center gap-4">
                          {isSupervisor && (
                              {/* ✨ 按鈕改為純加號圖示 */}
                              <button onClick={() => { setEditingInstruction({}); setIsInstructionModalOpen(true); }} title="新增懶人包" className="bg-yellow-500 hover:bg-yellow-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-xl shadow-sm transition-colors active:scale-95">
                                  +
                              </button>
                          )}
                          <button onClick={() => setIsGalleryOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar">
                      {instructions.map(inst => (
                          <div key={inst.id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col" onClick={() => setSelectedInstruction(inst)}>
                              <div className="h-48 overflow-hidden relative shrink-0">
                                  <img src={inst.imageUrl} alt={inst.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                  <div className="absolute top-2 left-2"><span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">{inst.category}</span></div>
                              </div>
                              <div className="p-4 flex-1">
                                  <h4 className="font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors text-lg">{inst.title}</h4>
                                  <p className="text-sm text-gray-500 line-clamp-2">{inst.description}</p>
                              </div>
                          </div>
                      ))}
                      {instructions.length === 0 && (
                          <div className="col-span-full py-20 text-center text-gray-400 font-bold text-lg">目前尚無懶人包資料</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* ✨ 懶人包詳細內容 Modal */}
      {selectedInstruction && (
          <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedInstruction(null)}>
              <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b flex justify-between items-center">
                      <h3 className="text-xl font-bold">{selectedInstruction.title}</h3>
                      <div className="flex items-center gap-2">
                          {isSupervisor && (
                              <>
                                  {/* ✨ 編輯按鈕 (純圖示) */}
                                  <button onClick={() => { setEditingInstruction(selectedInstruction); setIsInstructionModalOpen(true); setSelectedInstruction(null); }} title="編輯" className="p-2 bg-white border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                                      <PencilIcon className="w-5 h-5" />
                                  </button>
                                  {/* ✨ 刪除按鈕 (純圖示) */}
                                  <button onClick={() => handleInstructionDelete(selectedInstruction.id)} title="刪除" className="p-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors shadow-sm">
                                      <TrashIcon className="w-5 h-5" />
                                  </button>
                              </>
                          )}
                          {/* 增加一點間距讓關閉按鈕獨立 */}
                          <div className="w-px h-6 bg-gray-200 mx-1"></div>
                          <button onClick={() => setSelectedInstruction(null)} className="p-2 hover:bg-gray-100 rounded-full text-xl text-gray-500">✕</button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                      <img src={selectedInstruction.imageUrl} className="w-full rounded-2xl shadow-lg border border-gray-100" />
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                          <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-lg"><LightBulbIcon className="w-5 h-5" /> 重點提醒</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">{selectedInstruction.description}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ✨ 懶人包 新增/編輯 Modal */}
      {isInstructionModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsInstructionModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                  <form onSubmit={handleInstructionSubmit}>
                      <div className="p-5 border-b bg-yellow-50 flex justify-between items-center">
                          <h3 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                              <LightBulbIcon className="w-6 h-6" />
                              {editingInstruction?.id ? '編輯懶人包' : '新增懶人包'}
                          </h3>
                          <button type="button" onClick={() => setIsInstructionModalOpen(false)} className="text-yellow-600 hover:text-yellow-800 text-xl">✕</button>
                      </div>
                      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">標題</label>
                              <input name="title" required defaultValue={editingInstruction?.title} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="輸入標題..." />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">分類標籤</label>
                              <input name="category" required defaultValue={editingInstruction?.category} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="例如：報稅、行政、請款..." />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">重點說明</label>
                              <textarea name="description" required defaultValue={editingInstruction?.description} className="w-full p-2.5 border border-gray-300 rounded-xl h-24 resize-none focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="輸入詳細說明..."></textarea>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">圖片上傳 (建議比例 16:9)</label>
                              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[160px]" onClick={() => instructionFileInputRef.current?.click()}>
                                  {editingInstruction?.imageUrl ? (
                                      <img src={editingInstruction.imageUrl} alt="預覽" className="max-h-40 mx-auto rounded-lg shadow-sm" />
                                  ) : (
                                      <div className="text-gray-400 flex flex-col items-center gap-2">
                                          <CameraIcon className="w-10 h-10" />
                                          <span className="font-bold text-sm">點擊選擇圖片</span>
                                          <span className="text-xs">請保持在 2MB 以內</span>
                                      </div>
                                  )}
                              </div>
                              <input type="file" ref={instructionFileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleInstructionImageChange} />
                          </div>
                      </div>
                      <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsInstructionModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">取消</button>
                          <button type="submit" disabled={isLoading || (!editingInstruction?.imageUrl)} className="px-5 py-2.5 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                              儲存
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && selectedCell && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsAssignModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b">
                      <h3 className="text-xl font-bold mb-1">{selectedCell.client.name} - {selectedCell.column.replace(selectedCell.column.split('-').length > 1 ? `-${selectedCell.column.split('-').pop()}` : '', '')}</h3>
                       {selectedCell.column.split('-').length > 1 && (ACCOUNTING_SUB_ITEMS.includes(selectedCell.column.split('-').pop()!) || TAX_SUB_ITEMS.includes(selectedCell.column.split('-').pop()!)) && (
                           <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mb-1 font-bold">{selectedCell.column.split('-').pop()}</span>
                       )}
                      <p className="text-sm text-gray-400">{activeTab} ({currentYear}年)</p>
                  </div>
                  
                  <div className="p-6 space-y-5 overflow-y-auto flex-1">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">指派給</label>
                          <select value={modalAssigneeId} onChange={e => setModalAssigneeId(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base">
                              <option value="">請選擇...</option>
                              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                      </div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">備註 (選填)</label><input type="text" value={modalNote} onChange={e => setModalNote(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="例如：需特別注意..." /></div>
                      {selectedCell.task?.history && selectedCell.task.history.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> 任務履歷紀錄</h4>
                              <div className="space-y-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                  {selectedCell.task.history.map((h, i) => (
                                      <div key={i} className="flex gap-2 text-xs border-l-2 border-blue-100 pl-3 py-1">
                                          <div className="flex flex-col flex-1">
                                              <div className="flex justify-between font-bold text-gray-600"><span>{h.userName}</span><span>{new Date(h.timestamp).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                                              <div className="text-gray-500 font-medium">{h.action}</div>
                                              {h.details && <div className="text-gray-400 italic mt-0.5">「{h.details}」</div>}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t bg-white flex gap-3">
                      <button onClick={() => handleAssignSubmit(true)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-bold transition-colors text-sm">標記為 N/A</button>
                      <button onClick={() => handleAssignSubmit(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-blue-200 text-sm">確認派案</button>
                  </div>
              </div>
          </div>
      )}

      {/* Completion Modal */}
      {isDateModalOpen && selectedCell && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsDateModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b flex justify-between items-start">
                      <div>
                          <h3 className="text-xl font-bold">{selectedCell.client.name} - {selectedCell.column.replace(selectedCell.column.split('-').length > 1 ? `-${selectedCell.column.split('-').pop()}` : '', '')}</h3>
                          {selectedCell.column.split('-').length > 1 && (ACCOUNTING_SUB_ITEMS.includes(selectedCell.column.split('-').pop()!) || TAX_SUB_ITEMS.includes(selectedCell.column.split('-').pop()!)) && (
                               <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mb-1 font-bold">{selectedCell.column.split('-').pop()}</span>
                          )}
                          <p className="text-sm text-gray-400">{activeTab} ({currentYear}年)</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${selectedCell.task?.isNA ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>{selectedCell.task?.isNA ? 'N/A' : '已完成'}</span>
                  </div>

                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                      <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                          {!selectedCell.task?.isNA && <div className="flex justify-between text-base"><span className="text-gray-500">完成日期</span><span className="font-bold text-gray-800">{modalDate}</span></div>}
                          {!selectedCell.task?.isNA && selectedCell.task?.assigneeName && <div className="flex justify-between text-base"><span className="text-gray-500">負責人</span><span className="font-bold text-gray-800">{selectedCell.task.assigneeName}</span></div>}
                          {selectedCell.task?.note && <div className="pt-2 border-t border-gray-200 mt-2"><span className="text-xs text-gray-400 block mb-1">備註</span><p className="text-base text-gray-700">{selectedCell.task.note}</p></div>}
                      </div>
                      {isSupervisor && <button onClick={handleRevertStatus} className="w-full bg-white border border-red-200 text-red-500 hover:bg-red-50 py-2.5 rounded-xl font-bold transition-colors text-base">{selectedCell.task?.isNA ? '取消 N/A (重置)' : '撤銷完成狀態'}</button>}
                      {selectedCell.task?.history && selectedCell.task.history.length > 0 && (
                          <div className="pt-4 border-t border-gray-100">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> 任務履歷紀錄</h4>
                              <div className="space-y-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                  {selectedCell.task.history.map((h, i) => (
                                      <div key={i} className="flex gap-2 text-xs border-l-2 border-blue-100 pl-3 py-1">
                                          <div className="flex flex-col flex-1">
                                              <div className="flex justify-between font-bold text-gray-600"><span>{h.userName}</span><span>{new Date(h.timestamp).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                                              <div className="text-gray-500 font-medium">{h.action}</div>
                                              {h.details && <div className="text-gray-400 italic mt-0.5">「{h.details}」</div>}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t bg-white flex justify-end"><button onClick={() => setIsDateModalOpen(false)} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 text-sm transition-colors">關閉</button></div>
              </div>
          </div>
      )}

      {/* Misc Modal */}
      {isMiscModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><LightningIcon className="w-6 h-6 text-yellow-500"/> 臨時交辦事項</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">指派對象</label><select className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-base" value={modalAssigneeId} onChange={(e) => setModalAssigneeId(e.target.value)}><option value="">請選擇人員...</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">交辦內容</label><textarea className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none text-base" placeholder="請輸入具體工作內容..." value={modalNote} onChange={(e) => setModalNote(e.target.value)}></textarea></div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setIsMiscModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 text-base">取消</button>
                <button onClick={handleMiscSubmit} disabled={!modalAssigneeId || !modalNote.trim()} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200 text-base">發送交辦</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><TrashIcon className="w-8 h-8 text-red-500" /></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">確定刪除此任務？</h3>
                <p className="text-base text-gray-500 mb-6">此動作無法復原，請確認是否繼續。</p>
                <div className="flex gap-3">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 text-base">取消</button>
                    <button onClick={handleConfirmDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 text-base">確認刪除</button>
                </div>
            </div>
        </div>
      )}

      {/* Note Edit Modal */}
      {isNoteEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">編輯備註</h3>
                  <textarea className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none mb-4 text-base" placeholder="輸入備註..." value={modalNote} onChange={(e) => setModalNote(e.target.value)}></textarea>
                  <div className="flex gap-3">
                      <button onClick={() => setIsNoteEditModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 text-base">取消</button>
                      <button onClick={handleInternNoteSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 text-base">儲存</button>
                  </div>
              </div>
          </div>
      )}
            
      {/* Check Out Modal */}
      {isCheckOutModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">準備下班了嗎？</h3>
                  <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center justify-between">
                      <span className="text-gray-600 font-bold">扣除午休 (1小時)</span>
                      <input 
                          type="checkbox" 
                          checked={deductBreak} 
                          onChange={e => setDeductBreak(e.target.checked)}
                          className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                      />
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setIsCheckOutModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">取消</button>
                      <button onClick={handleCheckOut} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">確認下班</button>
                  </div>
              </div>
          </div>
      )}

      {/* Timesheet Modal */}
      {isTimesheetOpen && (
          <TimesheetView 
              currentUser={currentUser}
              users={users}
              records={checkInRecords}
              onUpdate={loadData}
              onClose={() => setIsTimesheetOpen(false)}
          />
      )}

      {/* Message Board Modal */}
      {isMessageBoardOpen && (
          <MessageBoard 
              currentUser={currentUser}
              messages={messages}
              onUpdate={loadData}
              onClose={() => setIsMessageBoardOpen(false)}
          />
      )}

      {/* Invoice Generator Modal */}
      {isInvoiceOpen && (
          <InvoiceGenerator 
              onClose={() => setIsInvoiceOpen(false)}
              cashRecords={cashRecords}
          />
      )}

      {/* Client Master Modal */}
        {isClientMasterOpen && (
        <ClientMasterView 
            clients={clients} 
            onClose={() => setIsClientMasterOpen(false)} 
            onUpdate={loadData} 
            />
      )}
        
      <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-slide-in-right {
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-scale-up { animation: scaleUp 0.2s ease-out; }
          @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Dashboard;
