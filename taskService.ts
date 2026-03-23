import { TabCategory } from './types';
import type { ClientTask, TaskStatusType, HistoryEntry, ClientProfile, User, CalendarEvent, Client } from './types';
import { INITIAL_TASKS, DEFAULT_YEAR, USERS as DEFAULT_USERS, DUMMY_CLIENTS, INSTRUCTIONS } from './constants';
import { StockClientConfig, StockTarget, StockTransaction } from './types';

import { db } from './firebase'; 
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const USERS_STORAGE_KEY = 'shuoye_users_v1';

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
          const parsedUsers: User[] = JSON.parse(cached);
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
          const cloudUsers = snapshot.docs.map(d => d.data() as User);
          
          // 把雲端抓下來的名單與本機合併更新
          let finalUsers = [...cloudUsers];
          DEFAULT_USERS.forEach(defaultUser => {
              if (!finalUsers.find(u => u.id === defaultUser.id)) {
                  finalUsers.unshift(defaultUser);
              }
          });
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(finalUsers));
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
      const tasks = snapshot.docs.map(d => {
          const t = d.data();
          
          // 🛡️ 防線 1：分類名稱智能對齊 (終極直球對決版)
          // 拋棄英文變數，不管舊資料叫什麼，強制翻譯成畫面「唯一指定」的標準中文！
          let cat = String(t.category || '').trim();
          
          if (cat === '入帳' || cat === '記帳' || cat === '帳務' || cat === '帳務處理' || cat === 'accounting' || cat === TabCategory.ACCOUNTING) {
              cat = '帳務處理'; 
          } else if (cat === '營業稅' || cat === '營業稅申報' || cat === '營業稅整理' || cat === 'vat' || cat === (TabCategory as any).VAT) {
              cat = '營業稅整理'; // 👈 絕對鎖死這個名稱
          } else if (cat === '所得/扣繳' || cat === '各類扣繳' || cat === '扣繳' || cat === '扣繳申報' || cat === 'income_tax' || cat === (TabCategory as any).INCOME_TAX) {
              cat = '扣繳申報';
          } else if (cat === '結算' || cat === '營所稅' || cat === '結算申報' || cat === 'corporate_tax' || cat === (TabCategory as any).CORPORATE_TAX) {
              cat = '結算申報';
          }

          // 🛡️ 防線 2：確保狀態符合前端的燈號邏輯
          let finalStatus = t.status || 'todo';
          if (finalStatus === 'completed') finalStatus = 'done';
          if (finalStatus === 'pending') finalStatus = 'todo';

          return {
              ...t,
              id: String(d.id), 
              
              // 🚨 致命關鍵防線 3：強制將 clientId 與 year 轉為「字串」
              clientId: String(t.clientId || ''),
              year: String(t.year || DEFAULT_YEAR),
              
              status: finalStatus as TaskStatusType,
              workItem: String(t.workItem || ''),
              category: cat,  // 這裡輸出的絕對會是完美的中文名稱
              isNA: Boolean(t.isNA),
              isMisc: Boolean(t.isMisc),
              assigneeId: String(t.assigneeId || ''),
              assigneeName: String(t.assigneeName || ''),
              completionDate: String(t.completionDate || ''),
              history: t.history || []
          } as ClientTask;
      });
      return tasks;
  },
  
  async addTask(task: ClientTask): Promise<ClientTask[]> {
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
      
      return this.fetchTasks();
  },

  async deleteTask(taskId: string): Promise<ClientTask[]> {
      // ✨ 雲端刪除指令：直接指定 ID 刪除，不影響其他任務！
      await deleteDoc(doc(db, "tasks", String(taskId)));
      return this.fetchTasks();
  },

  async updateTaskStatus(taskId: string, status: TaskStatusType, user: string, completionDate?: string): Promise<ClientTask[]> {
      const ref = doc(db, "tasks", String(taskId));
      const docSnap = await getDoc(ref);
      
      if (docSnap.exists()) {
          const taskData = docSnap.data() as ClientTask;
          const historyEntry: HistoryEntry = {
              timestamp: new Date().toISOString(),
              userName: user,
              action: `更改狀態至 ${status}`,
              details: completionDate ? `完成日期: ${completionDate}` : undefined
          };
          
          // ✨ 雲端局部更新：merge: true 代表只更新有變動的欄位，超級省流量！
          await setDoc(ref, {
              status: status,
              completionDate: completionDate !== undefined ? completionDate : taskData.completionDate,
              lastUpdatedBy: user,
              lastUpdatedAt: new Date().toISOString(),
              history: [historyEntry, ...(taskData.history || [])].slice(0, 20)
          }, { merge: true });
      }
      return this.fetchTasks();
  },

  async updateTaskNote(taskId: string, note: string, user: string): Promise<ClientTask[]> {
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
      return this.fetchTasks();
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

  async addEvent(event: CalendarEvent): Promise<CalendarEvent[]> {
      const { id, ...data } = event;
      
      // 2. 寫入單筆行事曆事件
      await setDoc(doc(db, "events", String(id)), data);
      return this.fetchEvents();
  },

  async updateEvent(updatedEvent: CalendarEvent): Promise<CalendarEvent[]> {
      const { id, ...data } = updatedEvent;
      
      // 3. 雲端局部更新事件 (例如把請假改成排班，或修改備註)
      await setDoc(doc(db, "events", String(id)), data, { merge: true });
      return this.fetchEvents();
  },

  async deleteEvent(eventId: string): Promise<CalendarEvent[]> {
      // 4. 精準刪除單一事件
      await deleteDoc(doc(db, "events", String(eventId)));
      return this.fetchEvents();
  },


  // ==========================================
  // ☁️ Firebase 雲端版：客戶資料 (Clients & Profiles)
  // ==========================================
  async fetchClients(): Promise<Client[]> {
      const snapshot = await getDocs(collection(db, "clients"));
      const clients = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
      // 依照代號 (A01, A02...) 排序
      return clients.sort((a, b) => {
          const codeA = a.code || '';
          const codeB = b.code || '';
          return codeA.localeCompare(codeB, 'zh-Hant', { numeric: true });
      });
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

  async getClientProfile(clientId: string): Promise<ClientProfile> {
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

  async addCheckIn(record: CheckInRecord): Promise<CheckInRecord[]> {
      await setDoc(doc(db, "checkIns", String(record.id)), record);
      return this.fetchCheckIns();
  },

  async updateCheckIn(updatedRecord: CheckInRecord): Promise<CheckInRecord[]> {
      await setDoc(doc(db, "checkIns", String(updatedRecord.id)), updatedRecord, { merge: true });
      return this.fetchCheckIns();
  },

  async deleteCheckIn(recordId: string): Promise<CheckInRecord[]> {
      await deleteDoc(doc(db, "checkIns", String(recordId)));
      return this.fetchCheckIns();
  },

  // ==========================================
  // ☁️ Firebase 雲端版：留言板 (Messages)
  // ==========================================
  async fetchMessages(): Promise<Message[]> {
      const snapshot = await getDocs(collection(db, "messages"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
  },

  async addMessage(msg: Message): Promise<Message[]> {
      await setDoc(doc(db, "messages", String(msg.id)), msg);
      return this.fetchMessages();
  },

  async deleteMessage(msgId: string): Promise<Message[]> {
      await deleteDoc(doc(db, "messages", String(msgId)));
      return this.fetchMessages();
  },

  // ==========================================
  // ☁️ Firebase 雲端版：收發信件 (MailRecords)
  // ==========================================
  async fetchMailRecords(): Promise<MailRecord[]> {
      const snapshot = await getDocs(collection(db, "mailRecords"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MailRecord));
  },

  async addMailRecord(record: MailRecord): Promise<MailRecord[]> {
      await setDoc(doc(db, "mailRecords", String(record.id)), record);
      return this.fetchMailRecords();
  },

  async addMailRecordsBatch(records: MailRecord[]): Promise<MailRecord[]> {
      for (const record of records) {
          await setDoc(doc(db, "mailRecords", String(record.id)), record);
      }
      return this.fetchMailRecords();
  },

  async updateMailRecord(updated: MailRecord): Promise<MailRecord[]> {
      await setDoc(doc(db, "mailRecords", String(updated.id)), updated, { merge: true });
      return this.fetchMailRecords();
  },

  async deleteMailRecord(id: string): Promise<MailRecord[]> {
      await deleteDoc(doc(db, "mailRecords", String(id)));
      return this.fetchMailRecords();
  },

  // ==========================================
  // ☁️ Firebase 雲端版：零用金 (CashRecords)
  // ==========================================
  async fetchCashRecords(): Promise<CashRecord[]> {
      const snapshot = await getDocs(collection(db, "cashRecords"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashRecord));
  },

  async addCashRecord(record: CashRecord): Promise<CashRecord[]> {
      await setDoc(doc(db, "cashRecords", String(record.id)), record);
      return this.fetchCashRecords();
  },

  async updateCashRecord(updated: CashRecord): Promise<CashRecord[]> {
      await setDoc(doc(db, "cashRecords", String(updated.id)), updated, { merge: true });
      return this.fetchCashRecords();
  },

  async deleteCashRecord(id: string): Promise<CashRecord[]> {
      await deleteDoc(doc(db, "cashRecords", String(id)));
      return this.fetchCashRecords();
  },

// ==========================================
  // ☁️ Firebase 雲端版：作業指導書 (Instructions)
  // ==========================================
  async fetchInstructions(): Promise<Instruction[]> {
      const snapshot = await getDocs(collection(db, "instructions"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Instruction));
  },

  async addInstruction(instruction: Instruction): Promise<Instruction[]> {
      await setDoc(doc(db, "instructions", String(instruction.id)), instruction);
      return this.fetchInstructions();
  },

  async updateInstruction(updated: Instruction): Promise<Instruction[]> {
      await setDoc(doc(db, "instructions", String(updated.id)), updated, { merge: true });
      return this.fetchInstructions();
  },

  async deleteInstruction(id: string): Promise<Instruction[]> {
      await deleteDoc(doc(db, "instructions", String(id)));
      return this.fetchInstructions();
  },

  // ==========================================
  // ☁️ Firebase 雲端版：股票進銷存系統 (Stock Inventory)
  // ==========================================
  async fetchStockClients(): Promise<StockClientConfig[]> {
      const snapshot = await getDocs(collection(db, "stockClients"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockClientConfig));
  },

  async addStockClient(config: StockClientConfig): Promise<StockClientConfig[]> {
      await setDoc(doc(db, "stockClients", String(config.id)), config);
      return this.fetchStockClients();
  },

  async deleteStockClient(id: string): Promise<StockClientConfig[]> {
      await deleteDoc(doc(db, "stockClients", String(id)));
      return this.fetchStockClients();
  },

  async fetchStockTargets(): Promise<StockTarget[]> {
      const snapshot = await getDocs(collection(db, "stockTargets"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockTarget));
  },

  async addStockTarget(target: StockTarget): Promise<StockTarget[]> {
      await setDoc(doc(db, "stockTargets", String(target.id)), target);
      return this.fetchStockTargets();
  },

  async deleteStockTarget(id: string): Promise<StockTarget[]> {
      await deleteDoc(doc(db, "stockTargets", String(id)));
      return this.fetchStockTargets();
  },
    
  async fetchStockTransactions(): Promise<StockTransaction[]> {
      const snapshot = await getDocs(collection(db, "stockTransactions"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockTransaction));
  },

  async addStockTransaction(tx: StockTransaction): Promise<StockTransaction[]> {
      await setDoc(doc(db, "stockTransactions", String(tx.id)), tx);
      return this.fetchStockTransactions();
  },

  async updateStockTransaction(updatedTx: StockTransaction): Promise<StockTransaction[]> {
      await setDoc(doc(db, "stockTransactions", String(updatedTx.id)), updatedTx, { merge: true });
      return this.fetchStockTransactions();
  },

  async deleteStockTransaction(id: string): Promise<StockTransaction[]> {
      await deleteDoc(doc(db, "stockTransactions", String(id)));
      return this.fetchStockTransactions();
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
    
  async addPayrollClient(client: import('./types').PayrollClientConfig): Promise<import('./types').PayrollClientConfig[]> {
      await setDoc(doc(db, "payrollClients", String(client.clientId)), client);
      return this.fetchPayrollClients();
  },
    
  async deletePayrollClient(clientId: string): Promise<import('./types').PayrollClientConfig[]> {
      await deleteDoc(doc(db, "payrollClients", String(clientId)));
      return this.fetchPayrollClients();
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

  async addEmployee(employee: import('./types').Employee): Promise<import('./types').Employee[]> {
      await setDoc(doc(db, "employees", String(employee.id)), employee);
      return this.fetchEmployees();
  },

  async updateEmployee(updated: import('./types').Employee): Promise<import('./types').Employee[]> {
      await setDoc(doc(db, "employees", String(updated.id)), updated, { merge: true });
      return this.fetchEmployees();
  },

  async deleteEmployee(id: string): Promise<import('./types').Employee[]> {
      await deleteDoc(doc(db, "employees", String(id)));
      return this.fetchEmployees();
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
