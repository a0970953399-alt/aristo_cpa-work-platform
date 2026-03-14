import React, { useState, useEffect } from 'react';
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
    const currentEmps = employees.filter(e => e.clientId === String(selectedClient.id));

    return (
      <div className="h-full flex flex-col animate-fade-in bg-gray-50">
        
        {/* 頂部導航 */}
        <div className="bg-white px-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4 py-4">
            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <ReturnIcon className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-gray-800">{selectedClient.name} - 薪資明細</h2>
          </div>
          
          {/* ✨ 內部三層標籤頁 (移至右上角並貼齊底線) */}
          <div className="flex gap-8 self-end">
              <button onClick={() => setActiveInnerTab('employees')} className={`py-4 text-lg font-bold border-b-4 transition-colors ${activeInnerTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>👥 員工名單</button>
              <button onClick={() => setActiveInnerTab('monthly')} className={`py-4 text-lg font-bold border-b-4 transition-colors ${activeInnerTab === 'monthly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>📅 每月薪資明細</button>
              <button onClick={() => setActiveInnerTab('yearly')} className={`py-4 text-lg font-bold border-b-4 transition-colors ${activeInnerTab === 'yearly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>📖 年度薪資帳冊</button>
          </div>
        </div>

        {/* 內容區 */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
            
            {/* 📍 標籤一：員工名單 */}
            {activeInnerTab === 'employees' && (
                <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-700">員工名單</h3>
                        <button onClick={handleOpenAddEmp} title="新增員工" className="flex items-center justify-center p-2 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
                            <PlusIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-bold text-gray-500 w-24 text-center">序號</th>
                                    <th className="p-4 font-bold text-gray-500 w-32 text-center">職稱</th>
                                    <th className="p-4 font-bold text-gray-500">姓名</th>
                                    <th className="p-4 font-bold text-gray-500 text-center">到職日</th>
                                    <th className="p-4 font-bold text-gray-500 text-center">狀態 / 離職日</th>
                                    <th className="p-4 font-bold text-gray-500 text-right pr-6">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentEmps.map((emp, index) => (
                                    <tr key={emp.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="p-4 text-center font-mono text-gray-400">{emp.empNo || String(index + 1).padStart(3, '0')}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${emp.employmentType === 'full_time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {emp.employmentType === 'full_time' ? '正職' : '兼職'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-black text-gray-800 text-base">{emp.name}</td>
                                        <td className="p-4 text-center font-mono text-gray-600">{emp.startDate.replace(/-/g, '/')}</td>
                                        <td className="p-4 text-center">
                                            {emp.endDate ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-bold rounded mb-1">已離職</span>
                                                    <span className="font-mono text-xs text-gray-400">{emp.endDate.replace(/-/g, '/')}</span>
                                                </div>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">在職中</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <button onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {currentEmps.length === 0 && (
                                    <tr><td colSpan={6} className="py-20 text-center text-gray-400 font-bold">目前尚無員工資料，請點擊右上角新增</td></tr>
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
