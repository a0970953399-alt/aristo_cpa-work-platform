import { Message } from './types';
import { MessageBoard } from './MessageBoard';
import { ChatBubbleIcon } from './Icons'; // 記得引入 Icon
import { RefreshSvg, FolderIcon, LightningIcon, TrashIcon, UserGroupIcon, TableCellsIcon, ReturnIcon, BellAlertIcon, GearIcon, CameraIcon, LockClosedIcon, CalendarIcon, LightBulbIcon, ClockIcon, DocumentTextIcon } from './Icons';
import { CheckInRecord } from './types'; // 記得加 CheckInRecord
import { TimesheetView } from './TimesheetView'; // 引入新頁面
// 在 Icons 引入區加入 ClockIcon (如果沒有這個icon，用 LightBulbIcon 代替也可以，或是加一個)
import { ClockIcon } from './Icons';
import React, { useState, useEffect, useRef } from 'react';
import { User, TabCategory, ClientTask, UserRole, TaskStatusType, Client, Instruction, HistoryEntry, ClientProfile, CalendarEvent, EventType } from './types';
import { TABS, MATRIX_TABS, COLUMN_CONFIG, ACCOUNTING_SUB_ITEMS, TAX_SUB_ITEMS, DUMMY_CLIENTS, YEAR_OPTIONS, DEFAULT_YEAR, INSTRUCTIONS } from './constants';
import { TaskService } from './taskService';
import { RefreshSvg, FolderIcon, LightningIcon, TrashIcon, UserGroupIcon, TableCellsIcon, ReturnIcon, BellAlertIcon, GearIcon, CameraIcon, LockClosedIcon, CalendarIcon, LightBulbIcon, ClockIcon } from './Icons';
import { ClientDrawer } from './ClientDrawer';
import { MatrixView } from './MatrixView';
import { CalendarView } from './CalendarView';
import { ListView } from './ListView';
import * as XLSX from 'xlsx';

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
  // Global State
  const [currentYear, setCurrentYear] = useState<string>(DEFAULT_YEAR);
  const [activeTab, setActiveTab] = useState<TabCategory>(TabCategory.ACCOUNTING);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]); // Calendar Events
  const [clients, setClients] = useState<Client[]>([]); // Client List
  const [isLoading, setIsLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>('reminder');
  const [newEventOwnerId, setNewEventOwnerId] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  
  const [isEventDeleteModalOpen, setIsEventDeleteModalOpen] = useState(false);

  const [isDailyReminderOpen, setIsDailyReminderOpen] = useState(false);
  const [dailyReminders, setDailyReminders] = useState<CalendarEvent[]>([]);
  const [dontShowDailyAgain, setDontShowDailyAgain] = useState(false);

  const dateStr = currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = currentTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  const [showMyList, setShowMyList] = useState(false);
  const [viewTargetId, setViewTargetId] = useState<string>('ALL');
  const [showOverview, setShowOverview] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<Instruction | null>(null);

  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<Client | null>(null);

  const [selectedCell, setSelectedCell] = useState<{client: Client, column: string, task?: ClientTask} | null>(null);
  const [modalAssigneeId, setModalAssigneeId] = useState<string>('');
  const [modalNote, setModalNote] = useState('');
  const [modalDate, setModalDate] = useState('');
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ClientTask | null>(null);
  const [isNoteEditModalOpen, setIsNoteEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ClientTask | null>(null);
  
  // Settings / User / Client Management Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'users' | 'clients'>('users');
  const [newUserName, setNewUserName] = useState('');
  const [isUserDeleteModalOpen, setIsUserDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserPin, setNewUserPin] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Client Management States
  const [newClientCode, setNewClientCode] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isClientDeleteModalOpen, setIsClientDeleteModalOpen] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const prevCompletedColsRef = useRef<Set<string>>(new Set());

  const pollingRef = useRef<number | null>(null);
  const isSupervisor = currentUser.role === UserRole.SUPERVISOR;
  const activeUser = users.find(u => u.id === currentUser.id) || currentUser;
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [deductBreak, setDeductBreak] = useState(true); // 預設扣除午休

  // 計算今天的打卡狀態
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const myTodayRecord = checkInRecords.find(r => r.userId === currentUser.id && r.date === todayStr);
  const isWorking = myTodayRecord && !myTodayRecord.endTime;
  // -----------------------------------------------------------
  const [messages, setMessages] = useState<Message[]>([]); // 存放留言
  const [isMessageBoardOpen, setIsMessageBoardOpen] = useState(false); // 控制開關

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
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const storageKey = `shuoye_dismissed_reminder_${todayStr}_${currentUser.id}`;
      if (localStorage.getItem(storageKey) === 'true') return;
      const reminders = events.filter(e => {
          if (e.date !== todayStr) return false;
          if (e.type === 'shift' && e.ownerId === currentUser.id) return true;
          if (e.type === 'reminder' && e.ownerId === currentUser.id) return true;
          return false;
      });
      if (reminders.length > 0) { setDailyReminders(reminders); setIsDailyReminderOpen(true); }
  };

  const handleDismissDaily = () => {
      if (dontShowDailyAgain) {
          const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
          const storageKey = `shuoye_dismissed_reminder_${todayStr}_${currentUser.id}`;
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

  const startPolling = () => { if (pollingRef.current) return; pollingRef.current = window.setInterval(async () => { if (TaskService.isConnected() && !isAssignModalOpen && !isDateModalOpen && !isNoteEditModalOpen && !isMiscModalOpen && !isDeleteModalOpen && !isGalleryOpen && !selectedClientForDrawer && !isUserModalOpen && !isUserDeleteModalOpen && !isEventModalOpen && !isCalendarOpen && !isEventDeleteModalOpen && !isClientDeleteModalOpen) { try { await loadData(); } catch (e) { } } }, 3000); };
  const stopPolling = () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  const handleConnectDb = async () => { const success = await TaskService.connectDatabase(); if (success) { setDbConnected(true); setPermissionNeeded(false); await loadData(); startPolling(); } };
  const handleRestoreClick = async () => { const status = await TaskService.restoreConnection(true); if (status === 'connected') { setDbConnected(true); setPermissionNeeded(false); await loadData(); startPolling(); } else handleConnectDb(); };
  const loadData = async () => { 
      if (!TaskService.isConnected()) return; 
      try { 
          const tData = await TaskService.fetchTasks(); 
          const eData = await TaskService.fetchEvents(); 
          const cData = await TaskService.fetchClients();
          const checkInData = await TaskService.fetchCheckIns();
          const messageData = await TaskService.fetchMessages();
          setTasks(prev => JSON.stringify(prev) !== JSON.stringify(tData) ? tData : prev); 
          setEvents(prev => JSON.stringify(prev) !== JSON.stringify(eData) ? eData : prev); 
          setClients(prev => JSON.stringify(prev) !== JSON.stringify(cData) ? cData : prev);
          setCheckInRecords(prev => JSON.stringify(prev) !== JSON.stringify(checkInData) ? checkInData : prev);
          setMessages(prev => JSON.stringify(prev) !== JSON.stringify(messageData) ? messageData : prev);
      } catch (error) { 
          setDbConnected(false); setPermissionNeeded(true); 
      } 
  };
    
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
      await loadData();
      setIsLoading(false);
  };

  const handleCheckOut = async () => {
      if (!myTodayRecord) return;
      // 計算工時
      const endTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const [sh, sm] = myTodayRecord.startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const minutes = (eh * 60 + em) - (sh * 60 + sm);
      
      const breakH = deductBreak ? 1 : 0;
      let hours = minutes / 60 - breakH;
      if (hours < 0) hours = 0;
      const finalHours = Math.floor(hours * 2) / 2; // 無條件捨去至 0.5

      const updatedRecord: CheckInRecord = {
          ...myTodayRecord,
          endTime: endTime,
          breakHours: breakH,
          totalHours: finalHours
      };
      await TaskService.updateCheckIn(updatedRecord);
      setIsCheckOutModalOpen(false);
      await loadData();
      alert(`下班打卡成功！\n今日工時：${finalHours} 小時`);
  };
    
  const handleUpdateStatus = async (task: ClientTask, newStatus: TaskStatusType) => { stopPolling(); const completionDateStr = newStatus === 'done' ? `${currentTime.getMonth() + 1}/${currentTime.getDate()}` : ''; try { const updatedList = await TaskService.updateTaskStatus(task.id, newStatus, currentUser.name, completionDateStr); setTasks(updatedList); } catch (error) { alert("失敗"); } finally { startPolling(); } };
  const openInternNoteEdit = (task: ClientTask) => { setEditingTask(task); setModalNote(task.note); setIsNoteEditModalOpen(true); stopPolling(); };
  const handleInternNoteSubmit = async () => { if (!editingTask) return; setIsLoading(true); try { const updatedList = await TaskService.updateTaskNote(editingTask.id, modalNote, currentUser.name); setTasks(updatedList); setIsNoteEditModalOpen(false); setEditingTask(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleOpenMiscModal = () => { if(!dbConnected) return; setModalAssigneeId(''); setModalNote(''); setIsMiscModalOpen(true); stopPolling(); }
  const handleMiscSubmit = async () => { if (!modalAssigneeId || !modalNote.trim()) return; setIsLoading(true); const assignee = users.find(u => u.id === modalAssigneeId); const newTask: ClientTask = { id: Date.now().toString(), clientId: 'MISC', clientName: '⚡ 行政交辦', category: 'MISC_TASK', workItem: '臨時事項', year: currentYear, status: 'todo', isNA: false, isMisc: true, assigneeId: modalAssigneeId, assigneeName: assignee?.name || '未知', note: modalNote, lastUpdatedBy: currentUser.name, lastUpdatedAt: new Date().toISOString() }; try { const updatedList = await TaskService.addTask(newTask); setTasks(updatedList); setIsMiscModalOpen(false); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } }

// --- 📋 一鍵生成日報功能 (修正版) ---
  const handleGenerateDailyReport = async () => {
      const today = new Date();
      // 格式化日期：2026/02/16
      const dateString = today.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const checkDate = today.toDateString();

      // 1. 抓取今天的任務
      const myTasks = tasks.filter(t => {
          if (!t.lastUpdatedAt) return false;
          const updateDate = new Date(t.lastUpdatedAt).toDateString();
          // 確保是「今天」且「最後更新者是我」
          return t.lastUpdatedBy === currentUser.name && updateDate === checkDate;
      });

      if (myTasks.length === 0) {
          alert("今天您還沒有更新任何工作紀錄喔！");
          return;
      }

      // 2. 分類狀態
      const done = myTasks.filter(t => t.status === 'done' || t.isNA);
      const inProgress = myTasks.filter(t => t.status === 'in_progress');
      const todo = myTasks.filter(t => t.status === 'todo');

      // 3. 準備標題
      let report = `📅 ${dateString} 工作匯報 - ${currentUser.name}\n\n`;

      // ✨ 核心修改：定義每一行的文字格式
      const formatLine = (t: ClientTask) => {
          // 判斷是否為行政交辦 (檢查 ID 開頭 或 Category)
          const isMisc = t.id.startsWith('misc_') || t.category === 'MISC_TASK';

          if (isMisc) {
              // 🔴 針對行政交辦：只顯示備註！
              // 格式變成： "- 備註內容"
              return `- ${t.note || '行政交辦 (無內容)'}\n`;
          }

          // 🔵 針對一般客戶任務：維持原本格式
          // 格式： "- 客戶名：分類 工作項目"
          return `- ${t.clientName}：${t.category} ${t.workItem} ${t.isNA ? '(N/A)' : ''}\n`;
      };

      // 4. 組合內容
      if (done.length > 0) {
          report += `✅ 已完成：\n`;
          done.forEach(t => { report += formatLine(t); });
          report += `\n`;
      }

      if (inProgress.length > 0) {
          report += `🔄 進行中：\n`;
          inProgress.forEach(t => { report += formatLine(t); });
          report += `\n`;
      }

      if (todo.length > 0) {
          report += `📝 待辦：\n`;
          todo.forEach(t => { report += formatLine(t); });
          report += `\n`;
      }

      // 5. 複製到剪貼簿
      try {
          await navigator.clipboard.writeText(report);
          alert("📋 工作匯報已複製到剪貼簿！");
      } catch (err) {
          console.error('Failed to copy: ', err);
          alert("複製失敗，請手動複製");
      }
  };
    
  // Calendar Logic
  const handleDayClick = (dateStr: string) => { 
      if (!dbConnected) return; 
      setSelectedCalendarDate(dateStr); 
      setNewEventTitle(''); 
      setNewEventDesc(''); 
      setNewEventType('reminder'); 
      setNewEventOwnerId(currentUser.id); 
      setShiftStart('09:00'); 
      setShiftEnd('18:00'); 
      setSelectedEvent(null); 
      setIsEventModalOpen(true); 
      stopPolling(); 
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => { 
      e.stopPropagation(); 
      if (!dbConnected) return; 
      setSelectedCalendarDate(event.date); 
      setNewEventTitle(event.title); 
      setNewEventDesc(event.description || ''); 
      setNewEventType(event.type); 
      setNewEventOwnerId(event.ownerId); 
      if (event.type === 'shift' && event.title.includes(' - ')) { 
          const parts = event.title.split(' - '); 
          if (parts.length === 2) { setShiftStart(parts[0]); setShiftEnd(parts[1]); } 
          else { setShiftStart('09:00'); setShiftEnd('18:00'); } 
      } else { 
          setShiftStart('09:00'); setShiftEnd('18:00'); 
      } 
      setSelectedEvent(event); 
      setIsEventModalOpen(true); 
      stopPolling(); 
  };

  const handleEventSubmit = async () => { let finalTitle = newEventTitle; if (newEventType === 'shift') { finalTitle = `${shiftStart} - ${shiftEnd}`; } else { if (!newEventTitle.trim()) { alert("請輸入標題"); return; } } const owner = users.find(u => u.id === newEventOwnerId); if (newEventType === 'reminder' && newEventOwnerId !== currentUser.id) { alert("提醒事項只能設定給自己"); return; } setIsLoading(true); try { const eventPayload: CalendarEvent = { id: selectedEvent ? selectedEvent.id : Date.now().toString(), date: selectedCalendarDate, type: newEventType, title: finalTitle, description: newEventDesc, ownerId: newEventOwnerId, ownerName: owner?.name || '未知', creatorId: selectedEvent ? selectedEvent.creatorId : currentUser.id, createdAt: selectedEvent ? selectedEvent.createdAt : new Date().toISOString() }; let updatedList; if (selectedEvent) { updatedList = await TaskService.updateEvent(eventPayload); } else { updatedList = await TaskService.addEvent(eventPayload); } setEvents(updatedList); setIsEventModalOpen(false); setSelectedEvent(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleEventDelete = () => { if (!selectedEvent) return; setIsEventDeleteModalOpen(true); };
  const handleConfirmEventDelete = async () => { if (!selectedEvent) return; setIsLoading(true); try { const updatedList = await TaskService.deleteEvent(selectedEvent.id); setEvents(updatedList); setIsEventDeleteModalOpen(false); setIsEventModalOpen(false); setSelectedEvent(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  
  // User Mgmt
  const handleAddUser = () => { if (!newUserName.trim()) return; const newUser: User = { id: Date.now().toString(), name: newUserName.trim(), role: UserRole.INTERN, avatar: `https://api.dicebear.com/9.x/micah/svg?seed=${newUserName}&backgroundColor=c0aede&radius=50`, pin: '1234' }; const currentUsers = TaskService.getUsers(); const updatedUsers = [...currentUsers, newUser]; TaskService.saveUsers(updatedUsers); onUserUpdate(); setNewUserName(''); };
  const handleDeleteUserClick = (user: User) => { setUserToDelete(user); setIsUserDeleteModalOpen(true); };
  const handleConfirmDeleteUser = () => { if (!userToDelete) return; const currentUsers = TaskService.getUsers(); const updatedUsers = currentUsers.filter(u => u.id !== userToDelete.id); TaskService.saveUsers(updatedUsers); onUserUpdate(); setIsUserDeleteModalOpen(false); setUserToDelete(null); };
  const handleAvatarClick = (userId: string) => { setEditingUserId(userId); if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && editingUserId) { if (file.size > 500 * 1024) { alert("圖片大小請小於 500KB"); return; } const reader = new FileReader(); reader.onloadend = () => { const base64String = reader.result as string; const currentUsers = TaskService.getUsers(); const updatedUsers = currentUsers.map(u => u.id === editingUserId ? { ...u, avatar: base64String } : u ); TaskService.saveUsers(updatedUsers); onUserUpdate(); setEditingUserId(null); }; reader.readAsDataURL(file); } };
  const handleUpdatePin = () => { if (!newUserPin.trim()) return; if (newUserPin.length !== 4 || isNaN(Number(newUserPin))) { alert("請輸入 4 位數字密碼"); return; } const currentUsers = TaskService.getUsers(); const updatedUsers = currentUsers.map(u => u.id === currentUser.id ? { ...u, pin: newUserPin.trim() } : u ); TaskService.saveUsers(updatedUsers); onUserUpdate(); setNewUserPin(''); alert("密碼已更新"); };

  // Client Management
  const handleAddClient = async () => {
    if (!newClientCode.trim() || !newClientName.trim()) { alert("請輸入代號和名稱"); return; }
    const newClient: Client = {
        id: `c_${Date.now()}`,
        code: newClientCode.trim(),
        name: newClientName.trim()
    };
    const updatedClients = [...clients, newClient];
    await TaskService.saveClients(updatedClients);
    setClients(updatedClients);
    setNewClientCode('');
    setNewClientName('');
  };

  const handleDeleteClientClick = (client: Client) => {
      setClientToDelete(client);
      setIsClientDeleteModalOpen(true);
  };
    
    const handleConfirmDeleteClient = async () => {
      if (!clientToDelete) return;
      
      // 1. 刪除客戶本體
      const updatedClients = clients.filter(c => c.id !== clientToDelete.id);
      await TaskService.saveClients(updatedClients);
      
      // 🔴 新增: 2. 連動刪除該客戶的所有任務 (Cascade Delete)
      const currentTasks = await TaskService.fetchTasks();
      const updatedTasks = currentTasks.filter(t => t.clientId !== clientToDelete.id);
      await TaskService.saveTasks(updatedTasks);
      setTasks(updatedTasks); // 更新畫面上的任務列表

      setClients(updatedClients);
      setIsClientDeleteModalOpen(false);
      setClientToDelete(null);
    };;

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
              
              let startIndex = 0;
              if (data.length > 0 && (typeof data[0][0] === 'string' && (data[0][0].includes('代號') || data[0][0].includes('Code')))) {
                  startIndex = 1;
              }

              const newClients: Client[] = [];
              for(let i = startIndex; i < data.length; i++) {
                  const row = data[i];
                  if (row && row.length >= 2) {
                      const code = String(row[0] || '').trim();
                      const name = String(row[1] || '').trim();
                      if (code && name) {
                          newClients.push({
                              id: `c_${Date.now()}_${i}`,
                              code,
                              name
                          });
                      }
                  }
              }

              if (newClients.length > 0) {
                  if(window.confirm(`解析出 ${newClients.length} 筆客戶資料，是否確定匯入？\n(將附加在現有名單後)`)) {
                      const updatedClients = [...clients, ...newClients];
                      await TaskService.saveClients(updatedClients);
                      setClients(updatedClients);
                      alert("匯入成功！");
                  }
              } else {
                  alert("未讀取到有效資料，請確認 Excel 格式 (第一欄:代號, 第二欄:名稱)");
              }
          } catch(err) {
              console.error(err);
              alert("讀取 Excel 失敗");
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset input
  };
  
  // Matrix Logic
  const handleCellClick = (client: Client, column: string, task?: ClientTask) => { if (!dbConnected) return; setSelectedCell({ client, column, task }); setModalNote(task?.note || ''); setModalAssigneeId(task?.assigneeId || ''); const canModify = isSupervisor; if (task && (task.status === 'done' || task.isNA)) { setModalDate(task.completionDate || ''); setIsDateModalOpen(true); stopPolling(); return; } if (task) { if (!canModify) { setModalDate(''); setIsDateModalOpen(true); stopPolling(); return; } setIsAssignModalOpen(true); stopPolling(); } else { if (canModify) { setIsAssignModalOpen(true); stopPolling(); } } };
  const handleClientNameClick = (client: Client) => { if (!dbConnected) return; setSelectedClientForDrawer(client); stopPolling(); };
  const handleSaveProfile = (profile: ClientProfile) => { TaskService.saveClientProfile(profile); };
  const handleAssignSubmit = async (isNA: boolean = false) => { if (!selectedCell) return; setIsLoading(true); const assignee = users.find(u => u.id === modalAssigneeId); if (!isNA && !modalAssigneeId) { alert("請選擇負責人"); setIsLoading(false); return; } const newTask: ClientTask = { id: selectedCell.task?.id || Date.now().toString(), clientId: selectedCell.client.id, clientName: selectedCell.client.name, category: activeTab, workItem: selectedCell.column, year: currentYear, status: isNA ? 'done' : 'todo', isNA: isNA, assigneeId: isNA ? '' : modalAssigneeId, assigneeName: isNA ? '' : assignee?.name.substring(assignee.name.length - 2) || '', note: modalNote, lastUpdatedBy: currentUser.name, lastUpdatedAt: new Date().toISOString(), history: selectedCell.task?.history || [] }; try { const updatedList = await TaskService.addTask(newTask); setTasks(updatedList); setIsAssignModalOpen(false); setSelectedCell(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleRevertStatus = async () => { if (!selectedCell || !selectedCell.task) return; setIsLoading(true); try { if (selectedCell.task.isNA) { await TaskService.deleteTask(selectedCell.task.id); } else { await TaskService.updateTaskStatus(selectedCell.task.id, 'in_progress', currentUser.name); } const tData = await TaskService.fetchTasks(); setTasks(tData); setIsDateModalOpen(false); setSelectedCell(null); } catch(e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  const handleConfirmDelete = async () => { if(!taskToDelete) return; setIsLoading(true); try { const updatedList = await TaskService.deleteTask(taskToDelete.id); setTasks(updatedList); setIsDeleteModalOpen(false); setTaskToDelete(null); } catch (e) { alert("失敗"); } finally { setIsLoading(false); startPolling(); } };
  
  const toggleColumn = (col: string) => { const newSet = new Set(collapsedColumns); if (newSet.has(col)) newSet.delete(col); else newSet.add(col); setCollapsedColumns(newSet); };

  return (
    <div className="h-screen bg-gray-50 flex flex-col select-none overflow-hidden">
      {/* 1. App Header - Fixed Top */}
      <header className="flex-none bg-white shadow-sm z-50 h-20 border-b border-gray-200">
        <div className="w-full px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <img 
                    src="/app-aristo mountain.png"
                    alt="Logo" 
                    className="w-10 h-10 object-contain"
                />
                <h1 className="font-bold text-2xl text-gray-800 hidden md:block tracking-tight">碩業工作平台</h1>
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <select value={currentYear} onChange={(e) => { setCurrentYear(e.target.value); stopPolling(); setTimeout(() => { loadData(); startPolling(); }, 100); }} className="bg-transparent text-lg font-bold text-gray-700 focus:outline-none px-3 py-1 cursor-pointer">
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>民國{y}年</option>)}
                </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end mr-2 leading-tight"><span className="text-xs text-gray-400 font-medium">{dateStr}</span><span className="text-base font-bold text-gray-600 font-mono">{timeStr}</span></div>
            
            <button onClick={() => setIsGalleryOpen(true)} className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-yellow-600 transition-all active:scale-95 text-base font-bold" title="懶人包"><LightBulbIcon className="w-5 h-5" /></button>

            {isSupervisor && dbConnected && <button onClick={handleOpenMiscModal} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-purple-700 transition-all active:scale-95 text-base font-bold"><span className="hidden sm:inline">臨時交辦</span><span className="sm:hidden">+</span></button>}
              
            {!dbConnected ? <button title={permissionNeeded ? "點擊恢復連線" : "連結資料庫"} onClick={permissionNeeded ? handleRestoreClick : handleConnectDb} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-base font-medium hidden sm:flex ${permissionNeeded ? 'bg-blue-100 text-blue-800 animate-pulse' : 'bg-yellow-100 text-yellow-800 animate-pulse'}`}><FolderIcon className="w-6 h-6" /></button> : <button onClick={loadData} disabled={isLoading} className={`p-2 text-gray-400 hover:text-blue-500 transition-colors hidden sm:block ${isLoading ? 'animate-spin' : ''}`}><RefreshSvg className="w-7 h-7" /></button>}

            <button onClick={() => setIsCalendarOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors" title="行事曆">
                <CalendarIcon className="w-7 h-7" />
            </button>

              <button 
                onClick={() => isWorking ? setIsCheckOutModalOpen(true) : handleCheckIn()} 
                className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-base font-bold shadow-sm transition-all active:scale-95 ${
                    isWorking 
                    ? 'bg-green-500 text-white hover:bg-green-600 animate-pulse' 
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
            >
                {isWorking ? (
                    <>
                        <ClockIcon className="w-5 h-5" />
                        <span>工作中...</span>
                    </>
                ) : (
                    <>
                        <span>上班打卡</span>
                    </>
                )}
            </button>

            {/* 工時紀錄表按鈕 */}
            <button onClick={() => setIsTimesheetOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors" title="工時紀錄">
                <span className="text-xl">⏱️</span>
            </button>

            {/* ✨ 請把留言板按鈕貼在這裡 (設定按鈕的上面) ✨ */}
            <button 
                onClick={() => setIsMessageBoardOpen(true)} 
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" 
                title="事務所留言板"
            >
                <ChatBubbleIcon className="w-6 h-6" />
            </button>
              
            <button onClick={() => { setIsUserModalOpen(true); setSettingsTab('users'); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title={isSupervisor ? "人員管理" : "個人設定"}>
                <GearIcon className="w-7 h-7" />
            </button>

            {isSupervisor && <button onClick={() => setShowMyList(!showMyList)} className={`px-4 py-2 rounded-xl text-base font-medium transition-colors border flex items-center gap-2 ${showMyList ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{showMyList ? <ReturnIcon className="w-5 h-5"/> : <><UserGroupIcon className="w-5 h-5"/><span>每日進度</span></>}</button>}

            {!isSupervisor && (
                <button onClick={() => setShowOverview(!showOverview)} className={`px-4 py-2 rounded-xl text-base font-medium transition-colors border flex items-center gap-2 ${showOverview ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {showOverview ? <ReturnIcon className="w-5 h-5"/> : <><TableCellsIcon className="w-5 h-5"/><span>全所進度</span></>}
                </button>
            )}

            <div className={`flex items-center gap-3 pr-4 pl-2 py-1.5 rounded-full ${isSupervisor ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}><img src={activeUser.avatar} alt="User" className="w-10 h-10 rounded-full border border-blue-100 object-cover" /><span className="font-medium text-base hidden sm:inline">{currentUser.name}</span></div>
            <button onClick={onLogout} className="text-gray-500 hover:text-red-600 text-base font-medium transition-colors">登出</button>
          </div>
        </div>
      </header>

      {/* 2. Tabs - Fixed Below Header (Context Specific) */}
      {((isSupervisor && !showMyList) || (!isSupervisor && showOverview)) ? (
          <div className="flex-none bg-white border-b border-gray-200 z-40">
              <div className="w-full px-6">
                  <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
                      {TABS.map((tab) => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-4 px-4 border-b-4 font-medium text-xl transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                              {tab}
                          </button>
                      ))}
                  </nav>
              </div>
          </div>
      ) : null}

      {/* 3. Main Content - Scrollable Area */}
      <main className="flex-1 overflow-hidden relative w-full bg-gray-50">
        {((isSupervisor && !showMyList) || (!isSupervisor && showOverview)) ? (
            <div className="absolute inset-0 px-6 py-6">
                {!dbConnected ? <div className="text-center py-40 opacity-50"><p className="text-2xl">請先連結資料庫</p></div> : 
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
                />}
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

      {/* Settings / User / Client Management Modal */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsUserModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800"><GearIcon className="w-6 h-6 text-gray-600" />設定</h3>
                        <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                      
                      {isSupervisor && (
                          <div className="flex p-1 bg-gray-100 rounded-xl">
                              <button onClick={() => setSettingsTab('users')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settingsTab === 'users' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}>人員管理</button>
                              <button onClick={() => setSettingsTab('clients')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settingsTab === 'clients' ? 'bg-white shadow text-blue-800' : 'text-gray-500 hover:bg-gray-200'}`}>客戶管理</button>
                          </div>
                      )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} />
                  <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />

                  <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                      {isSupervisor && settingsTab === 'clients' ? (
                        <>
                            <div className="mb-6 grid grid-cols-2 gap-3">
                                <button onClick={() => excelInputRef.current?.click()} className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-md transition-colors">
                                    <TableCellsIcon className="w-5 h-5" /> 匯入 Excel
                                </button>
                                <div className="text-xs text-gray-400 flex items-center justify-center text-center leading-tight">格式: A欄代號, B欄名稱</div>
                            </div>

                            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">手動新增客戶</h4>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" placeholder="代號 (A01)" value={newClientCode} onChange={e => setNewClientCode(e.target.value)} className="w-1/3 p-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white" />
                                    <input type="text" placeholder="客戶名稱" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="flex-1 p-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white" onKeyDown={e => e.key === 'Enter' && handleAddClient()} />
                                </div>
                                <button onClick={handleAddClient} disabled={!newClientCode.trim() || !newClientName.trim()} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">新增</button>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">現有客戶名單 ({clients.length})</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {clients.map(client => (
                                        <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className="font-mono font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded text-sm">{client.code}</span>
                                                <span className="font-bold text-gray-700 text-base truncate">{client.name}</span>
                                            </div>
                                            <button onClick={() => handleDeleteClientClick(client)} className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors" title="刪除"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {clients.length === 0 && <p className="text-gray-400 text-center text-sm py-4">暫無客戶資料</p>}
                                </div>
                            </div>
                        </>
                      ) : (
                        /* User Management or Personal Settings */
                        isSupervisor ? (
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
                      )
                    )}
                  </div>
                  <div className="p-4 border-t bg-white flex justify-end"><button onClick={() => setIsUserModalOpen(false)} className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2 text-base">關閉</button></div>
              </div>
          </div>
      )}

      {/* User Delete Modal */}
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

      {/* Client Delete Modal */}
      {isClientDeleteModalOpen && clientToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><TrashIcon className="w-8 h-8 text-red-600" /></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">確認刪除客戶？</h3>
                <p className="text-base text-gray-500 mb-6">您確定要刪除 <span className="font-bold text-gray-800">{clientToDelete.name}</span> 嗎？<br/>注意：這不會刪除已存在的歷史任務。</p>
                <div className="flex gap-3">
                    <button onClick={() => setIsClientDeleteModalOpen(false)} className="flex-1 py-2.5 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-base">取消</button>
                    <button onClick={handleConfirmDeleteClient} className="flex-1 py-2.5 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-200 text-base">確認刪除</button>
                </div>
            </div>
        </div>
      )}

      {/* Client Drawer */}
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

      {/* Knowledge Gallery Modal */}
      {isGalleryOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsGalleryOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-yellow-600"><LightBulbIcon className="w-8 h-8" /><h3 className="text-2xl font-black">碩業知識庫：一圖流懶人包</h3></div>
                      <button onClick={() => setIsGalleryOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar">
                      {INSTRUCTIONS.map(inst => (
                          <div key={inst.id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer" onClick={() => setSelectedInstruction(inst)}>
                              <div className="h-48 overflow-hidden relative">
                                  <img src={inst.imageUrl} alt={inst.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                  <div className="absolute top-2 left-2"><span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">{inst.category}</span></div>
                              </div>
                              <div className="p-4">
                                  <h4 className="font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors text-lg">{inst.title}</h4>
                                  <p className="text-sm text-gray-500 line-clamp-2">{inst.description}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Instruction Detail Modal */}
      {selectedInstruction && (
          <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedInstruction(null)}>
              <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b flex justify-between items-center">
                      <h3 className="text-xl font-bold">{selectedInstruction.title}</h3>
                      <button onClick={() => setSelectedInstruction(null)} className="p-2 hover:bg-gray-100 rounded-full text-xl">✕</button>
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

      {/* Regular Assignment Modal */}
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

      {/* Date/Completion Modal */}
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
            
      {/* Check Out Modal (下班確認視窗) */}
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

      {/* Timesheet Modal (工時紀錄表視窗) */}
      {isTimesheetOpen && (
          <TimesheetView 
              currentUser={currentUser}
              users={users}
              records={checkInRecords}
              onUpdate={loadData}
              onClose={() => setIsTimesheetOpen(false)}
          />
      )}
      {/* ----------------------------------------------------------- */}

        {/* Message Board Modal */}
      {isMessageBoardOpen && (
          <MessageBoard 
              currentUser={currentUser}
              messages={messages}
              onUpdate={loadData}
              onClose={() => setIsMessageBoardOpen(false)}
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
