import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Client, PayrollClientConfig, PayrollRecord, Employee, EmploymentType } from './types';
import { ReturnIcon, PlusIcon, TrashIcon } from './Icons';
import { TaskService } from './taskService';

const PAYROLL_TEMPLATE_BASE64 = "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";

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

const CloudDownloadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
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

  // ✨ 新增：每月薪資明細的群組展開狀態
  const [expandedGroups, setExpandedGroups] = useState({
      additions: false,    // 應加金額
      deductions: false,   // 應扣金額
      taxFree: false,      // 應加免稅
      withholdings: false  // 代扣款項
  });

  // ✨ 新增：動態取得當前系統的年份與月份
  const currentSystemYear = new Date().getFullYear();
  const currentSystemMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  // ✨ 動態生成年份陣列 (從 2025 年開始，一直到「當前系統年份 + 1 年」)
  // reverse() 是為了讓越新的年份排在越上面
  const availableYears = Array.from(
      { length: Math.max(currentSystemYear - 2025 + 2, 2) }, 
      (_, i) => String(2025 + i)
  ).reverse();

  // 年份與月份獨立狀態 (預設帶入系統當前年月)
  const [selectedYear, setSelectedYear] = useState(String(currentSystemYear));
  const [selectedMonth, setSelectedMonth] = useState(currentSystemMonth);
  const [monthlyData, setMonthlyData] = useState<Record<string, any>>({});
  
  // 編輯視窗狀態
  const [isMonthlyEditModalOpen, setIsMonthlyEditModalOpen] = useState(false);
  const [editingMonthlyEmp, setEditingMonthlyEmp] = useState<Employee | null>(null);
  const [monthlyFormData, setMonthlyFormData] = useState<any>({});
  const [isAddingNewMonthly, setIsAddingNewMonthly] = useState(false);

  // ✨ 當年份、月份或客戶改變時，從資料庫載入真實資料
  useEffect(() => {
      const loadMonthlyData = async () => {
          if (activeInnerTab === 'monthly' && selectedClient) {
              const allSalaries = await TaskService.fetchMonthlySalaries();
              const targetMonth = `${selectedYear}-${selectedMonth}`; // ✨ 組合年月
              const savedRecords = allSalaries.filter(r => r.clientId === String(selectedClient.id) && r.month === targetMonth);
              
            const initialData: Record<string, any> = {};
              // ✨ 修正離職邏輯：如果沒離職，或是「目標月份 <= 離職月份」，就將其納入當月名單
              const activeEmps = employees.filter(e => {
                  if (e.clientId !== String(selectedClient.id)) return false;
                  if (!e.endDate) return true; // 沒離職，永遠納入
                  const targetMonthStr = `${selectedYear}-${selectedMonth}`;
                  const endMonthStr = e.endDate.substring(0, 7); // 取出 "YYYY-MM"
                  return targetMonthStr <= endMonthStr;
              });
              
              activeEmps.forEach(emp => {
                  const saved = savedRecords.find(r => r.employeeId === emp.id);
                  if (saved) {
                      initialData[emp.id] = saved;
                  } else {
                      initialData[emp.id] = {
                          workHours: 0, lateHours: 0, sickLeave: 0, personalLeave: 0, annualLeave: 0, holidayOt: 0, normalOt: 0,
                          baseSalary: emp.defaultBaseSalary || 0, fullAttendance: 0, positionAllowance: 0, performanceBonus: 0, taxableOt: 0,
                          leaveDeduction: 0, dailyShortage: 0, lateDeduction: 0, pensionSelf: 0,
                          foodAllowance: emp.defaultFoodAllowance || 0, taxFreeOt: 0,
                          laborIns: 0, healthIns: 0, incomeTax: 0, advancePay: 0
                      };
                  }
              });
              setMonthlyData(initialData);
          }
      };
      loadMonthlyData();
  }, [activeInnerTab, selectedClient, employees, selectedYear, selectedMonth]); // ✨ 加入新相依性

  // 處理點擊「+」新增按鈕
  const handleOpenAddMonthly = () => {
      setIsAddingNewMonthly(true);
      setEditingMonthlyEmp(null);
      setMonthlyFormData({});
      setIsMonthlyEditModalOpen(true);
  };

  // 真實儲存到資料庫
  const handleSaveMonthlyData = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingMonthlyEmp || !selectedClient) return;

      const record: any = {
          id: monthlyData[editingMonthlyEmp.id]?.id || Date.now().toString(),
          clientId: String(selectedClient.id),
          employeeId: editingMonthlyEmp.id,
          month: `${selectedYear}-${selectedMonth}`, // ✨ 儲存時組合年月
          updatedAt: new Date().toISOString(),
          ...monthlyFormData
      };

      setMonthlyData(prev => ({ ...prev, [editingMonthlyEmp.id]: record }));

      const allSalaries = await TaskService.fetchMonthlySalaries();
      const existingIdx = allSalaries.findIndex(r => r.id === record.id);
      if (existingIdx !== -1) {
          allSalaries[existingIdx] = record;
      } else {
          allSalaries.push(record);
      }
      await TaskService.saveMonthlySalaries(allSalaries);
      
      setIsMonthlyEditModalOpen(false);
  };

  // ✨ 一鍵生成合併員工薪資單 (ExcelJS 完美格式版 - 終極防護版)
  const handleExportEmployerExcel = async () => {
      try {
          if (!selectedClient) return;
          if (!PAYROLL_TEMPLATE_BASE64 || PAYROLL_TEMPLATE_BASE64.startsWith("這裡放")) {
              alert("請先在程式碼最上方放入 Base64 模板代碼！");
              return;
          }

          // 🛡️ 防護 1：清除 Base64 字串中可能夾帶的換行符號或空白 (這是最常導致點擊沒反應的兇手)
          const cleanBase64 = PAYROLL_TEMPLATE_BASE64.replace(/\s/g, '');

          // 1. 將 Base64 轉換為二進位 Buffer
          const binaryString = window.atob(cleanBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }

          // 🛡️ 防護 2：相容不同打包工具的套件引入方式
          const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook;
          if (!Workbook) {
              throw new Error("ExcelJS 套件載入異常，找不到 Workbook 建構子");
          }

          // 2. 使用 ExcelJS 讀取完美的模板
          const workbook = new Workbook();
          await workbook.xlsx.load(bytes.buffer);
          const ws = workbook.worksheets[0]; // 抓取第一個工作表

          // 3. 過濾當月在職員工
          const currentMonthEmps = employees.filter(e => {
              if (e.clientId !== String(selectedClient.id)) return false;
              if (!e.endDate) return true;
              return `${selectedYear}-${selectedMonth}` <= e.endDate.substring(0, 7);
          });

          if (currentMonthEmps.length === 0) {
              alert("本月無在職員工可匯出！");
              return;
          }

          // 準備用來累加總額的物件
          const totals = {
              base: 0, food: 0, ot: 0, otherAdd: 0,
              leave: 0, late: 0, labor: 0, health: 0, otherDed: 0, net: 0
          };

          const twYear = Number(selectedYear) - 1911;
          const monthStr = `${twYear}-${selectedMonth}`;

          // 🌟 神奇魔法：往下複製完美格式列
          if (currentMonthEmps.length > 1) {
              ws.duplicateRow(2, currentMonthEmps.length - 1, true);
          }

          // 4. 迴圈填入員工真實數據
          currentMonthEmps.forEach((emp, index) => {
              const R = 2 + index; // ExcelJS 列數是從 1 開始算，第 2 列是第一位員工
              const row = ws.getRow(R);
              const rowData = monthlyData[emp.id] || {};
              const isFullTime = emp.employmentType === 'full_time';

              // ⚡ 即時公式試算
              const baseSalaryForCalc = rowData.baseSalary || 0;
              const hourlyWageForCalc = baseSalaryForCalc / 240;
              const realLateDeduction = Math.round((hourlyWageForCalc / 60) * (rowData.lateHours || 0)); 
              const realSickDeduction = Math.round(hourlyWageForCalc * (rowData.sickLeave || 0) / 2); 
              const realPersonalDeduction = Math.round(hourlyWageForCalc * (rowData.personalLeave || 0)); 
              const realLeaveDeduction = realSickDeduction + realPersonalDeduction;

              const foodAllowanceForCalc = rowData.foodAllowance || 0;
              let realAnnualPay = 0, realHolidayPay = 0, realNormalPay = 0;
              if (isFullTime) {
                  const otHourlyWage = (baseSalaryForCalc + foodAllowanceForCalc) / 240;
                  realAnnualPay = Math.round(otHourlyWage * (rowData.annualLeave || 0));
                  realHolidayPay = Math.round(otHourlyWage * (rowData.holidayOt || 0));
                  realNormalPay = Math.round(otHourlyWage * (rowData.normalOt || 0) * 1.33);
              } else {
                  const partTimeHourlyWage = emp.defaultBaseSalary || 0;
                  realHolidayPay = Math.round(partTimeHourlyWage * (rowData.holidayOt || 0) * 2);
              }
              const realTaxFreeOt = realAnnualPay + realHolidayPay + realNormalPay;

              const baseSalary = rowData.baseSalary || 0;
              const foodAllowance = rowData.foodAllowance || 0;
              const otPay = (rowData.taxableOt || 0) + ((rowData.taxFreeOt ?? realTaxFreeOt) || 0);
              const otherAdd = (rowData.fullAttendance || 0) + (rowData.positionAllowance || 0) + (rowData.performanceBonus || 0);

              const leaveDed = -(rowData.leaveDeduction ?? realLeaveDeduction);
              const lateDed = -(rowData.lateDeduction ?? realLateDeduction);
              const laborIns = -(rowData.laborIns || 0);
              const healthIns = -(rowData.healthIns || 0);
              const otherDed = -((rowData.dailyShortage || 0) + (rowData.pensionSelf || 0) + (rowData.advancePay || 0) + (rowData.incomeTax || 0));

              const netPay = baseSalary + foodAllowance + otPay + otherAdd + leaveDed + lateDed + laborIns + healthIns + otherDed;

              let insStr = "";
              if (emp.insuranceBracket) {
                  const types = [];
                  if (emp.hasLaborIns ?? true) types.push("勞");
                  if (emp.hasHealthIns ?? true) types.push("健");
                  if (types.length > 0) insStr = `${emp.insuranceBracket.toLocaleString()} (${types.join("")})`;
              }

              const remarks = [];
              if (emp.startDate && emp.startDate.substring(0, 7) === `${selectedYear}-${selectedMonth}`) {
                  const m = parseInt(emp.startDate.substring(5, 7), 10);
                  const d = parseInt(emp.startDate.substring(8, 10), 10);
                  remarks.push(`${m}/${d}到職`);
              }
              if (rowData.lateHours > 0) remarks.push(`遲到${rowData.lateHours}分鐘`);
              if (rowData.sickLeave > 0) remarks.push(`病假${rowData.sickLeave}小時`);
              if (rowData.personalLeave > 0) remarks.push(`事假${rowData.personalLeave}小時`);
              if (rowData.normalOt > 0) remarks.push(`日常排班工時${rowData.normalOt}小時`);
              if (rowData.holidayOt > 0) remarks.push(`國定假日出勤${rowData.holidayOt}小時`);
              const remarkStr = remarks.length > 0 ? remarks.join("，") + "。" : "";

              totals.base += baseSalary; totals.food += foodAllowance; totals.ot += otPay; totals.otherAdd += otherAdd;
              totals.leave += leaveDed; totals.late += lateDed; totals.labor += laborIns; totals.health += healthIns;
              totals.otherDed += otherDed; totals.net += netPay;

              row.getCell(1).value = monthStr;
              row.getCell(2).value = emp.empNo || "";
              row.getCell(3).value = emp.name || "";
              row.getCell(4).value = insStr;
              row.getCell(5).value = emp.idNumber || "";
              row.getCell(6).value = emp.email || "";
              row.getCell(7).value = baseSalary || "";
              row.getCell(8).value = foodAllowance || "";
              row.getCell(9).value = otPay || "";
              row.getCell(10).value = otherAdd || "";
              row.getCell(11).value = leaveDed || "";
              row.getCell(12).value = lateDed || "";
              row.getCell(13).value = laborIns || "";
              row.getCell(14).value = healthIns || "";
              row.getCell(15).value = otherDed || "";
              row.getCell(16).value = netPay || 0;
              row.getCell(17).value = emp.bankAccount || "";
              row.getCell(18).value = remarkStr;
              row.commit(); 
          });

          // 5. 填入底部總計列
          const totalR = 2 + currentMonthEmps.length;
          const totalRow = ws.getRow(totalR);
          totalRow.getCell(7).value = totals.base || "";
          totalRow.getCell(8).value = totals.food || "";
          totalRow.getCell(9).value = totals.ot || "";
          totalRow.getCell(10).value = totals.otherAdd || "";
          totalRow.getCell(11).value = totals.leave || "";
          totalRow.getCell(12).value = totals.late || "";
          totalRow.getCell(13).value = totals.labor || "";
          totalRow.getCell(14).value = totals.health || "";
          totalRow.getCell(15).value = totals.otherDed || "";
          totalRow.getCell(16).value = totals.net || 0;
          totalRow.commit();

          // 6. 完美打包下載！
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          saveAs(blob, `${selectedClient.name}_薪資總表_${selectedYear}${selectedMonth}.xlsx`);

      } catch (error: any) {
          // 🛡️ 防護 3：如果發生任何錯誤，直接在畫面上彈出警告！
          console.error("匯出失敗詳細錯誤：", error);
          alert(`匯出失敗！請將此錯誤訊息告訴 AI：\n\n${error.message}`);
      }
  };
  
  // ✨ 點擊整列時，開啟編輯視窗並載入該員工資料
  const handleRowClickMonthly = (emp: Employee) => {
      setEditingMonthlyEmp(emp);
      setMonthlyFormData(monthlyData[emp.id] || {});
      setIsMonthlyEditModalOpen(true);
  };

  // ✨ 小視窗內的輸入變更處理 (包含所有自動計算公式)
  const handleMonthlyFormChange = (field: string, value: string) => {
      const numValue = Number(value) || 0;
      let updatedData = { ...monthlyFormData, [field]: numValue };
      
      const isFullTime = editingMonthlyEmp?.employmentType === 'full_time';

      // 1. 如果是兼職且修改了出勤時數，自動以「時數 * 預設時薪」重算本薪總額
      if (field === 'workHours' && !isFullTime) {
          updatedData.baseSalary = numValue * (editingMonthlyEmp?.defaultBaseSalary || 0);
      }
      
      // 2. ⚡ 核心薪資計算引擎 ⚡
      // 隨時抓取最新的變數來試算
      const currentBaseSalary = field === 'baseSalary' ? numValue : (updatedData.baseSalary || 0);
      const currentFoodAllowance = field === 'foodAllowance' ? numValue : (updatedData.foodAllowance || 0);
      
      const hourlyWage = currentBaseSalary / 240;
      const minuteWage = hourlyWage / 60;

      const currentLate = field === 'lateHours' ? numValue : (updatedData.lateHours || 0);
      const currentSick = field === 'sickLeave' ? numValue : (updatedData.sickLeave || 0);
      const currentPersonal = field === 'personalLeave' ? numValue : (updatedData.personalLeave || 0);

      // 🔴 扣款計算
      updatedData.lateDeduction = Math.round(minuteWage * currentLate);
      const sickDed = Math.round(hourlyWage * currentSick / 2);
      const personalDed = Math.round(hourlyWage * currentPersonal);
      updatedData.leaveDeduction = sickDed + personalDed;

      // 🔵 免稅加班費計算
      const currentAnnual = field === 'annualLeave' ? numValue : (updatedData.annualLeave || 0);
      const currentHoliday = field === 'holidayOt' ? numValue : (updatedData.holidayOt || 0);
      const currentNormal = field === 'normalOt' ? numValue : (updatedData.normalOt || 0);

      let annualPay = 0;
      let holidayPay = 0;
      let normalPay = 0;

      if (isFullTime) {
          const otHourlyWage = (currentBaseSalary + currentFoodAllowance) / 240;
          annualPay = Math.round(otHourlyWage * currentAnnual);
          holidayPay = Math.round(otHourlyWage * currentHoliday);
          normalPay = Math.round(otHourlyWage * currentNormal * 1.33);
      } else {
          // 兼職員工的時薪 (在系統中定義為 defaultBaseSalary)
          const partTimeHourlyWage = editingMonthlyEmp?.defaultBaseSalary || 0;
          holidayPay = Math.round(partTimeHourlyWage * currentHoliday * 2);
      }

      // 免稅加班費總額
      updatedData.taxFreeOt = annualPay + holidayPay + normalPay;
      
      setMonthlyFormData(updatedData);
  };
  
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

        // ✨ 新增這三行：將勞健保設定寫入資料庫
        insuranceBracket: Number(editingEmp.insuranceBracket) || 0,
        hasLaborIns: editingEmp.hasLaborIns ?? true, // 如果沒特別設定，預設為打勾
        hasHealthIns: editingEmp.hasHealthIns ?? true, // 如果沒特別設定，預設為打勾
      
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
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="返回客戶列表">
              <ReturnIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">{selectedClient.name} - 薪資明細</h2>
            
            {/* ✨ 標題旁的動態篩選器 */}
            {(activeInnerTab === 'monthly' || activeInnerTab === 'yearly') && (
                <div className="flex items-center gap-2 ml-4 animate-fade-in">
                  <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500">
                        {/* ✨ 讓系統自動把剛剛生成的 availableYears 陣列印出來 */}
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year} 年</option>
                        ))}
                    </select>
                    {/* 只有「每月薪資」才需要選擇月份 */}
                    {activeInnerTab === 'monthly' && (
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500">
                            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                                <option key={m} value={m}>{m} 月</option>
                            ))}
                        </select>
                    )}
                </div>
            )}
          </div>
          
          {/* ✨ 右側操作區：膠囊標籤頁 + 操作按鈕 */}
          <div className="flex items-center gap-3">
              {/* 膠囊標籤頁 */}
              <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner">
                  <button onClick={() => setActiveInnerTab('employees')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'employees' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>👥 員工名單</button>
                  <button onClick={() => setActiveInnerTab('monthly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📅 每月薪資明細</button>
                  <button onClick={() => setActiveInnerTab('yearly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📖 年度薪資帳冊</button>
              </div>

              {/* 隱藏的實體檔案上傳輸入框 */}
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={empFileInputRef} onChange={handleImportEmpExcel} />

              {/* 按鈕區：員工名單 */}
              {activeInnerTab === 'employees' && (
                  <div className="flex items-center gap-2">
                      <button onClick={() => empFileInputRef.current?.click()} title="匯入 Excel" className="p-2.5 bg-white border border-green-200 text-green-600 font-bold rounded-xl shadow-sm hover:bg-green-50 active:scale-95 flex items-center justify-center transition-colors">
                          <ExcelFileIcon className="w-5 h-5" />
                      </button>
                      <button onClick={handleOpenAddEmp} title="新增員工" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center">
                          <PlusIcon className="w-5 h-5" />
                      </button>
                  </div>
              )}

            {/* ✨ NEW: 按鈕區：每月薪資明細 */}
              {activeInnerTab === 'monthly' && (
                  <div className="flex items-center gap-2">
                      <button title="匯入出勤 Excel" className="p-2.5 bg-white border border-green-200 text-green-600 font-bold rounded-xl shadow-sm hover:bg-green-50 active:scale-95 flex items-center justify-center transition-colors">
                          <ExcelFileIcon className="w-5 h-5" />
                      </button>
                    {/* ✨ 一鍵生成合併員工薪資單 (老闆用，綠色無文字) */}
                    <button onClick={handleExportEmployerExcel} className="p-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center">
                      <CloudDownloadIcon className="w-5 h-5" />
                    </button>
                  </div>
              )}

              {/* ✨ NEW: 按鈕區：年度薪資帳冊 (預先套用) */}
              {activeInnerTab === 'yearly' && (
                  <div className="flex items-center gap-2">
                      <button title="匯入年度資料 Excel" className="p-2.5 bg-white border border-green-200 text-green-600 font-bold rounded-xl shadow-sm hover:bg-green-50 active:scale-95 flex items-center justify-center transition-colors">
                          <ExcelFileIcon className="w-5 h-5" />
                      </button>
                      <button title="新增年度紀錄" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center">
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
                                    {/* ✨ 讓表頭回歸純粹的「姓名」 */}
                                    <th className="p-3 font-bold text-gray-500 w-32">姓名</th>
                                    <th className="p-3 font-bold text-gray-500 w-48">電子郵件</th>
                                    <th className="p-3 font-bold text-gray-500 w-32 font-mono">身分證字號</th>
                                    <th className="p-3 font-bold text-gray-500 w-40">銀行分行</th>
                                    <th className="p-3 font-bold text-gray-500 w-40 font-mono">帳戶代號</th>
                                    <th className="p-3 font-bold text-gray-500">戶籍地址</th>
                                    {/* ✨ 狀態欄位已被移除 */}
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
                                          {/* ✨ 徹底移除狀態標籤，只保留乾淨的姓名與懸停特效 */}
                                            <td className={`p-3 font-black text-base transition-colors ${isResigned ? 'text-gray-500' : 'text-gray-800 group-hover:text-blue-600'}`}>
                                                {emp.name}
                                            </td>
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-500'}`}>{emp.email || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.idNumber || '-'}</td>
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.bankBranch || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.bankAccount || '-'}</td>
                                            
                                            {/* ✨ 移除 truncate 與 max-w，加入 whitespace-normal 讓超長地址自動換行顯示全部 */}
                                            <td className={`p-3 text-sm whitespace-normal ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {emp.address || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                              {/* ✨ 將 colSpan 改回 8 */}
                                {currentEmps.length === 0 && (
                                    <tr><td colSpan={8} className="py-20 text-center text-gray-400 font-bold">目前尚無員工資料，請點擊右上角新增</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

          {/* 📍 標籤二：每月薪資明細 */}
            {activeInnerTab === 'monthly' && (
                <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* 📊 核心試算表格區塊 */}
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                      {/* ✨ 修正：改用 border-separate 並以任意值套用所有底線，徹底解決滑動透字與邊框消失問題 */}
                        <table className="w-full text-left text-sm border-separate border-spacing-0 whitespace-nowrap [&_td]:border-b [&_td]:border-gray-100 [&_th]:border-b [&_th]:border-gray-200">
                            <thead className="sticky top-0 z-30 shadow-sm">
                                {/* 第一層表頭：大群組 */}
                                <tr className="text-[11px] uppercase tracking-widest text-center bg-gray-50">
                                    <th colSpan={3} className="p-2 border-r border-gray-200 text-gray-500 bg-gray-100 sticky left-0 z-40">員工</th>
                                    <th colSpan={7} className="p-2 border-r border-gray-200 text-gray-500">出勤紀錄</th>
                                    
                                    <th colSpan={expandedGroups.additions ? 5 : 1} onClick={() => setExpandedGroups(p => ({...p, additions: !p.additions}))} className="p-2 border-r border-gray-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100 cursor-pointer transition-colors">
                                        應加金額 {expandedGroups.additions ? '[-]' : '[+]'}
                                    </th>
                                    
                                    <th colSpan={expandedGroups.deductions ? 4 : 1} onClick={() => setExpandedGroups(p => ({...p, deductions: !p.deductions}))} className="p-2 border-r border-gray-200 text-red-600 bg-red-50/50 hover:bg-red-100 cursor-pointer transition-colors">
                                        應扣金額 {expandedGroups.deductions ? '[-]' : '[+]'}
                                    </th>
                                    
                                    <th className="p-2 border-r border-gray-200 text-purple-600 bg-purple-50/50">稅務結轉</th>
                                    
                                    <th colSpan={expandedGroups.taxFree ? 2 : 1} onClick={() => setExpandedGroups(p => ({...p, taxFree: !p.taxFree}))} className="p-2 border-r border-gray-200 text-yellow-600 bg-yellow-50/50 hover:bg-yellow-100 cursor-pointer transition-colors">
                                        應加免稅 {expandedGroups.taxFree ? '[-]' : '[+]'}
                                    </th>
                                    
                                    <th colSpan={expandedGroups.withholdings ? 4 : 1} onClick={() => setExpandedGroups(p => ({...p, withholdings: !p.withholdings}))} className="p-2 border-r border-gray-200 text-orange-600 bg-orange-50/50 hover:bg-orange-100 cursor-pointer transition-colors">
                                        代扣款項 {expandedGroups.withholdings ? '[-]' : '[+]'}
                                    </th>
                                    
                                    <th className="p-2 text-green-700 bg-green-100">最終結算</th>
                                </tr>
                                {/* 第二層表頭：詳細欄位 */}
                                <tr className="text-xs font-bold text-gray-500 bg-white">
                                    {/* ✨ 絕對鎖死寬度與座標：60 + 60 + 100 = 220px，保證永不產生裂縫 */}
                                    <th className="p-3 w-[60px] min-w-[60px] max-w-[60px] text-center sticky left-0 z-40 bg-white border-r border-gray-100">序號</th>
                                    <th className="p-3 w-[60px] min-w-[60px] max-w-[60px] text-center sticky left-[60px] z-40 bg-white border-r border-gray-100">職稱</th>
                                    <th className="p-3 w-[100px] min-w-[100px] max-w-[100px] sticky left-[120px] z-40 bg-white border-r-2 border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">姓名</th>
                                    
                                    <th className="p-3 text-center w-20">出勤(時)</th>
                                    <th className="p-3 text-center w-20 text-red-400">遲到(分)</th>
                                    <th className="p-3 text-center w-20 text-red-400">病假</th>
                                    <th className="p-3 text-center w-20 text-red-400 border-r border-gray-200">事假</th>
                                    <th className="p-3 text-center w-20 text-blue-400">特休換薪</th>
                                    <th className="p-3 text-center w-20 text-blue-400">國定加班</th>
                                    <th className="p-3 text-center w-20 text-blue-400 border-r border-gray-200">日常加班</th>
                                    
                                    {expandedGroups.additions ? (
                                        <>
                                            <th className="p-3 text-right bg-blue-50/20">本薪</th>
                                            <th className="p-3 text-right bg-blue-50/20">全勤</th>
                                            <th className="p-3 text-right bg-blue-50/20">職務津貼</th>
                                            <th className="p-3 text-right bg-blue-50/20">業績獎金</th>
                                            <th className="p-3 text-right bg-blue-50/20 border-r border-gray-200">應稅加班</th>
                                        </>
                                    ) : <th className="p-3 text-right border-r border-gray-200 bg-blue-50/20 text-blue-700">應加總計</th>}

                                    {expandedGroups.deductions ? (
                                        <>
                                            <th className="p-3 text-right bg-red-50/20">請假扣款</th>
                                            <th className="p-3 text-right bg-red-50/20">結帳差額</th>
                                            <th className="p-3 text-right bg-red-50/20">遲到扣款</th>
                                            <th className="p-3 text-right bg-red-50/20 border-r border-gray-200">勞退自提</th>
                                        </>
                                    ) : <th className="p-3 text-right border-r border-gray-200 bg-red-50/20 text-red-700">應扣總計</th>}

                                    <th className="p-3 text-right border-r border-gray-200 bg-purple-50/20 text-purple-700">應稅金額</th>

                                    {expandedGroups.taxFree ? (
                                        <>
                                            <th className="p-3 text-right bg-yellow-50/20">伙食費</th>
                                            <th className="p-3 text-right bg-yellow-50/20 border-r border-gray-200">免稅加班</th>
                                        </>
                                    ) : <th className="p-3 text-right border-r border-gray-200 bg-yellow-50/20 text-yellow-700">免稅總計</th>}

                                    {expandedGroups.withholdings ? (
                                        <>
                                            <th className="p-3 text-right bg-orange-50/20">勞保</th>
                                            <th className="p-3 text-right bg-orange-50/20">健保</th>
                                            <th className="p-3 text-right bg-orange-50/20">所得稅</th>
                                            <th className="p-3 text-right bg-orange-50/20 border-r border-gray-200">預支款</th>
                                        </>
                                    ) : <th className="p-3 text-right border-r border-gray-200 bg-orange-50/20 text-orange-700">代扣總計</th>}

                                    <th className="p-3 text-right bg-green-50 text-green-800 font-black">實發金額</th>
                                </tr>
                            </thead>
                            
                          {/* ✨ 移除了 divide-y，底線由 table 共用的 className 負責 */}
                            <tbody>
                                {/* ✨ 1. 利用 IIFE 將過濾後的本月員工存成變數，並準備加總 */}
                                {(() => {
                                    const currentMonthEmps = employees.filter(e => {
                                        if (e.clientId !== String(selectedClient.id)) return false;
                                        if (!e.endDate) return true;
                                        return `${selectedYear}-${selectedMonth}` <= e.endDate.substring(0, 7);
                                    });

                                    // ✨ 2. 準備用來累加總額的物件
                                    const totals = {
                                        base: 0, fullAtt: 0, pos: 0, perf: 0, taxOt: 0, addTotal: 0,
                                        leave: 0, short: 0, late: 0, pension: 0, dedTotal: 0,
                                        taxable: 0,
                                        food: 0, freeOt: 0, freeTotal: 0,
                                        labor: 0, health: 0, tax: 0, advance: 0, withTotal: 0,
                                        net: 0
                                    };

                                    return (
                                        <>
                                            {/* ✨ 3. 渲染每一位員工的資料列 */}
                                            {currentMonthEmps.map((emp, index) => {
                                                const rowData = monthlyData[emp.id] || {};
                                                
                                                // ⚡ 即時公式試算
                                                const baseSalaryForCalc = rowData.baseSalary || 0;
                                                const hourlyWageForCalc = baseSalaryForCalc / 240;
                                                
                                                const realLateDeduction = Math.round((hourlyWageForCalc / 60) * (rowData.lateHours || 0)); 
                                                const realSickDeduction = Math.round(hourlyWageForCalc * (rowData.sickLeave || 0) / 2); 
                                                const realPersonalDeduction = Math.round(hourlyWageForCalc * (rowData.personalLeave || 0)); 
                                                const realLeaveDeduction = realSickDeduction + realPersonalDeduction;
                                                
                                                const isFullTime = emp.employmentType === 'full_time';
                                                
                                                // 加班費試算
                                                const foodAllowanceForCalc = rowData.foodAllowance || 0;
                                                let realAnnualPay = 0, realHolidayPay = 0, realNormalPay = 0;

                                                if (isFullTime) {
                                                    const otHourlyWage = (baseSalaryForCalc + foodAllowanceForCalc) / 240;
                                                    realAnnualPay = Math.round(otHourlyWage * (rowData.annualLeave || 0));
                                                    realHolidayPay = Math.round(otHourlyWage * (rowData.holidayOt || 0));
                                                    realNormalPay = Math.round(otHourlyWage * (rowData.normalOt || 0) * 1.33);
                                                } else {
                                                    const partTimeHourlyWage = emp.defaultBaseSalary || 0;
                                                    realHolidayPay = Math.round(partTimeHourlyWage * (rowData.holidayOt || 0) * 2);
                                                }
                                                const realTaxFreeOt = realAnnualPay + realHolidayPay + realNormalPay;

                                                // 四大群組與終極公式結算
                                                const totalAdditions = (rowData.baseSalary||0) + (rowData.fullAttendance||0) + (rowData.positionAllowance||0) + (rowData.performanceBonus||0) + (rowData.taxableOt||0);
                                                const totalDeductions = (rowData.leaveDeduction ?? realLeaveDeduction) + (rowData.dailyShortage||0) + (rowData.lateDeduction ?? realLateDeduction) + (rowData.pensionSelf||0);
                                                const totalTaxFree = (rowData.foodAllowance||0) + ((rowData.taxFreeOt ?? realTaxFreeOt) || 0);
                                                const totalWithholdings = (rowData.laborIns||0) + (rowData.healthIns||0) + (rowData.incomeTax||0) + (rowData.advancePay||0);

                                                const taxableAmount = totalAdditions - totalDeductions;
                                                const netPay = taxableAmount + totalTaxFree - totalWithholdings;

                                                // ✨ 4. 將這名員工的金額累加到總計物件中
                                                totals.base += (rowData.baseSalary||0); totals.fullAtt += (rowData.fullAttendance||0); totals.pos += (rowData.positionAllowance||0); totals.perf += (rowData.performanceBonus||0); totals.taxOt += (rowData.taxableOt||0); totals.addTotal += totalAdditions;
                                                totals.leave += (rowData.leaveDeduction ?? realLeaveDeduction); totals.short += (rowData.dailyShortage||0); totals.late += (rowData.lateDeduction ?? realLateDeduction); totals.pension += (rowData.pensionSelf||0); totals.dedTotal += totalDeductions;
                                                totals.taxable += taxableAmount;
                                                totals.food += (rowData.foodAllowance||0); totals.freeOt += ((rowData.taxFreeOt ?? realTaxFreeOt) || 0); totals.freeTotal += totalTaxFree;
                                                totals.labor += (rowData.laborIns||0); totals.health += (rowData.healthIns||0); totals.tax += (rowData.incomeTax||0); totals.advance += (rowData.advancePay||0); totals.withTotal += totalWithholdings;
                                                totals.net += netPay;

                                                return (
                                                    <tr key={emp.id} onClick={() => handleRowClickMonthly(emp)} className="hover:bg-blue-50 transition-colors cursor-pointer group">
                                                        {/* 凍結區 */}
                                                        <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] text-center font-mono text-gray-400 sticky left-0 z-20 bg-white group-hover:bg-blue-50 border-r border-gray-100">{emp.empNo || String(index + 1).padStart(3, '0')}</td>
                                                        <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] text-center sticky left-[60px] z-20 bg-white group-hover:bg-blue-50 border-r border-gray-100">
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isFullTime ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {isFullTime ? '正職' : '兼職'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 w-[100px] min-w-[100px] max-w-[100px] sticky left-[120px] z-20 bg-white group-hover:bg-blue-50 border-r-2 border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-gray-800 group-hover:text-blue-600 transition-colors">{emp.name}</span>
                                                                {emp.endDate && emp.endDate.substring(0, 7) === `${selectedYear}-${selectedMonth}` && (
                                                                    <span className="text-[10px] text-red-500 font-bold -mt-0.5 tracking-tighter">
                                                                        {emp.endDate.substring(5).replace('-', '/')} 離職
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        
                                                        {/* 出勤變數 */}
                                                        <td className="p-3 text-center font-bold text-gray-600">{isFullTime ? '-' : (rowData.workHours || 0)}</td>
                                                        <td className="p-3 group/cell relative text-center">
                                                            <span className="font-bold text-gray-600 group-hover/cell:opacity-0 transition-opacity">{rowData.lateHours || 0}</span>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/cell:opacity-100 text-red-600 font-black text-sm bg-red-50 rounded transition-all">-${realLateDeduction}</div>
                                                        </td>
                                                        <td className="p-3 group/cell relative text-center">
                                                            <span className="font-bold text-gray-600 group-hover/cell:opacity-0 transition-opacity">{rowData.sickLeave || 0}</span>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/cell:opacity-100 text-red-600 font-black text-sm bg-red-50 rounded transition-all">-${realSickDeduction}</div>
                                                        </td>
                                                        <td className="p-3 border-r border-gray-200 group/cell relative text-center">
                                                            <span className="font-bold text-gray-600 group-hover/cell:opacity-0 transition-opacity">{rowData.personalLeave || 0}</span>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/cell:opacity-100 text-red-600 font-black text-sm bg-red-50 rounded transition-all">-${realPersonalDeduction}</div>
                                                        </td>

                                                        <td className="p-3 border-l border-gray-100 group/cell relative text-center">
                                                            <span className={`font-bold transition-opacity ${isFullTime ? 'text-gray-600 group-hover/cell:opacity-0' : 'text-gray-300'}`}>{isFullTime ? (rowData.annualLeave || 0) : '-'}</span>
                                                            {isFullTime && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/cell:opacity-100 text-blue-600 font-black text-sm bg-blue-50 rounded transition-all">+${realAnnualPay}</div>}
                                                        </td>
                                                        <td className="p-3 group/cell relative text-center">
                                                            <span className="font-bold text-gray-600 group-hover/cell:opacity-0 transition-opacity">{rowData.holidayOt || 0}</span>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/cell:opacity-100 text-blue-600 font-black text-sm bg-blue-50 rounded transition-all">+${realHolidayPay}</div>
                                                        </td>
                                                        <td className="p-3 border-r border-gray-200 group/cell relative text-center">
                                                            <span className={`font-bold transition-opacity ${isFullTime ? 'text-gray-600 group-hover/cell:opacity-0' : 'text-gray-300'}`}>{isFullTime ? (rowData.normalOt || 0) : '-'}</span>
                                                            {isFullTime && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/cell:opacity-100 text-blue-600 font-black text-sm bg-blue-50 rounded transition-all">+${realNormalPay}</div>}
                                                        </td>

                                                        {/* 財務摺疊顯示 */}
                                                        {expandedGroups.additions ? (
                                                            <>
                                                                <td className="p-3 text-right font-medium text-gray-600">{(rowData.baseSalary || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-gray-600">{(rowData.fullAttendance || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-gray-600">{(rowData.positionAllowance || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-gray-600">{(rowData.performanceBonus || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-gray-600 border-r border-gray-200">{(rowData.taxableOt || 0).toLocaleString()}</td>
                                                            </>
                                                        ) : <td className="p-3 text-right border-r border-gray-200 font-bold text-blue-700">{totalAdditions.toLocaleString()}</td>}

                                                        {expandedGroups.deductions ? (
                                                            <>
                                                                <td className="p-3 text-right font-medium text-red-500">{(rowData.leaveDeduction ?? realLeaveDeduction).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-red-500">{(rowData.dailyShortage || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-red-500">{(rowData.lateDeduction ?? realLateDeduction).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-red-500 border-r border-gray-200">{(rowData.pensionSelf || 0).toLocaleString()}</td>
                                                            </>
                                                        ) : <td className="p-3 text-right border-r border-gray-200 font-bold text-red-600">{totalDeductions.toLocaleString()}</td>}

                                                        <td className="p-3 text-right border-r border-gray-200 font-black text-purple-700 bg-purple-50/20">{taxableAmount.toLocaleString()}</td>

                                                        {expandedGroups.taxFree ? (
                                                            <>
                                                                <td className="p-3 text-right font-medium text-yellow-600">{(rowData.foodAllowance || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-yellow-600 border-r border-gray-200">{((rowData.taxFreeOt ?? realTaxFreeOt) || 0).toLocaleString()}</td>
                                                            </>
                                                        ) : <td className="p-3 text-right border-r border-gray-200 font-bold text-yellow-600">{totalTaxFree.toLocaleString()}</td>}

                                                        {expandedGroups.withholdings ? (
                                                            <>
                                                                <td className="p-3 text-right font-medium text-orange-500">{(rowData.laborIns || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-orange-500">{(rowData.healthIns || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-orange-500">{(rowData.incomeTax || 0).toLocaleString()}</td>
                                                                <td className="p-3 text-right font-medium text-orange-500 border-r border-gray-200">{(rowData.advancePay || 0).toLocaleString()}</td>
                                                            </>
                                                        ) : <td className="p-3 text-right border-r border-gray-200 font-bold text-orange-600">{totalWithholdings.toLocaleString()}</td>}

                                                        <td className="p-3 text-right font-black text-lg text-green-700 bg-green-50/50">{netPay.toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}

                                            {/* ✨ 5. 新增：超顯眼的「本月總計」列 */}
                                            {currentMonthEmps.length > 0 && (
                                                <tr className="bg-gray-100 hover:bg-gray-200 transition-colors cursor-default border-t-2 border-gray-300">
                                                    {/* 凍結區：序號與職稱留白，顯示本月總計 */}
                                                    <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] sticky left-0 z-20 bg-gray-100 border-r border-gray-200"></td>
                                                    <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] sticky left-[60px] z-20 bg-gray-100 border-r border-gray-200"></td>
                                                    <td className="p-3 w-[100px] min-w-[100px] max-w-[100px] font-black text-gray-800 text-center sticky left-[120px] z-20 bg-gray-100 border-r-2 border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">本月總計</td>
                                                    
                                                    {/* 時數區塊全部留白 (顯示 -) */}
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400 border-r border-gray-200">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400 border-r border-gray-200">-</td>

                                                    {/* 財務摺疊顯示區塊 (總和) */}
                                                    {expandedGroups.additions ? (
                                                        <>
                                                            <td className="p-3 text-right font-black text-gray-700">{totals.base.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-gray-700">{totals.fullAtt.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-gray-700">{totals.pos.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-gray-700">{totals.perf.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-gray-700 border-r border-gray-200">{totals.taxOt.toLocaleString()}</td>
                                                        </>
                                                    ) : <td className="p-3 text-right border-r border-gray-200 font-black text-blue-800">{totals.addTotal.toLocaleString()}</td>}

                                                    {expandedGroups.deductions ? (
                                                        <>
                                                            <td className="p-3 text-right font-black text-red-600">{totals.leave.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-red-600">{totals.short.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-red-600">{totals.late.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-red-600 border-r border-gray-200">{totals.pension.toLocaleString()}</td>
                                                        </>
                                                    ) : <td className="p-3 text-right border-r border-gray-200 font-black text-red-700">{totals.dedTotal.toLocaleString()}</td>}

                                                    <td className="p-3 text-right border-r border-gray-200 font-black text-purple-800 bg-purple-100/50">{totals.taxable.toLocaleString()}</td>

                                                    {expandedGroups.taxFree ? (
                                                        <>
                                                            <td className="p-3 text-right font-black text-yellow-700">{totals.food.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-yellow-700 border-r border-gray-200">{totals.freeOt.toLocaleString()}</td>
                                                        </>
                                                    ) : <td className="p-3 text-right border-r border-gray-200 font-black text-yellow-700">{totals.freeTotal.toLocaleString()}</td>}

                                                    {expandedGroups.withholdings ? (
                                                        <>
                                                            <td className="p-3 text-right font-black text-orange-600">{totals.labor.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-orange-600">{totals.health.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-orange-600">{totals.tax.toLocaleString()}</td>
                                                            <td className="p-3 text-right font-black text-orange-600 border-r border-gray-200">{totals.advance.toLocaleString()}</td>
                                                        </>
                                                    ) : <td className="p-3 text-right border-r border-gray-200 font-black text-orange-700">{totals.withTotal.toLocaleString()}</td>}

                                                    <td className="p-3 text-right font-black text-xl text-green-800 bg-green-100/80">{totals.net.toLocaleString()}</td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

          {/* 🚀 薪資編輯小視窗 */}
                    {isMonthlyEditModalOpen && (
                        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsMonthlyEditModalOpen(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                        {isAddingNewMonthly ? '新增薪資紀錄' : `編輯薪資結算 - ${editingMonthlyEmp?.name}`}
                                        {editingMonthlyEmp && (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${editingMonthlyEmp.employmentType === 'full_time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {editingMonthlyEmp.employmentType === 'full_time' ? '正職' : '兼職'}
                                            </span>
                                        )}
                                    </h3>
                                    <button onClick={() => setIsMonthlyEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-black">✕</button>
                                </div>
                                
                              <form onSubmit={handleSaveMonthlyData} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                                    
                                    {/* ✨ 如果是由「新增按鈕」開啟，強制要求先選擇員工 */}
                                    {isAddingNewMonthly && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                                            <label className="block text-sm font-bold text-blue-800 mb-2">請選擇要編輯的員工</label>
                                            <select 
                                                required
                                                onChange={(e) => {
                                                    const emp = employees.find(emp => emp.id === e.target.value);
                                                    if (emp) {
                                                        setEditingMonthlyEmp(emp);
                                                        setMonthlyFormData(monthlyData[emp.id] || {
                                                            baseSalary: emp.defaultBaseSalary, foodAllowance: emp.defaultFoodAllowance
                                                        });
                                                    }
                                                }} 
                                                className="w-full border border-blue-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white"
                                            >
                                              <option value="">-- 請選擇員工 --</option>
                                                {/* ✨ 下拉選單也套用相同的離職過濾邏輯 */}
                                                {employees.filter(e => {
                                                    if (e.clientId !== String(selectedClient?.id)) return false;
                                                    if (!e.endDate) return true;
                                                    return `${selectedYear}-${selectedMonth}` <= e.endDate.substring(0, 7);
                                                }).map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.empNo})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* 只有選擇了員工，才會顯示下方的填寫欄位 */}
                                    {editingMonthlyEmp && (
                                        <>
                                            {/* 區塊 1: 出勤時數變數 */}
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-gray-500 rounded-full"></div>出勤變數輸入</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">出勤時數</label>
                                                        <input type="number" disabled={editingMonthlyEmp.employmentType === 'full_time'} value={editingMonthlyEmp.employmentType === 'full_time' ? '' : (monthlyFormData.workHours || '')} onChange={e => handleMonthlyFormChange('workHours', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={editingMonthlyEmp.employmentType === 'full_time' ? '正職免填' : '0'} />
                                                    </div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">遲到 (分)</label><input type="number" value={monthlyFormData.lateHours || ''} onChange={e => handleMonthlyFormChange('lateHours', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600 bg-red-50/30" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">病假 (時)</label><input type="number" value={monthlyFormData.sickLeave || ''} onChange={e => handleMonthlyFormChange('sickLeave', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600 bg-red-50/30" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">事假 (時)</label><input type="number" value={monthlyFormData.personalLeave || ''} onChange={e => handleMonthlyFormChange('personalLeave', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600 bg-red-50/30" placeholder="0" /></div>
                                                    
                                                    {/* ✨ 新增加班時數 */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-blue-500 mb-1">特休換薪 (時)</label>
                                                        <input type="number" disabled={editingMonthlyEmp.employmentType === 'part_time'} value={editingMonthlyEmp.employmentType === 'part_time' ? '' : (monthlyFormData.annualLeave || '')} onChange={e => handleMonthlyFormChange('annualLeave', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-600 bg-blue-50/30 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={editingMonthlyEmp.employmentType === 'part_time' ? '兼職無' : '0'} />
                                                    </div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">國定加班 (時)</label><input type="number" value={monthlyFormData.holidayOt || ''} onChange={e => handleMonthlyFormChange('holidayOt', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-600 bg-blue-50/30" placeholder="0" /></div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-blue-500 mb-1">日常加班 (時)</label>
                                                        <input type="number" disabled={editingMonthlyEmp.employmentType === 'part_time'} value={editingMonthlyEmp.employmentType === 'part_time' ? '' : (monthlyFormData.normalOt || '')} onChange={e => handleMonthlyFormChange('normalOt', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-600 bg-blue-50/30 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={editingMonthlyEmp.employmentType === 'part_time' ? '兼職無' : '0'} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 區塊 2: 應加金額 */}
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-blue-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>應加與免稅金額</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {/* ✨ 唯讀自動計算區 */}
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">免稅加班費 (自動算)</label><input type="text" disabled value={monthlyFormData.taxFreeOt || 0} className="w-full border p-2.5 rounded-xl font-bold text-gray-500 bg-gray-100 cursor-not-allowed text-right" /></div>
                                                    
                                                    {/* 手動輸入區 */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-blue-500 mb-1">{editingMonthlyEmp.employmentType === 'full_time' ? '本薪' : '時薪'}</label>
                                                        <input type="number" disabled={editingMonthlyEmp.employmentType === 'part_time'} value={monthlyFormData.baseSalary || ''} onChange={e => handleMonthlyFormChange('baseSalary', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-800 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="0" />
                                                        {editingMonthlyEmp.employmentType === 'part_time' && <span className="text-[10px] text-gray-400 mt-1">兼職由時數自動計算</span>}
                                                    </div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">全勤獎金</label><input type="number" value={monthlyFormData.fullAttendance || ''} onChange={e => handleMonthlyFormChange('fullAttendance', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">職務津貼</label><input type="number" value={monthlyFormData.positionAllowance || ''} onChange={e => handleMonthlyFormChange('positionAllowance', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">業績獎金</label><input type="number" value={monthlyFormData.performanceBonus || ''} onChange={e => handleMonthlyFormChange('performanceBonus', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-yellow-600 mb-1">伙食費 (免稅)</label><input type="number" value={monthlyFormData.foodAllowance || ''} onChange={e => handleMonthlyFormChange('foodAllowance', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" placeholder="0" /></div>
                                                </div>
                                            </div>

                                            {/* 區塊 3: 應扣金額 */}
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-orange-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>應扣與代扣款項</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {/* ✨ 唯讀自動計算區 */}
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">請假扣款 (自動算)</label><input type="text" disabled value={monthlyFormData.leaveDeduction || 0} className="w-full border p-2.5 rounded-xl font-bold text-gray-500 bg-gray-100 cursor-not-allowed text-right" /></div>
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">遲到扣款 (自動算)</label><input type="text" disabled value={monthlyFormData.lateDeduction || 0} className="w-full border p-2.5 rounded-xl font-bold text-gray-500 bg-gray-100 cursor-not-allowed text-right" /></div>
                                                    
                                                    {/* 手動輸入區 */}
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">結帳差額扣款</label><input type="number" value={monthlyFormData.dailyShortage || ''} onChange={e => handleMonthlyFormChange('dailyShortage', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">勞退自提 (6%)</label><input type="number" value={monthlyFormData.pensionSelf || ''} onChange={e => handleMonthlyFormChange('pensionSelf', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">預支款扣回</label><input type="number" value={monthlyFormData.advancePay || ''} onChange={e => handleMonthlyFormChange('advancePay', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold text-orange-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">勞保費</label><input type="number" value={monthlyFormData.laborIns || ''} onChange={e => handleMonthlyFormChange('laborIns', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">健保費</label><input type="number" value={monthlyFormData.healthIns || ''} onChange={e => handleMonthlyFormChange('healthIns', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">所得稅扣繳</label><input type="number" value={monthlyFormData.incomeTax || ''} onChange={e => handleMonthlyFormChange('incomeTax', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" /></div>
                                                </div>
                                            </div>
                                        </>
                                    )} {/* ✨ 這個完美的閉合括號回來了！ */}

                                    {/* 隱藏的按鈕用來觸發 form submit */}
                                    <button type="submit" id="submitMonthlyForm" className="hidden"></button>
                                </form>
                                
                                {/* ✨ 即時預估實發金額與操作按鈕 */}
                                <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 mb-0.5">預估實發金額</span>
                                        <span className="text-2xl font-black text-green-600">${
                                            (((monthlyFormData.baseSalary||0) + (monthlyFormData.fullAttendance||0) + (monthlyFormData.positionAllowance||0) + (monthlyFormData.performanceBonus||0) + (monthlyFormData.taxableOt||0)) - 
                                            ((monthlyFormData.leaveDeduction||0) + (monthlyFormData.dailyShortage||0) + (monthlyFormData.lateDeduction||0) + (monthlyFormData.pensionSelf||0)) + 
                                            ((monthlyFormData.foodAllowance||0) + (monthlyFormData.taxFreeOt||0)) - 
                                            ((monthlyFormData.laborIns||0) + (monthlyFormData.healthIns||0) + (monthlyFormData.incomeTax||0) + (monthlyFormData.advancePay||0))).toLocaleString()
                                        }</span>
                                    </div>
                                  <div className="flex gap-3 w-1/2">
                                        {/* ✨ 一鍵生成薪資單 (員工用，藍色無文字) */}
                                        <button type="button" className="px-4 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center">
                                            <CloudDownloadIcon className="w-6 h-6" />
                                        </button>
                                        <button onClick={() => setIsMonthlyEditModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">取消</button>
                                        <button onClick={() => document.getElementById('submitMonthlyForm')?.click()} className="flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-all bg-blue-600 hover:bg-blue-700">確認存檔</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
          
            {/* 📍 標籤三：年度薪資帳冊 (施工中) */}
            {activeInnerTab === 'yearly' && (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center flex flex-col items-center justify-center h-full">
                    <div className="text-5xl mb-4 opacity-50">📖</div>
                    <h3 className="text-xl font-bold text-gray-600 mb-2">年度薪資帳冊建置中</h3>
                    <p className="text-gray-400">這裡將會自動匯總所有月份的數字，供年底報稅使用！</p>
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

                      {/* 區塊 4: 勞健保設定 */}
                        <div className="space-y-4 bg-blue-50 p-4 rounded-2xl border border-blue-100 mt-4">
                            <h4 className="font-bold text-blue-800 flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>勞健保設定</h4>
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-blue-700 mb-1">勞健保級距</label>
                                    <input type="number" value={editingEmp.insuranceBracket || ''} onChange={e => setEditingEmp({...editingEmp, insuranceBracket: Number(e.target.value)})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-base font-black text-blue-900" placeholder="0" />
                                </div>
                                <div className="flex items-center gap-4 mt-5">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editingEmp.hasLaborIns ?? true} onChange={e => setEditingEmp({...editingEmp, hasLaborIns: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
                                        <span className="font-bold text-blue-800">勞保</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editingEmp.hasHealthIns ?? true} onChange={e => setEditingEmp({...editingEmp, hasHealthIns: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
                                        <span className="font-bold text-blue-800">健保</span>
                                    </label>
                                </div>
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
