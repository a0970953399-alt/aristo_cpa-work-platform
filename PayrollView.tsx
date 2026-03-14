import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Client, PayrollClientConfig, PayrollRecord, Employee, EmploymentType } from './types';
import { ReturnIcon, PlusIcon, TrashIcon } from './Icons';
import { TaskService } from './taskService';

interface PayrollViewProps {
  clients: Client[];
}

// ✨ 新增：編輯用的鉛筆圖示
const EditIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const ExcelFileIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

export const PayrollView: React.FC<PayrollViewProps> = ({ clients }) => {
  // --- 全域狀態 ---
  const [payrollClients, setPayrollClients] = useState<PayrollClientConfig[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); // ✨ 新增員工狀態

  // --- UI 切換狀態 ---
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeInnerTab, setActiveInnerTab] = useState<'employees' | 'monthly' | 'yearly'>('employees');

  // --- 彈跳視窗狀態 ---
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [newClientSelectId, setNewClientSelectId] = useState('');
  const [clientsToDelete, setClientsToDelete] = useState<string[]>([]);
  
  // ✨ 員工編輯視窗狀態
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Partial<Employee> | null>(null);

  // ✨ 新增：Excel 匯入的 Ref 與處理邏輯
  const empFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportEmpExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const newEmps: Employee[] = [];

        // 假設第一行是標題，從第二行 (i=1) 開始讀取
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          if (!row[2]) continue; // 防呆：姓名(2) 是必填

          const empNo = String(row[0] || '').trim();
          const typeStr = String(row[1] || '').trim();
          const employmentType: EmploymentType = (typeStr.includes('兼職') || typeStr.toUpperCase() === 'PART_TIME') ? 'part_time' : 'full_time';
          const name = String(row[2] || '').trim();
          const email = String(row[3] || '').trim();

          // 日期格式防呆轉換
          const formatDate = (val: any) => {
              if (!val) return '';
              if (val instanceof Date) return new Date(val.getTime() - (val.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
              return String(val).replace(/\//g, '-').trim();
          };

          const startDate = formatDate(row[4]) || new Date().toISOString().split('T')[0]; // 預設今天
          const endDate = formatDate(row[5]);
          const idNumber = String(row[6] || '').trim().toUpperCase();
          const bankBranch = String(row[7] || '').trim();
          const bankAccount = String(row[8] || '').trim();
          const address = String(row[9] || '').trim();

          const newEmp: Employee = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
              clientId: String(selectedClient.id),
              empNo,
              employmentType,
              name,
              email,
              startDate,
              endDate,
              idNumber,
              bankBranch,
              bankAccount,
              address,
              defaultBaseSalary: 0, // Excel 沒匯入薪資，先預設 0
              defaultFoodAllowance: 0,
              createdAt: new Date().toISOString()
          };
          newEmps.push(newEmp);
        }

        if (newEmps.length > 0) {
          // 循序寫入資料庫
          for (const emp of newEmps) {
              await TaskService.addEmployee(emp);
          }
          alert(`✅ 成功匯入 ${newEmps.length} 筆員工資料！`);
          await loadData();
        } else {
          alert('沒有找到有效的員工紀錄，請確認 Excel 是否有填寫「姓名」。');
        }
      } catch (error) {
        alert('檔案讀取失敗，請確認是否為標準的 Excel 檔案。');
      }
      
      // 清空 input 讓同一個檔案能被重複選取
      if (empFileInputRef.current) empFileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const fetchedClients = await TaskService.fetchPayrollClients();
    const fetchedRecords = await TaskService.fetchPayrollRecords();
    const fetchedEmps = await TaskService.fetchEmployees();
    setPayrollClients(fetchedClients);
    setPayrollRecords(fetchedRecords);
    setEmployees(fetchedEmps);
  };

  // --- 員工 CRUD 邏輯 ---
  const handleOpenAddEmp = () => {
    setEditingEmp({
        employmentType: 'full_time',
        email: '',
        defaultBaseSalary: 0,
        defaultFoodAllowance: 0,
        startDate: new Date().toISOString().split('T')[0]
    });
    setIsEmpModalOpen(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editingEmp) return;

    const empData: Employee = {
        id: editingEmp.id || Date.now().toString(),
        clientId: String(selectedClient.id),
        empNo: editingEmp.empNo || '',
        employmentType: editingEmp.employmentType as EmploymentType,
        name: editingEmp.name || '',
        email: editingEmp.email || '',
        startDate: editingEmp.startDate || '',
        endDate: editingEmp.endDate || '',
        idNumber: editingEmp.idNumber || '',
        bankBranch: editingEmp.bankBranch || '',
        bankAccount: editingEmp.bankAccount || '',
        address: editingEmp.address || '',
        defaultBaseSalary: Number(editingEmp.defaultBaseSalary) || 0,
        // 若為兼職，強制伙食費為 0
        defaultFoodAllowance: editingEmp.employmentType === 'full_time' ? (Number(editingEmp.defaultFoodAllowance) || 0) : 0,
        createdAt: editingEmp.createdAt || new Date().toISOString(),
    };

    if (editingEmp.id) {
        await TaskService.updateEmployee(empData);
    } else {
        await TaskService.addEmployee(empData);
    }
    await loadData();
    setIsEmpModalOpen(false);
  };

  const handleDeleteEmp = async (id: string) => {
      if(!confirm("確定要刪除這位員工嗎？此動作無法復原！")) return;
      await TaskService.deleteEmployee(id);
      await loadData();
      setIsEmpModalOpen(false);
  };

  // --- 客戶牆邏輯 ---
  const enabledClientIds = payrollClients.map(pc => pc.clientId);
  const availableClientsToAdd = clients.filter(c => !enabledClientIds.includes(String(c.id)));
  const displayClients = clients.filter(c => enabledClientIds.includes(String(c.id)));

  const handleAddClient = async () => {
    if (!newClientSelectId) return;
    const newConfig: PayrollClientConfig = { id: Date.now().toString(), clientId: newClientSelectId, createdAt: new Date().toISOString() };
    await TaskService.addPayrollClient(newConfig);
    await loadData();
    setIsAddClientModalOpen(false);
    setNewClientSelectId('');
  };

  const handleConfirmDeleteClients = async () => {
    for (const clientId of clientsToDelete) {
        await TaskService.deletePayrollClient(clientId);
    }
    await loadData();
    setIsDeleteClientModalOpen(false);
    setClientsToDelete([]);
  };

  // 🔺 第二層：單一客戶專屬薪資系統
  if (selectedClient) {
    // ✨ 排序邏輯：過濾出該客戶的員工，並將「已離職 (有 endDate)」的員工排到最下面
    const currentEmps = employees
        .filter(e => e.clientId === String(selectedClient.id))
        .sort((a, b) => {
            const aResigned = !!a.endDate;
            const bResigned = !!b.endDate;
            if (aResigned && !bResigned) return 1;  // a 離職，往下沉
            if (!aResigned && bResigned) return -1; // b 離職，往下沉
            return (a.empNo || '').localeCompare(b.empNo || ''); // 都沒離職則照序號排
        });

    return (
      <div className="h-full flex flex-col animate-fade-in bg-gray-50">
        
        {/* 頂部導航 */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="返回客戶列表">
              <ReturnIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">{selectedClient.name} - 薪資明細</h2>
          </div>
          
          {/* ✨ 右側操作區：膠囊標籤頁 + 操作按鈕 */}
          <div className="flex items-center gap-3">
              {/* 膠囊標籤頁 */}
              <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner">
                  <button onClick={() => setActiveInnerTab('employees')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'employees' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>👥 員工名單</button>
                  <button onClick={() => setActiveInnerTab('monthly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📅 每月薪資明細</button>
                  <button onClick={() => setActiveInnerTab('yearly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📖 年度薪資帳冊</button>
              </div>

              {/* ✨ 隱藏的實體檔案上傳輸入框 */}
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={empFileInputRef} onChange={handleImportEmpExcel} />

              {/* ✨ 新增按鈕區：當處於員工名單時才顯示 */}
              {activeInnerTab === 'employees' && (
                  <div className="flex items-center gap-2">
                      {/* 匯入 Excel 按鈕 (綠色風格) */}
                      <button onClick={() => empFileInputRef.current?.click()} title="匯入 Excel" className="p-2.5 bg-white border border-green-200 text-green-600 font-bold rounded-xl shadow-sm hover:bg-green-50 active:scale-95 flex items-center justify-center transition-colors">
                          <ExcelFileIcon className="w-5 h-5" />
                      </button>
                      
                      {/* 新增單筆員工按鈕 (藍色風格) */}
                      <button onClick={handleOpenAddEmp} title="新增員工" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center">
                          <PlusIcon className="w-5 h-5" />
                      </button>
                  </div>
              )}
          </div>
        </div>

        {/* 內容區 */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
            
          {/* 📍 標籤一：員工名單 */}
            {activeInnerTab === 'employees' && (
                <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* ✨ 內層標題與按鈕已移除，表格直接滿版顯示 */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                                <tr>
                                    <th className="p-3 font-bold text-gray-500 w-16 text-center">序號</th>
                                    <th className="p-3 font-bold text-gray-500 w-20 text-center">職稱</th>
                                    <th className="p-3 font-bold text-gray-500 w-28">姓名</th>
                                    <th className="p-3 font-bold text-gray-500 w-48">電子郵件</th>
                                    <th className="p-3 font-bold text-gray-500 w-32 font-mono">身分證字號</th>
                                    <th className="p-3 font-bold text-gray-500 w-40">銀行分行</th>
                                    <th className="p-3 font-bold text-gray-500 w-40 font-mono">帳戶代號</th>
                                    <th className="p-3 font-bold text-gray-500">戶籍地址</th>
                                    <th className="p-3 font-bold text-gray-500 w-24 text-center border-l border-gray-200">狀態</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentEmps.map((emp, index) => {
                                    const isResigned = !!emp.endDate; // 判斷是否離職

                                    return (
                                        <tr 
                                            key={emp.id} 
                                            onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }}
                                            // ✨ 灰色濾鏡與互動特效：如果離職就套用灰底、透明度與灰色文字
                                            className={`cursor-pointer transition-colors group ${
                                                isResigned 
                                                ? 'bg-gray-100/50 opacity-75 hover:bg-gray-200/50' 
                                                : 'hover:bg-blue-50/50'
                                            }`}
                                        >
                                            <td className={`p-3 text-center font-mono ${isResigned ? 'text-gray-400' : 'text-gray-400'}`}>{emp.empNo || String(index + 1).padStart(3, '0')}</td>
                                            <td className="p-3 text-center">
                                                {/* ✨ 離職員工的職稱標籤也一併灰階化 */}
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                                    isResigned 
                                                    ? 'bg-gray-200 text-gray-500' 
                                                    : (emp.employmentType === 'full_time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')
                                                }`}>
                                                    {emp.employmentType === 'full_time' ? '正職' : '兼職'}
                                                </span>
                                            </td>
                                          <td className={`p-3 font-black text-base transition-colors ${isResigned ? 'text-gray-500' : 'text-gray-800 group-hover:text-blue-600'}`}>{emp.name}</td>
                                            {/* ✨ 新增：電子郵件資料列 */}
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-500'}`}>{emp.email || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.idNumber || '-'}</td>
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.bankBranch || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.bankAccount || '-'}</td>
                                            
                                            {/* ✨ 地址如果太長會自動截斷，滑鼠移上去會顯示完整內容 (title屬性) */}
                                            <td className={`p-3 text-sm truncate max-w-[200px] ${isResigned ? 'text-gray-400' : 'text-gray-600'}`} title={emp.address}>
                                                {emp.address || '-'}
                                            </td>
                                            
                                            <td className="p-3 text-center border-l border-gray-100/50">
                                                {isResigned ? (
                                                    <span className="px-3 py-1 bg-gray-200 text-gray-500 text-xs font-bold rounded-lg tracking-widest">已離職</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg tracking-widest">在職中</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                              {/* ✨ 將 colSpan 從 8 改為 9 */}
                                {currentEmps.length === 0 && (
                                    <tr><td colSpan={9} className="py-20 text-center text-gray-400 font-bold">目前尚無員工資料，請點擊右上角新增</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 📍 標籤二與三：施工中 */}
            {(activeInnerTab === 'monthly' || activeInnerTab === 'yearly') && (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center flex flex-col items-center justify-center h-full">
                    <div className="text-5xl mb-4 opacity-50">🚧</div>
                    <h3 className="text-xl font-bold text-gray-600 mb-2">自動試算引擎建置中</h3>
                    <p className="text-gray-400">員工名單地基已打好，下一步我們將在這裡串接薪資與帳冊模組！</p>
                </div>
            )}
        </div>

        {/* 🚀 員工詳細資訊 (新增/編輯) Modal */}
        {isEmpModalOpen && editingEmp && (
            <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsEmpModalOpen(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="text-xl font-black text-gray-800">{editingEmp.id ? '編輯員工資料' : '新增員工'}</h3>
                        <button onClick={() => setIsEmpModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-black">✕</button>
                    </div>
                    
                    <form onSubmit={handleSaveEmp} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                        
                        {/* 區塊 1: 核心資料 */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>核心資料</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">序號</label><input type="text" value={editingEmp.empNo || ''} onChange={e => setEditingEmp({...editingEmp, empNo: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="例如: 001" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">姓名</label><input type="text" required value={editingEmp.name || ''} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">電子郵件</label><input type="email" value={editingEmp.email || ''} onChange={e => setEditingEmp({...editingEmp, email: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
                              <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">職稱</label>
                                    <select value={editingEmp.employmentType || 'full_time'} onChange={e => setEditingEmp({...editingEmp, employmentType: e.target.value as EmploymentType})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold bg-white">
                                        <option value="full_time">正職</option>
                                        <option value="part_time">兼職</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">到職日</label><input type="date" required value={editingEmp.startDate || ''} onChange={e => setEditingEmp({...editingEmp, startDate: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">離職日 (若在職請留空)</label><input type="date" value={editingEmp.endDate || ''} onChange={e => setEditingEmp({...editingEmp, endDate: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-gray-400 text-sm font-mono bg-gray-50" /></div>
                            </div>
                        </div>

                        {/* 區塊 2: 隱私詳細資訊 */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>詳細個資 (點擊展開才可見)</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">身分證字號</label><input type="text" value={editingEmp.idNumber || ''} onChange={e => setEditingEmp({...editingEmp, idNumber: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm uppercase font-mono" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">銀行分行名稱</label><input type="text" value={editingEmp.bankBranch || ''} onChange={e => setEditingEmp({...editingEmp, bankBranch: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" placeholder="例如: 中國信託 站前分行" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">銀行戶頭代號</label><input type="text" value={editingEmp.bankAccount || ''} onChange={e => setEditingEmp({...editingEmp, bankAccount: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono" /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">戶籍地址</label><input type="text" value={editingEmp.address || ''} onChange={e => setEditingEmp({...editingEmp, address: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" /></div>
                        </div>

                        {/* 區塊 3: 預設薪資設定 */}
                        <div className="space-y-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <h4 className="font-bold text-orange-800 flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>預設薪資設定</h4>
                            <p className="text-xs text-orange-600 mb-2">此數值將自動帶入每月的薪資結算表單中，勞健保數值將於結算時手動輸入。</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-orange-700 mb-1">預設本薪 ({editingEmp.employmentType === 'full_time' ? '正職月薪' : '兼職時薪/底薪'})</label>
                                    <input type="number" value={editingEmp.defaultBaseSalary || ''} onChange={e => setEditingEmp({...editingEmp, defaultBaseSalary: Number(e.target.value)})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-base font-black text-gray-800" placeholder="0" />
                                </div>
                                {editingEmp.employmentType === 'full_time' && (
                                    <div>
                                        <label className="block text-xs font-bold text-orange-700 mb-1">預設伙食費 (正職專屬)</label>
                                        <input type="number" value={editingEmp.defaultFoodAllowance || ''} onChange={e => setEditingEmp({...editingEmp, defaultFoodAllowance: Number(e.target.value)})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-base font-black text-gray-800" placeholder="0" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 隱藏的按鈕用來觸發 form submit */}
                        <button type="submit" id="submitEmpForm" className="hidden"></button>
                    </form>
                    
                    <div className="p-4 border-t bg-gray-50 flex gap-3">
                        {editingEmp.id && (
                            <button onClick={() => handleDeleteEmp(String(editingEmp.id))} className="px-6 py-3 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors">刪除</button>
                        )}
                        <button onClick={() => setIsEmpModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">取消</button>
                        <button onClick={() => document.getElementById('submitEmpForm')?.click()} className="flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-all bg-blue-600 hover:bg-blue-700">確認存檔</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  // 🔺 第一層：薪資客戶牆 (Client Wall) - 保持原本的結構不變
  return (
    // ... [此處與你上一版的 PayrollView 相同，完全保留以確保客戶牆正常運作]
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">💰 客戶薪資計算</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsAddClientModalOpen(true)} title="新增客戶" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center">
            <PlusIcon className="w-5 h-5" />
          </button>
          <button onClick={() => { setClientsToDelete([]); setIsDeleteClientModalOpen(true); }} title="移除客戶" className="p-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 overflow-y-auto pb-6">
          {displayClients.map(client => (
            <div 
              key={client.id} 
              onClick={() => setSelectedClient(client)} 
              className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center text-center group aspect-square relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 group-hover:bg-blue-500 transition-colors"></div>
              <p className="text-gray-400 font-mono text-sm sm:text-base font-bold tracking-widest mb-1 group-hover:text-blue-500 transition-colors">
                {client.code}
              </p>
              <h3 className="font-black text-3xl sm:text-4xl text-gray-800 tracking-tight group-hover:text-blue-700 transition-colors">
                {client.name}
              </h3>
            </div>
          ))}
          {displayClients.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold text-lg bg-white rounded-2xl border border-dashed border-gray-300 w-full">目前沒有任何客戶開啟薪資計算功能</div>
          )}
      </div>

      {isAddClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">選擇客戶開通薪資計算</h3>
            {availableClientsToAdd.length > 0 ? (
              <select value={newClientSelectId} onChange={e => setNewClientSelectId(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 outline-none text-base bg-white font-bold text-gray-700">
                <option value="">請選擇客戶...</option>
                {availableClientsToAdd.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            ) : (
              <p className="text-gray-500 mb-6 text-sm">所有客戶都已經開通了！</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setIsAddClientModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleAddClient} disabled={!newClientSelectId} className="flex-1 py-3 bg-blue-600 font-bold rounded-xl text-white disabled:opacity-50">確認加入</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">🗑️ 關閉薪資計算功能</h3>
            <p className="text-sm text-gray-500 mb-4">請勾選要關閉的客戶：</p>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl mb-6 bg-gray-50 p-2 space-y-2 custom-scrollbar">
              {displayClients.map(client => (
                <label key={client.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-red-50 transition-colors">
                  <input type="checkbox" checked={clientsToDelete.includes(String(client.id))} onChange={() => setClientsToDelete(prev => prev.includes(String(client.id)) ? prev.filter(x => x !== String(client.id)) : [...prev, String(client.id)])} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" />
                  <span className="ml-3 font-bold text-gray-700">{client.name}</span>
                </label>
              ))}
              {displayClients.length === 0 && <div className="text-center p-4 text-gray-400 text-sm font-bold">目前無已開通的客戶</div>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsDeleteClientModalOpen(false); setClientsToDelete([]); }} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleConfirmDeleteClients} disabled={clientsToDelete.length === 0} className="flex-1 py-3 bg-red-600 font-bold rounded-xl text-white disabled:opacity-50">確認移除 ({clientsToDelete.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
