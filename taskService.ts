import { TabCategory } from './types';
import type {
  ClientTask, TaskStatusType, HistoryEntry, ClientProfile, User, CalendarEvent, Client,
  CheckInRecord, Message, MailRecord, CashRecord, Instruction
} from './types';
import { INITIAL_TASKS, DEFAULT_YEAR, USERS as DEFAULT_USERS, DUMMY_CLIENTS, INSTRUCTIONS } from './constants';
import { StockClientConfig, StockTarget, StockTransaction } from './types';

import { db } from './firebase'; 
import { collection, getDocs, doc, setDoc, deleteDoc, deleteField, getDoc, onSnapshot, query, where, orderBy, limit, runTransaction } from "firebase/firestore";
import type { DocumentData, QueryConstraint, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";

const USERS_STORAGE_KEY = 'shuoye_users_v1';

type RealtimeErrorHandler = (error: Error) => void;

const subscribeCollection = <T>(
    collectionName: string,
    mapDocument: (document: QueryDocumentSnapshot<DocumentData, DocumentData>) => T,
    onChanged: (items: T[]) => void,
    onError: RealtimeErrorHandler,
    constraints: QueryConstraint[] = []
): Unsubscribe => onSnapshot(
    query(collection(db, collectionName), ...constraints),
    snapshot => onChanged(snapshot.docs.map(mapDocument)),
    onError
);

const sortClients = (clients: Client[]): Client[] => clients.sort((a, b) => {
    const codeA = a.code || '';
    const codeB = b.code || '';
    return codeA.localeCompare(codeB, 'zh-Hant', { numeric: true });
});

const getMatrixTaskId = (clientId: string | number, year: string, category: string, workItem: string): string =>
    ['matrix', clientId, year, category, workItem]
        .map(value => encodeURIComponent(String(value)))
        .join('__');

const normalizeTask = (id: string, task: DocumentData): ClientTask => {
    let category = String(task.category || '').trim();

    if (['入帳', '記帳', '帳務', '帳務處理', 'accounting'].includes(category) || category === TabCategory.ACCOUNTING) {
        category = TabCategory.ACCOUNTING;
    } else if (['營業稅', '營業稅申報', '營業稅整理', 'vat'].includes(category) || category === TabCategory.TAX) {
        category = TabCategory.TAX;
    } else if (['所得/扣繳', '各類扣繳', '扣繳', '扣繳申報', '所得扣繳', 'income_tax'].includes(category) || category === TabCategory.INCOME_TAX) {
        category = TabCategory.INCOME_TAX;
    } else if (['結算', '營所稅', '結算申報', '年度申報', 'corporate_tax'].includes(category) || category === TabCategory.ANNUAL) {
        category = TabCategory.ANNUAL;
    }

    let status = task.status || 'todo';
    if (status === 'completed') status = 'done';
    if (status === 'pending') status = 'todo';

    return {
        ...task,
        id: String(id),
        clientId: String(task.clientId || ''),
        year: String(task.year || DEFAULT_YEAR),
        status: status as TaskStatusType,
        workItem: String(task.workItem || ''),
        category,
        isNA: Boolean(task.isNA),
        isMisc: Boolean(task.isMisc),
        assigneeId: String(task.assigneeId || ''),
        assigneeName: String(task.assigneeName || ''),
        completionDate: String(task.completionDate || ''),
        history: task.history || []
    } as ClientTask;
};

export const TaskService = {
  // ==========================================
  // 🚀 系統連線狀態 (Firebase 永遠在線，直接回傳 true)
  // ==========================================
  isUsingLocalStorage(): boolean {
    return false; // 告訴系統我們不再使用 LocalStorage
  },

  async connectDatabase(): Promise<boolean> {
    return true; // 假裝連接成功，不再跳出要求選擇檔案的視窗
  },

  async restoreConnection(triggerPrompt: boolean = false): Promise<'connected' | 'permission_needed' | 'failed'> {
    return 'connected'; // 永遠告訴 UI「已連線」，讓使用者可以直接登入
  },

  isConnected(): boolean { 
    return true; 
  },

  // 防呆：系統啟動時會呼叫這個，我們剛好用來同步頭貼！
  async loadFullData(): Promise<any> {
      console.warn("系統已全面升級 Firebase，不再使用 loadFullData");
      
      // ✨ 系統啟動時，偷偷去雲端把同事們的新頭貼抓下來！
      await this.syncUsersFromCloud(); 
      
      return { tasks: [], events: [], clients: [] };
  },
  
  async saveFullData(data: any): Promise<void> {
      console.log("🚀 開始將舊資料全面遷移至 Firebase...");

      // 1. 基礎核心資料
      if (data.clients && data.clients.length > 0) { await this.saveClients(data.clients); }
      if (data.tasks && data.tasks.length > 0) {
          for (const t of data.tasks) { await setDoc(doc(db, "tasks", String(t.id)), t); }
      }
      if (data.events && data.events.length > 0) {
          for (const e of data.events) { await setDoc(doc(db, "events", String(e.id)), e); }
      }
      if (data.checkIns && data.checkIns.length > 0) {
          for (const c of data.checkIns) { await setDoc(doc(db, "checkIns", String(c.id)), c); }
      }

      // 2. 📝 你發現漏掉的行政與帳務資料！
      if (data.mailRecords && data.mailRecords.length > 0) {
          for (const m of data.mailRecords) { await setDoc(doc(db, "mailRecords", String(m.id)), m); }
      }
      if (data.cashRecords && data.cashRecords.length > 0) {
          for (const c of data.cashRecords) { await setDoc(doc(db, "cashRecords", String(c.id)), c); }
      }
      if (data.messages && data.messages.length > 0) {
          for (const m of data.messages) { await setDoc(doc(db, "messages", String(m.id)), m); }
      }
      if (data.instructions && data.instructions.length > 0) {
          for (const i of data.instructions) { await setDoc(doc(db, "instructions", String(i.id)), i); }
      }
      if (data.clientProfiles && data.clientProfiles.length > 0) {
          for (const p of data.clientProfiles) { await setDoc(doc(db, "clientProfiles", String(p.clientId)), p); }
      }
      
      // 3. 💼 進階模組：股票與薪資系統
      if (data.stockClients && data.stockClients.length > 0) {
          for (const s of data.stockClients) { await setDoc(doc(db, "stockClients", String(s.id)), s); }
      }
      if (data.stockTargets && data.stockTargets.length > 0) {
          for (const s of data.stockTargets) { await setDoc(doc(db, "stockTargets", String(s.id)), s); }
      }
      if (data.stockTransactions && data.stockTransactions.length > 0) {
          for (const s of data.stockTransactions) { await setDoc(doc(db, "stockTransactions", String(s.id)), s); }
      }
      if (data.payrollClients && data.payrollClients.length > 0) {
          for (const p of data.payrollClients) { await setDoc(doc(db, "payrollClients", String(p.clientId)), p); }
      }
      if (data.payrollRecords && data.payrollRecords.length > 0) {
          for (const p of data.payrollRecords) { await setDoc(doc(db, "payrollRecords", String(p.id)), p); }
      }
      if (data.employees && data.employees.length > 0) {
          for (const e of data.employees) { await setDoc(doc(db, "employees", String(e.id)), e); }
      }
      if (data.monthlySalaries && data.monthlySalaries.length > 0) {
          for (const m of data.monthlySalaries) { await setDoc(doc(db, "monthlySalaries", String(m.id)), m); }
      }

      alert("🎉 舊資料已『全數』升級並寫入 Firebase 雲端！請重新整理網頁。");
  },

  // ==========================================
  // 👤 使用者名單與頭貼管理 (混合雲端同步版)
  // ==========================================
  getUsers: (): User[] => {
      // 1. 維持瞬間讀取本機快取，確保登入畫面秒開不白屏
      const cached = localStorage.getItem(USERS_STORAGE_KEY);
      if (cached) {
          let parsedUsers: User[] = JSON.parse(cached);
          // 以 DEFAULT_USERS 的 role 為權威來源，避免快取角色過時
          parsedUsers = parsedUsers.map(u => {
              const defaultUser = DEFAULT_USERS.find(d => d.id === u.id);
              return defaultUser ? { ...u, role: defaultUser.role } : u;
          });
          // 防呆：確保預設名單(如新主管)一定存在
          let hasNewUser = false;
          DEFAULT_USERS.forEach(defaultUser => {
              if (!parsedUsers.find(u => u.id === defaultUser.id)) {
                  parsedUsers.unshift(defaultUser);
                  hasNewUser = true;
              }
          });
          if (hasNewUser) localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsedUsers));
          return parsedUsers;
      }
      return DEFAULT_USERS;
  },

  async saveUsers(users: User[]): Promise<void> {
      // 2. 自己換完頭貼，立刻存入自己的電腦
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      
      // 3. ✨ 同時把新頭貼上傳到 Firebase 的 "users" 抽屜，讓全世界看到！
      for (const user of users) {
          await setDoc(doc(db, "users", String(user.id)), user);
      }
  },

  async syncUsersFromCloud(): Promise<void> {
      // 4. 去 Firebase 抓大家最新的頭貼下來
      const snapshot = await getDocs(collection(db, "users"));
      if (!snapshot.empty) {
          let cloudUsers = snapshot.docs.map(d => d.data() as User);

          // DEFAULT_USERS 依定義順序排前面，新增使用者依序補在最後
          let finalUsers: User[] = DEFAULT_USERS.map(defaultUser => {
              const cloudUser = cloudUsers.find(u => u.id === defaultUser.id);
              return cloudUser ? { ...cloudUser, role: defaultUser.role } : defaultUser;
          });
          cloudUsers.forEach(cloudUser => {
              if (!DEFAULT_USERS.find(d => d.id === cloudUser.id)) {
                  finalUsers.push(cloudUser);
              }
          });
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(finalUsers));

          // 把修正後的角色同步回 Firebase，確保雲端也是最新狀態
          for (const u of finalUsers) {
              const defaultUser = DEFAULT_USERS.find(d => d.id === u.id);
              if (defaultUser) {
                  await setDoc(doc(db, "users", String(u.id)), u);
              }
          }
      } else {
          // 如果 Firebase 裡面還沒有名單，就把預設名單推上去建立檔案
          await this.saveUsers(DEFAULT_USERS);
      }
  },
 
  // ==========================================
  // ☁️ Firebase 雲端版：工作任務 API (Tasks)
  // ==========================================

  async fetchTasks(): Promise<ClientTask[]> {
      const snapshot = await getDocs(collection(db, "tasks"));
      return snapshot.docs.map(d => normalizeTask(d.id, d.data()));
  },

  subscribeTasks(
      onTasksChanged: (tasks: ClientTask[]) => void,
      onError: RealtimeErrorHandler
  ): Unsubscribe {
      return subscribeCollection("tasks", d => normalizeTask(d.id, d.data()), onTasksChanged, onError);
  },

  subscribeTasksForYear(year: string, onChanged: (items: ClientTask[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("tasks", d => normalizeTask(d.id, d.data()), onChanged, onError, [where("year", "==", year)]);
  },

  subscribeUsers(onChanged: (items: User[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection(
          "users",
          d => ({ ...d.data(), id: d.id } as User),
          cloudUsers => {
              const finalUsers = DEFAULT_USERS.map(defaultUser => {
                  const cloudUser = cloudUsers.find(user => user.id === defaultUser.id);
                  return cloudUser ? { ...cloudUser, role: defaultUser.role } : defaultUser;
              });
              cloudUsers.forEach(cloudUser => {
                  if (!DEFAULT_USERS.find(defaultUser => defaultUser.id === cloudUser.id)) finalUsers.push(cloudUser);
              });
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(finalUsers));
              onChanged(finalUsers);
          },
          onError
      );
  },

  subscribeEvents(onChanged: (items: CalendarEvent[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("events", d => ({ id: d.id, ...d.data() } as CalendarEvent), onChanged, onError);
  },

  subscribeEventsForRange(startDate: string, endDate: string, onChanged: (items: CalendarEvent[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("events", d => ({ id: d.id, ...d.data() } as CalendarEvent), onChanged, onError, [
          where("date", ">=", startDate),
          where("date", "<=", endDate)
      ]);
  },

  subscribeClients(onChanged: (items: Client[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("clients", d => ({ ...d.data(), id: d.id } as Client), items => onChanged(sortClients(items)), onError);
  },

  subscribeClientProfile(clientId: string | number, onChanged: (profile: ClientProfile) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return onSnapshot(
          doc(db, "clientProfiles", String(clientId)),
          snapshot => onChanged(snapshot.exists()
              ? snapshot.data() as ClientProfile
              : { clientId, specialNotes: "", accountingNotes: "", tags: [] }),
          onError
      );
  },

  subscribeCheckIns(onChanged: (items: CheckInRecord[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("checkIns", d => ({ id: d.id, ...d.data() } as CheckInRecord), onChanged, onError);
  },

  subscribeCheckInsForMonth(month: string, onChanged: (items: CheckInRecord[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("checkIns", d => ({ id: d.id, ...d.data() } as CheckInRecord), onChanged, onError, [
          where("date", ">=", `${month}-01`),
          where("date", "<=", `${month}-31`)
      ]);
  },

  subscribeMessages(onChanged: (items: Message[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("messages", d => ({ id: d.id, ...d.data() } as Message), onChanged, onError);
  },

  subscribeLatestMessages(maxItems: number, onChanged: (items: Message[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("messages", d => ({ id: d.id, ...d.data() } as Message), onChanged, onError, [
          orderBy("createdAt", "desc"),
          limit(maxItems)
      ]);
  },

  subscribeMailRecords(onChanged: (items: MailRecord[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("mailRecords", d => ({ id: d.id, ...d.data() } as MailRecord), onChanged, onError);
  },

  subscribeCashRecords(onChanged: (items: CashRecord[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("cashRecords", d => ({ id: d.id, ...d.data() } as CashRecord), onChanged, onError);
  },

  subscribeInstructions(onChanged: (items: Instruction[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("instructions", d => ({ id: d.id, ...d.data() } as Instruction), onChanged, onError);
  },

  subscribeStockClients(onChanged: (items: StockClientConfig[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("stockClients", d => ({ id: d.id, ...d.data() } as StockClientConfig), onChanged, onError);
  },

  subscribeStockTargets(onChanged: (items: StockTarget[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("stockTargets", d => ({ id: d.id, ...d.data() } as StockTarget), onChanged, onError);
  },

  subscribeStockTransactions(onChanged: (items: StockTransaction[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("stockTransactions", d => ({ id: d.id, ...d.data() } as StockTransaction), onChanged, onError);
  },

  subscribePayrollClients(onChanged: (items: import('./types').PayrollClientConfig[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("payrollClients", d => ({ ...d.data(), clientId: d.id } as import('./types').PayrollClientConfig), onChanged, onError);
  },

  subscribePayrollRecords(onChanged: (items: import('./types').PayrollRecord[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("payrollRecords", d => ({ id: d.id, ...d.data() } as import('./types').PayrollRecord), onChanged, onError);
  },

  subscribeEmployees(onChanged: (items: import('./types').Employee[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("employees", d => ({ id: d.id, ...d.data() } as import('./types').Employee), onChanged, onError);
  },

  subscribeMonthlySalaries(onChanged: (items: import('./types').MonthlySalaryRecord[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("monthlySalaries", d => ({ id: d.id, ...d.data() } as import('./types').MonthlySalaryRecord), onChanged, onError);
  },

  subscribeMonthlySalariesForClient(clientId: string, onChanged: (items: import('./types').MonthlySalaryRecord[]) => void, onError: RealtimeErrorHandler): Unsubscribe {
      return subscribeCollection("monthlySalaries", d => ({ id: d.id, ...d.data() } as import('./types').MonthlySalaryRecord), onChanged, onError, [
          where("clientId", "==", clientId)
      ]);
  },
  
  async addTask(task: ClientTask): Promise<void> {
      const { id, ...data } = task; // 把本機的隨機 id 抽掉，準備存入 Firebase
      
      const historyEntry: HistoryEntry = {
          timestamp: new Date().toISOString(),
          userName: task.lastUpdatedBy,
          action: task.isMisc ? "初始派案 (臨時)" : "初始派案",
          details: task.isNA ? "標記為 N/A" : `指派給: ${task.assigneeName || '無'}`
      };

      // ✨ 直接寫入雲端 (使用自訂 ID 確保未來關聯性不變)
      await setDoc(doc(db, "tasks", String(id)), {
          ...data,
          history: [historyEntry]
      });
      
  },

  getMatrixTaskId,

  async saveMatrixTask(task: ClientTask, createOnly: boolean): Promise<void> {
      const taskRef = doc(db, "tasks", String(task.id));

      await runTransaction(db, async transaction => {
          const snapshot = await transaction.get(taskRef);
          if (createOnly && snapshot.exists()) {
              throw new Error('TASK_ALREADY_EXISTS');
          }

          const existing = snapshot.exists() ? snapshot.data() as ClientTask : undefined;
          const historyEntry: HistoryEntry = {
              timestamp: new Date().toISOString(),
              userName: task.lastUpdatedBy,
              action: task.isNA ? "標記為 N/A" : "指派工作",
              ...(!task.isNA ? { details: `指派給: ${task.assigneeName || '無'}` } : {})
          };

          const { id, ...data } = task;
          transaction.set(taskRef, {
              ...data,
              entrySource: task.entrySource || 'assigned',
              history: [historyEntry, ...(existing?.history || task.history || [])].slice(0, 20)
          });
      });
  },

  async completeMatrixTaskForSelf(task: ClientTask, user: User): Promise<void> {
      const taskRef = doc(db, "tasks", String(task.id));

      await runTransaction(db, async transaction => {
          const snapshot = await transaction.get(taskRef);
          const existing = snapshot.exists() ? snapshot.data() as ClientTask : undefined;

          if (existing?.isNA || existing?.status === 'done') {
              throw new Error('TASK_ALREADY_COMPLETED');
          }
          if (existing?.assigneeId && String(existing.assigneeId) !== String(user.id)) {
              throw new Error('TASK_ASSIGNED_TO_OTHER');
          }

          const now = new Date().toISOString();
          const historyEntry: HistoryEntry = {
              timestamp: now,
              userName: user.name,
              action: "由本人自行登記完成",
              ...(task.completionDate ? { details: `完成日期: ${task.completionDate}` } : {})
          };
          const { id, ...data } = task;

          transaction.set(taskRef, {
              ...data,
              status: 'done',
              isNA: false,
              assigneeId: user.id,
              assigneeName: user.name,
              completedAt: now,
              entrySource: 'self_reported',
              lastUpdatedBy: user.name,
              lastUpdatedAt: now,
              history: [historyEntry, ...(existing?.history || task.history || [])].slice(0, 20)
          }, { merge: snapshot.exists() });
      });
  },

  async deleteTask(taskId: string): Promise<void> {
      // ✨ 雲端刪除指令：直接指定 ID 刪除，不影響其他任務！
      await deleteDoc(doc(db, "tasks", String(taskId)));
  },

  async updateTaskStatus(taskId: string, status: TaskStatusType, user: string, completionDate?: string): Promise<void> {
      const ref = doc(db, "tasks", String(taskId));
      const docSnap = await getDoc(ref);
      
      if (docSnap.exists()) {
          const taskData = docSnap.data() as ClientTask;
          const historyEntry: HistoryEntry = {
              timestamp: new Date().toISOString(),
              userName: user,
              action: `更改狀態至 ${status}`,
              ...(completionDate ? { details: `完成日期: ${completionDate}` } : {})
          };
          
          // ✨ 雲端局部更新：merge: true 代表只更新有變動的欄位，超級省流量！
          await setDoc(ref, {
              status: status,
              completionDate: completionDate !== undefined ? completionDate : taskData.completionDate,
              completedAt: status === 'done' ? new Date().toISOString() : deleteField(),
              lastUpdatedBy: user,
              lastUpdatedAt: new Date().toISOString(),
              history: [historyEntry, ...(taskData.history || [])].slice(0, 20)
          }, { merge: true });
      }
  },

  async updateTaskNote(taskId: string, note: string, user: string): Promise<void> {
      const ref = doc(db, "tasks", String(taskId));
      const docSnap = await getDoc(ref);
      
      if (docSnap.exists()) {
          const taskData = docSnap.data() as ClientTask;
          const historyEntry: HistoryEntry = {
              timestamp: new Date().toISOString(),
              userName: user,
              action: "更新備註",
              details: note.substring(0, 20) + (note.length > 20 ? "..." : "")
          };
          
          await setDoc(ref, {
              note: note,
              lastUpdatedBy: user,
              lastUpdatedAt: new Date().toISOString(),
              history: [historyEntry, ...(taskData.history || [])].slice(0, 20)
          }, { merge: true });
      }
  },
  // ==========================================

  // ==========================================
  // ☁️ Firebase 雲端版：行事曆/排班 API (Events)
  // ==========================================

  async fetchEvents(): Promise<CalendarEvent[]> {
      // 1. 去 Firebase 找 "events" 這個抽屜
      const snapshot = await getDocs(collection(db, "events"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
  },

  async addEvent(event: CalendarEvent): Promise<void> {
      const { id, ...data } = event;
      
      // 2. 寫入單筆行事曆事件
      await setDoc(doc(db, "events", String(id)), data);
  },

  async updateEvent(updatedEvent: CalendarEvent): Promise<void> {
      const { id, ...data } = updatedEvent;
      
      // 3. 雲端局部更新事件 (例如把請假改成排班，或修改備註)
      await setDoc(doc(db, "events", String(id)), data, { merge: true });
  },

  async deleteEvent(eventId: string): Promise<void> {
      // 4. 精準刪除單一事件
      await deleteDoc(doc(db, "events", String(eventId)));
  },


  // ==========================================
  // ☁️ Firebase 雲端版：客戶資料 (Clients & Profiles)
  // ==========================================
  async fetchClients(): Promise<Client[]> {
      const snapshot = await getDocs(collection(db, "clients"));
      const clients = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Client));
      return sortClients(clients);
  },

  async saveClients(clients: Client[]): Promise<void> {
      // 批次寫入客戶資料
      for (const client of clients) {
          await setDoc(doc(db, "clients", String(client.id)), client);
      }
  },

  // ✨ 補上遺漏的刪除客戶雲端指令
  async deleteClient(clientId: string | number): Promise<Client[]> {
      // 1. 刪除客戶主檔
      await deleteDoc(doc(db, "clients", String(clientId)));
      
      // 2. (順手清理) 把該客戶的專屬備註設定檔也一併刪除，保持雲端資料庫乾淨
      await deleteDoc(doc(db, "clientProfiles", String(clientId)));
      
      return this.fetchClients();
  },

  async getClientProfile(clientId: string | number): Promise<ClientProfile> {
      // 去 Firebase 拿這家客戶的專屬備註抽屜
      const docSnap = await getDoc(doc(db, "clientProfiles", String(clientId)));
      if (docSnap.exists()) {
          return docSnap.data() as ClientProfile;
      }
      return { clientId, specialNotes: "", accountingNotes: "", tags: [] };
  },

  async saveClientProfile(profile: ClientProfile): Promise<void> {
      await setDoc(doc(db, "clientProfiles", String(profile.clientId)), profile, { merge: true });
  },

  // ==========================================
  // ☁️ Firebase 雲端版：打卡系統 (CheckIns)
  // ==========================================
  async fetchCheckIns(): Promise<CheckInRecord[]> {
      const snapshot = await getDocs(collection(db, "checkIns"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CheckInRecord));
  },

  async addCheckIn(record: CheckInRecord): Promise<void> {
      await setDoc(doc(db, "checkIns", String(record.id)), record);
  },

  async updateCheckIn(updatedRecord: CheckInRecord): Promise<void> {
      await setDoc(doc(db, "checkIns", String(updatedRecord.id)), updatedRecord, { merge: true });
  },

  async deleteCheckIn(recordId: string): Promise<void> {
      await deleteDoc(doc(db, "checkIns", String(recordId)));
  },

  // ==========================================
  // ☁️ Firebase 雲端版：留言板 (Messages)
  // ==========================================
  async fetchMessages(): Promise<Message[]> {
      const snapshot = await getDocs(collection(db, "messages"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
  },

  async addMessage(msg: Message): Promise<void> {
      await setDoc(doc(db, "messages", String(msg.id)), msg);
  },

  async deleteMessage(msgId: string): Promise<void> {
      await deleteDoc(doc(db, "messages", String(msgId)));
  },

  // ==========================================
  // ☁️ Firebase 雲端版：收發信件 (MailRecords)
  // ==========================================
  async fetchMailRecords(): Promise<MailRecord[]> {
      const snapshot = await getDocs(collection(db, "mailRecords"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MailRecord));
  },

  async addMailRecord(record: MailRecord): Promise<void> {
      await setDoc(doc(db, "mailRecords", String(record.id)), record);
  },

  async addMailRecordsBatch(records: MailRecord[]): Promise<void> {
      for (const record of records) {
          await setDoc(doc(db, "mailRecords", String(record.id)), record);
      }
  },

  async updateMailRecord(updated: MailRecord): Promise<void> {
      await setDoc(doc(db, "mailRecords", String(updated.id)), updated, { merge: true });
  },

  async deleteMailRecord(id: string): Promise<void> {
      await deleteDoc(doc(db, "mailRecords", String(id)));
  },

  // ==========================================
  // ☁️ Firebase 雲端版：零用金 (CashRecords)
  // ==========================================
  async fetchCashRecords(): Promise<CashRecord[]> {
      const snapshot = await getDocs(collection(db, "cashRecords"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashRecord));
  },

  async addCashRecord(record: CashRecord): Promise<void> {
      const clean = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
      await setDoc(doc(db, "cashRecords", String(record.id)), clean);
  },

  async updateCashRecord(updated: CashRecord): Promise<void> {
      const clean = Object.fromEntries(Object.entries(updated).filter(([, v]) => v !== undefined));
      await setDoc(doc(db, "cashRecords", String(updated.id)), clean, { merge: true });
  },

  async deleteCashRecord(id: string): Promise<void> {
      await deleteDoc(doc(db, "cashRecords", String(id)));
  },

// ==========================================
  // ☁️ Firebase 雲端版：作業指導書 (Instructions)
  // ==========================================
  async fetchInstructions(): Promise<Instruction[]> {
      const snapshot = await getDocs(collection(db, "instructions"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Instruction));
  },

  async addInstruction(instruction: Instruction): Promise<void> {
      await setDoc(doc(db, "instructions", String(instruction.id)), instruction);
  },

  async updateInstruction(updated: Instruction): Promise<void> {
      await setDoc(doc(db, "instructions", String(updated.id)), updated, { merge: true });
  },

  async deleteInstruction(id: string): Promise<void> {
      await deleteDoc(doc(db, "instructions", String(id)));
  },

  // ==========================================
  // ☁️ Firebase 雲端版：股票進銷存系統 (Stock Inventory)
  // ==========================================
  async fetchStockClients(): Promise<StockClientConfig[]> {
      const snapshot = await getDocs(collection(db, "stockClients"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockClientConfig));
  },

  async addStockClient(config: StockClientConfig): Promise<void> {
      await setDoc(doc(db, "stockClients", String(config.id)), config);
  },

  async deleteStockClient(id: string): Promise<void> {
      await deleteDoc(doc(db, "stockClients", String(id)));
  },

  async fetchStockTargets(): Promise<StockTarget[]> {
      const snapshot = await getDocs(collection(db, "stockTargets"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockTarget));
  },

  async addStockTarget(target: StockTarget): Promise<void> {
      await setDoc(doc(db, "stockTargets", String(target.id)), target);
  },

  async deleteStockTarget(id: string): Promise<void> {
      await deleteDoc(doc(db, "stockTargets", String(id)));
  },
    
  async fetchStockTransactions(): Promise<StockTransaction[]> {
      const snapshot = await getDocs(collection(db, "stockTransactions"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockTransaction));
  },

  async addStockTransaction(tx: StockTransaction): Promise<void> {
      await setDoc(doc(db, "stockTransactions", String(tx.id)), tx);
  },

  async updateStockTransaction(updatedTx: StockTransaction): Promise<void> {
      await setDoc(doc(db, "stockTransactions", String(updatedTx.id)), updatedTx, { merge: true });
  },

  async deleteStockTransaction(id: string): Promise<void> {
      await deleteDoc(doc(db, "stockTransactions", String(id)));
  },

  // ==========================================
  // ☁️ Firebase 雲端版：薪資計算系統 (Payroll) & 員工名單
  // ==========================================
  async fetchPayrollClients(): Promise<import('./types').PayrollClientConfig[]> {
      const snapshot = await getDocs(collection(db, "payrollClients"));
      // 注意：PayrollClientConfig 是用 clientId 當主鍵
      return snapshot.docs.map(d => ({ ...d.data(), clientId: d.id } as import('./types').PayrollClientConfig));
  },
    
  async savePayrollClients(payrollClients: import('./types').PayrollClientConfig[]): Promise<void> {
      for (const client of payrollClients) {
          await setDoc(doc(db, "payrollClients", String(client.clientId)), client);
      }
  },
    
  async addPayrollClient(client: import('./types').PayrollClientConfig): Promise<void> {
      await setDoc(doc(db, "payrollClients", String(client.clientId)), client);
  },
    
  async deletePayrollClient(clientId: string): Promise<void> {
      await deleteDoc(doc(db, "payrollClients", String(clientId)));
  },

  async fetchPayrollRecords(): Promise<import('./types').PayrollRecord[]> {
      const snapshot = await getDocs(collection(db, "payrollRecords"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as import('./types').PayrollRecord));
  },
    
  async savePayrollRecords(payrollRecords: import('./types').PayrollRecord[]): Promise<void> {
      for (const record of payrollRecords) {
          await setDoc(doc(db, "payrollRecords", String(record.id)), record);
      }
  },

  // ✨ 員工名單 API (Employee)
  async fetchEmployees(): Promise<import('./types').Employee[]> {
      const snapshot = await getDocs(collection(db, "employees"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as import('./types').Employee));
  },

  async saveEmployees(employees: import('./types').Employee[]): Promise<void> {
      for (const emp of employees) {
          await setDoc(doc(db, "employees", String(emp.id)), emp);
      }
  },

  async addEmployee(employee: import('./types').Employee): Promise<void> {
      await setDoc(doc(db, "employees", String(employee.id)), employee);
  },

  async updateEmployee(updated: import('./types').Employee): Promise<void> {
      await setDoc(doc(db, "employees", String(updated.id)), updated, { merge: true });
  },

  async deleteEmployee(id: string): Promise<void> {
      await deleteDoc(doc(db, "employees", String(id)));
  },

  // ✨ 每月薪資結算 API (Monthly Salary)
  async fetchMonthlySalaries(): Promise<import('./types').MonthlySalaryRecord[]> {
      const snapshot = await getDocs(collection(db, "monthlySalaries"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as import('./types').MonthlySalaryRecord));
  },

  async saveMonthlySalaries(monthlySalaries: import('./types').MonthlySalaryRecord[]): Promise<void> {
      for (const record of monthlySalaries) {
          await setDoc(doc(db, "monthlySalaries", String(record.id)), record);
      }
  }

}; // ✅ TaskService 結尾
