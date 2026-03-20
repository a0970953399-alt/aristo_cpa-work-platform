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
  const [payrollClients, setPayrollClients] = useState<PayrollClientConfig[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeInnerTab, setActiveInnerTab] = useState<'employees' | 'monthly' | 'yearly'>('employees');

  const [expandedGroups, setExpandedGroups] = useState({
      additions: false, deductions: false, taxFree: false, withholdings: false
  });

  const currentSystemYear = new Date().getFullYear();
  const currentSystemMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const availableYears = Array.from(
      { length: Math.max(currentSystemYear - 2025 + 2, 2) }, 
      (_, i) => String(2025 + i)
  ).reverse();

  const [selectedYear, setSelectedYear] = useState(String(currentSystemYear));
  const [selectedMonth, setSelectedMonth] = useState(currentSystemMonth);
  const [monthlyData, setMonthlyData] = useState<Record<string, any>>({});
  
  const [yearlySalaries, setYearlySalaries] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ✨ 用來觸發資料更新的魔法變數
  
  const [isMonthlyEditModalOpen, setIsMonthlyEditModalOpen] = useState(false);
  const [editingMonthlyEmp, setEditingMonthlyEmp] = useState<Employee | null>(null);
  const [monthlyFormData, setMonthlyFormData] = useState<any>({});
  const [isAddingNewMonthly, setIsAddingNewMonthly] = useState(false);
  const [editModalMode, setEditModalMode] = useState<'monthly' | 'yearly'>('monthly'); // ✨ 區分是從哪個頁面打開的
  
  // ✨ 新增：彈出視窗專用的月份狀態
  const [editModalMonth, setEditModalMonth] = useState(selectedMonth);

  // ✨ 新增：年度帳冊的反白選取狀態
  const [yearlyHighlightEmpId, setYearlyHighlightEmpId] = useState<string | null>(null);
  
  useEffect(() => {
      const loadMonthlyData = async () => {
          if (activeInnerTab === 'monthly' && selectedClient) {
              const allSalaries = await TaskService.fetchMonthlySalaries();
              const targetMonth = `${selectedYear}-${selectedMonth}`;
              const savedRecords = allSalaries.filter(r => r.clientId === String(selectedClient.id) && r.month === targetMonth);
              
              const initialData: Record<string, any> = {};
              const activeEmps = employees.filter(e => {
                  if (e.clientId !== String(selectedClient.id)) return false;
                  const targetMonthStr = `${selectedYear}-${selectedMonth}`;
                  const startMonthStr = e.startDate ? e.startDate.substring(0, 7) : '';
                  const endMonthStr = e.endDate ? e.endDate.substring(0, 7) : '';
                  if (startMonthStr && targetMonthStr < startMonthStr) return false;
                  if (endMonthStr && targetMonthStr > endMonthStr) return false;
                  return true;
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
                          foodAllowance: emp.employmentType === 'full_time' ? (emp.defaultFoodAllowance || 0) : 0, taxFreeOt: 0,
                          laborIns: 0, healthIns: 0, incomeTax: 0, advancePay: 0
                      };
                  }
              });
              setMonthlyData(initialData);
          }
      };

      const loadYearlyData = async () => {
          if (activeInnerTab === 'yearly' && selectedClient) {
              const allSalaries = await TaskService.fetchMonthlySalaries();
              const savedRecords = allSalaries.filter(r => r.clientId === String(selectedClient.id) && r.month.startsWith(`${selectedYear}-`));
              setYearlySalaries(savedRecords);
          }
      };

      loadMonthlyData();
      loadYearlyData();
  }, [activeInnerTab, selectedClient, employees, selectedYear, selectedMonth, refreshTrigger]);

  // ✨ 專門給 Modal 讀取指定月份資料用的函數
  const loadFormDataForMonth = async (emp: Employee, month: string) => {
      const targetMonthStr = `${selectedYear}-${month}`;
      const allSalaries = await TaskService.fetchMonthlySalaries();
      const record = allSalaries.find(r => r.clientId === String(selectedClient?.id) && r.employeeId === emp.id && r.month === targetMonthStr);

      if (record) {
          setMonthlyFormData(record);
      } else {
          setMonthlyFormData({
              workHours: 0, lateHours: 0, sickLeave: 0, personalLeave: 0, annualLeave: 0, holidayOt: 0, normalOt: 0,
              baseSalary: emp.defaultBaseSalary || 0, fullAttendance: 0, positionAllowance: 0, performanceBonus: 0, taxableOt: 0,
              leaveDeduction: 0, dailyShortage: 0, lateDeduction: 0, pensionSelf: 0,
              foodAllowance: emp.employmentType === 'full_time' ? (emp.defaultFoodAllowance || 0) : 0, taxFreeOt: 0,
              laborIns: 0, healthIns: 0, incomeTax: 0, advancePay: 0
          });
      }
  };

  const handleModalMonthSwitch = (m: string) => {
      if (!editingMonthlyEmp) return;
      setEditModalMonth(m);
      loadFormDataForMonth(editingMonthlyEmp, m);
  };

  const handleSaveMonthlyData = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingMonthlyEmp || !selectedClient) return;

      const record: any = {
          id: monthlyFormData.id || Date.now().toString(),
          clientId: String(selectedClient.id),
          employeeId: editingMonthlyEmp.id,
          month: `${selectedYear}-${editModalMonth}`, // ✨ 存到視窗目前選擇的月份
          updatedAt: new Date().toISOString(),
          ...monthlyFormData
      };

      const allSalaries = await TaskService.fetchMonthlySalaries();
      const existingIdx = allSalaries.findIndex(r => r.clientId === String(selectedClient.id) && r.employeeId === editingMonthlyEmp.id && r.month === record.month);
      if (existingIdx !== -1) {
          allSalaries[existingIdx] = record;
      } else {
          allSalaries.push(record);
      }
      
      await TaskService.saveMonthlySalaries(allSalaries);
      setRefreshTrigger(p => p + 1); // ✨ 觸發重新讀取，讓背景表格瞬間更新
      setIsMonthlyEditModalOpen(false);
  };

  const handleExportEmployerExcel = async () => {
      try {
          if (!selectedClient) return;
          if (!PAYROLL_TEMPLATE_BASE64 || PAYROLL_TEMPLATE_BASE64.startsWith("這裡放")) {
              alert("請先在程式碼最上方放入 Base64 模板代碼！");
              return;
          }

          const cleanBase64 = PAYROLL_TEMPLATE_BASE64.replace(/\s/g, '');
          const binaryString = window.atob(cleanBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }

          const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook;
          if (!Workbook) throw new Error("ExcelJS 套件載入異常，找不到 Workbook 建構子");

          const workbook = new Workbook();
          await workbook.xlsx.load(bytes.buffer);
          const ws = workbook.worksheets[0]; 

          const currentMonthEmps = employees.filter(e => {
              if (e.clientId !== String(selectedClient.id)) return false;
              const targetMonthStr = `${selectedYear}-${selectedMonth}`;
              const startMonthStr = e.startDate ? e.startDate.substring(0, 7) : '';
              const endMonthStr = e.endDate ? e.endDate.substring(0, 7) : '';
              
              if (startMonthStr && targetMonthStr < startMonthStr) return false;
              if (endMonthStr && targetMonthStr > endMonthStr) return false;
              return true;
          });

          if (currentMonthEmps.length === 0) {
              alert("本月無在職員工可匯出！");
              return;
          }

          const totals = {
              base: 0, food: 0, ot: 0, otherAdd: 0,
              leave: 0, late: 0, labor: 0, health: 0, otherDed: 0, net: 0
          };

          const twYear = Number(selectedYear) - 1911;
          const monthStr = `${twYear}-${selectedMonth}`;

          if (currentMonthEmps.length > 1) {
              ws.duplicateRow(2, currentMonthEmps.length - 1, true);
          }

          currentMonthEmps.forEach((emp, index) => {
              const R = 2 + index; 
              const row = ws.getRow(R);
              const rowData = monthlyData[emp.id] || {};
              const isFullTime = emp.employmentType === 'full_time';

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
          if (emp.endDate && emp.endDate.substring(0, 7) === `${selectedYear}-${selectedMonth}`) {
              const m = parseInt(emp.endDate.substring(5, 7), 10);
              const d = parseInt(emp.endDate.substring(8, 10), 10);
              remarks.push(`${m}/${d}離職`);
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

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          saveAs(blob, `${selectedClient.name}_薪資總表_${selectedYear}${selectedMonth}.xlsx`);

      } catch (error: any) {
          console.error("匯出失敗詳細錯誤：", error);
          alert(`匯出失敗！請將此錯誤訊息告訴 AI：\n\n${error.message}`);
      }
  };
  
  const handleRowClickMonthly = (emp: Employee) => {
      setEditingMonthlyEmp(emp);
      setEditModalMonth(selectedMonth);
      setEditModalMode('monthly'); // ✨ 設定為每月模式
      loadFormDataForMonth(emp, selectedMonth);
      setIsAddingNewMonthly(false);
      setIsMonthlyEditModalOpen(true);
  };

  const handleMonthlyFormChange = (field: string, value: string) => {
      const numValue = Number(value) || 0;
      let updatedData = { ...monthlyFormData, [field]: numValue };
      
      const isFullTime = editingMonthlyEmp?.employmentType === 'full_time';

      if (field === 'workHours' && !isFullTime) {
          updatedData.baseSalary = numValue * (editingMonthlyEmp?.defaultBaseSalary || 0);
      }
      
      const currentBaseSalary = field === 'baseSalary' ? numValue : (updatedData.baseSalary || 0);
      const currentFoodAllowance = field === 'foodAllowance' ? numValue : (updatedData.foodAllowance || 0);
      
      const hourlyWage = currentBaseSalary / 240;
      const minuteWage = hourlyWage / 60;

      const currentLate = field === 'lateHours' ? numValue : (updatedData.lateHours || 0);
      const currentSick = field === 'sickLeave' ? numValue : (updatedData.sickLeave || 0);
      const currentPersonal = field === 'personalLeave' ? numValue : (updatedData.personalLeave || 0);

      updatedData.lateDeduction = Math.round(minuteWage * currentLate);
      const sickDed = Math.round(hourlyWage * currentSick / 2);
      const personalDed = Math.round(hourlyWage * currentPersonal);
      updatedData.leaveDeduction = sickDed + personalDed;

      const currentAnnual = field === 'annualLeave' ? numValue : (updatedData.annualLeave || 0);
      const currentHoliday = field === 'holidayOt' ? numValue : (updatedData.holidayOt || 0);
      const currentNormal = field === 'normalOt' ? numValue : (updatedData.normalOt || 0);

      let annualPay = 0, holidayPay = 0, normalPay = 0;

      if (isFullTime) {
          const otHourlyWage = (currentBaseSalary + currentFoodAllowance) / 240;
          annualPay = Math.round(otHourlyWage * currentAnnual);
          holidayPay = Math.round(otHourlyWage * currentHoliday);
          normalPay = Math.round(otHourlyWage * currentNormal * 1.33);
      } else {
          const partTimeHourlyWage = editingMonthlyEmp?.defaultBaseSalary || 0;
          holidayPay = Math.round(partTimeHourlyWage * currentHoliday * 2);
      }

      updatedData.taxFreeOt = annualPay + holidayPay + normalPay;
      setMonthlyFormData(updatedData);
  };
  
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [newClientSelectId, setNewClientSelectId] = useState('');
  const [clientsToDelete, setClientsToDelete] = useState<string[]>([]);
  
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Partial<Employee> | null>(null);

  const empFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportEmpExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 匯入邏輯保持不變
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

        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          if (!row[2]) continue;

          const empNo = String(row[0] || '').trim();
          const typeStr = String(row[1] || '').trim();
          const employmentType: EmploymentType = (typeStr.includes('兼職') || typeStr.toUpperCase() === 'PART_TIME') ? 'part_time' : 'full_time';
          const name = String(row[2] || '').trim();
          const email = String(row[3] || '').trim();

          const formatDate = (val: any) => {
              if (!val) return '';
              if (val instanceof Date) return new Date(val.getTime() - (val.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
              return String(val).replace(/\//g, '-').trim();
          };

          const startDate = formatDate(row[4]) || new Date().toISOString().split('T')[0];
          const endDate = formatDate(row[5]);
          const idNumber = String(row[6] || '').trim().toUpperCase();
          const bankBranch = String(row[7] || '').trim();
          const bankAccount = String(row[8] || '').trim();
          const address = String(row[9] || '').trim();

          const newEmp: Employee = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
              clientId: String(selectedClient.id),
              empNo, employmentType, name, email, startDate, endDate, idNumber,
              bankBranch, bankAccount, address, defaultBaseSalary: 0, defaultFoodAllowance: 0,
              createdAt: new Date().toISOString()
          };
          newEmps.push(newEmp);
        }

        if (newEmps.length > 0) {
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

  const handleOpenAddEmp = () => {
    setEditingEmp({
        employmentType: 'full_time', email: '', defaultBaseSalary: 0, defaultFoodAllowance: 0,
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
        defaultFoodAllowance: editingEmp.employmentType === 'full_time' ? (Number(editingEmp.defaultFoodAllowance) || 0) : 0,
        insuranceBracket: Number(editingEmp.insuranceBracket) || 0,
        hasLaborIns: editingEmp.hasLaborIns ?? true,
        hasHealthIns: editingEmp.hasHealthIns ?? true,
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

  if (selectedClient) {
    // ✨ Feature 1: 員工排序邏輯 (正職優先，再來依編號，離職墊底)
    const currentEmps = employees
        .filter(e => e.clientId === String(selectedClient.id))
        .sort((a, b) => {
            const aResigned = !!a.endDate;
            const bResigned = !!b.endDate;
            if (aResigned && !bResigned) return 1; 
            if (!aResigned && bResigned) return -1;
            
            if (a.employmentType === 'full_time' && b.employmentType !== 'full_time') return -1;
            if (a.employmentType !== 'full_time' && b.employmentType === 'full_time') return 1;

            return (a.empNo || '').localeCompare(b.empNo || '');
        });

    return (
      <div className="h-full flex flex-col animate-fade-in bg-gray-50">
        
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="返回客戶列表">
              <ReturnIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">{selectedClient.name} - 薪資明細</h2>
            
            {(activeInnerTab === 'monthly' || activeInnerTab === 'yearly') && (
                <div className="flex items-center gap-2 ml-4 animate-fade-in">
                  <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500">
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year} 年</option>
                        ))}
                    </select>
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
          
          <div className="flex items-center gap-3">
              <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner">
                  <button onClick={() => setActiveInnerTab('employees')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'employees' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>👥 員工名單</button>
                  <button onClick={() => setActiveInnerTab('monthly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📅 每月薪資明細</button>
                  <button onClick={() => setActiveInnerTab('yearly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📖 年度薪資帳冊</button>
              </div>

            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={empFileInputRef} onChange={handleImportEmpExcel} />

              {/* ✨ 將按鈕區塊包裝在固定寬度 (88px) 內，防止標籤頁因按鈕消失而偏移 */}
              <div className="w-[88px] flex justify-end">
                  {activeInnerTab === 'employees' && (
                      <div className="flex items-center gap-2 animate-fade-in">
                          <button onClick={() => empFileInputRef.current?.click()} title="匯入 Excel" className="p-2.5 bg-white border border-green-200 text-green-600 font-bold rounded-xl shadow-sm hover:bg-green-50 active:scale-95 flex items-center justify-center transition-colors">
                              <ExcelFileIcon className="w-5 h-5" />
                          </button>
                          <button onClick={handleOpenAddEmp} title="新增員工" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center">
                              <PlusIcon className="w-5 h-5" />
                          </button>
                      </div>
                  )}

                  {activeInnerTab === 'monthly' && (
                      <div className="flex items-center gap-2 animate-fade-in">
                          <button title="匯入出勤 Excel" className="p-2.5 bg-white border border-green-200 text-green-600 font-bold rounded-xl shadow-sm hover:bg-green-50 active:scale-95 flex items-center justify-center transition-colors">
                              <ExcelFileIcon className="w-5 h-5" />
                          </button>
                          <button onClick={handleExportEmployerExcel} className="p-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center">
                              <CloudDownloadIcon className="w-5 h-5" />
                          </button>
                      </div>
                  )}
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
            
            {/* 📍 標籤一：員工名單 */}
            {activeInnerTab === 'employees' && (
                <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                                <tr>
                                  <th className="p-3 font-bold text-gray-500 w-16 text-center">序號</th>
                                    <th className="p-3 font-bold text-gray-500 w-20 text-center">職稱</th>
                                    <th className="p-3 font-bold text-gray-500 w-32">姓名</th>
                                    <th className="p-3 font-bold text-gray-500 w-48">電子郵件</th>
                                    <th className="p-3 font-bold text-gray-500 w-32 font-mono">身分證字號</th>
                                    <th className="p-3 font-bold text-gray-500 w-40">銀行分行</th>
                                    <th className="p-3 font-bold text-gray-500 w-40 font-mono">帳戶代號</th>
                                    <th className="p-3 font-bold text-gray-500">戶籍地址</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentEmps.map((emp, index) => {
                                    const isResigned = !!emp.endDate; 
                                    return (
                                        <tr 
                                            key={emp.id} 
                                            onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }}
                                            className={`cursor-pointer transition-colors group ${
                                                isResigned 
                                                ? 'bg-gray-100/50 opacity-75 hover:bg-gray-200/50' 
                                                : 'hover:bg-blue-50/50'
                                            }`}
                                        >
                                            <td className={`p-3 text-center font-mono ${isResigned ? 'text-gray-400' : 'text-gray-400'}`}>{emp.empNo || String(index + 1).padStart(3, '0')}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                                    isResigned 
                                                    ? 'bg-gray-200 text-gray-500' 
                                                    : (emp.employmentType === 'full_time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')
                                                }`}>
                                                    {emp.employmentType === 'full_time' ? '正職' : '兼職'}
                                                </span>
                                            </td>
                                            <td className={`p-3 font-black text-base transition-colors ${isResigned ? 'text-gray-500' : 'text-gray-800 group-hover:text-blue-600'}`}>
                                                {emp.name}
                                            </td>
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-500'}`}>{emp.email || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.idNumber || '-'}</td>
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.bankBranch || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.bankAccount || '-'}</td>
                                            
                                            <td className={`p-3 text-sm whitespace-normal ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {emp.address || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
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
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-full text-left text-sm border-separate border-spacing-0 whitespace-nowrap [&_td]:border-b [&_td]:border-gray-100 [&_th]:border-b [&_th]:border-gray-200">
                            <thead className="sticky top-0 z-30 shadow-sm">
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
                                <tr className="text-xs font-bold text-gray-500 bg-white">
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
                            <tbody>
                                {(() => {
                                    const currentMonthEmps = employees.filter(e => {
                                        if (e.clientId !== String(selectedClient.id)) return false;
                                        
                                        const targetMonthStr = `${selectedYear}-${selectedMonth}`;
                                        const startMonthStr = e.startDate ? e.startDate.substring(0, 7) : '';
                                        const endMonthStr = e.endDate ? e.endDate.substring(0, 7) : '';
                                        
                                        if (startMonthStr && targetMonthStr < startMonthStr) return false;
                                        if (endMonthStr && targetMonthStr > endMonthStr) return false;
                                        
                                        return true;
                                    });

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
                                            {currentMonthEmps.map((emp, index) => {
                                                const rowData = monthlyData[emp.id] || {};
                                                
                                                const baseSalaryForCalc = rowData.baseSalary || 0;
                                                const hourlyWageForCalc = baseSalaryForCalc / 240;
                                                
                                                const realLateDeduction = Math.round((hourlyWageForCalc / 60) * (rowData.lateHours || 0)); 
                                                const realSickDeduction = Math.round(hourlyWageForCalc * (rowData.sickLeave || 0) / 2); 
                                                const realPersonalDeduction = Math.round(hourlyWageForCalc * (rowData.personalLeave || 0)); 
                                                const realLeaveDeduction = realSickDeduction + realPersonalDeduction;
                                                
                                                const isFullTime = emp.employmentType === 'full_time';
                                                
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

                                                const totalAdditions = (rowData.baseSalary||0) + (rowData.fullAttendance||0) + (rowData.positionAllowance||0) + (rowData.performanceBonus||0) + (rowData.taxableOt||0);
                                                const totalDeductions = (rowData.leaveDeduction ?? realLeaveDeduction) + (rowData.dailyShortage||0) + (rowData.lateDeduction ?? realLateDeduction) + (rowData.pensionSelf||0);
                                                const totalTaxFree = (rowData.foodAllowance||0) + ((rowData.taxFreeOt ?? realTaxFreeOt) || 0);
                                                const totalWithholdings = (rowData.laborIns||0) + (rowData.healthIns||0) + (rowData.incomeTax||0) + (rowData.advancePay||0);

                                                const taxableAmount = totalAdditions - totalDeductions;
                                                const netPay = taxableAmount + totalTaxFree - totalWithholdings;

                                                totals.base += (rowData.baseSalary||0); totals.fullAtt += (rowData.fullAttendance||0); totals.pos += (rowData.positionAllowance||0); totals.perf += (rowData.performanceBonus||0); totals.taxOt += (rowData.taxableOt||0); totals.addTotal += totalAdditions;
                                                totals.leave += (rowData.leaveDeduction ?? realLeaveDeduction); totals.short += (rowData.dailyShortage||0); totals.late += (rowData.lateDeduction ?? realLateDeduction); totals.pension += (rowData.pensionSelf||0); totals.dedTotal += totalDeductions;
                                                totals.taxable += taxableAmount;
                                                totals.food += (rowData.foodAllowance||0); totals.freeOt += ((rowData.taxFreeOt ?? realTaxFreeOt) || 0); totals.freeTotal += totalTaxFree;
                                                totals.labor += (rowData.laborIns||0); totals.health += (rowData.healthIns||0); totals.tax += (rowData.incomeTax||0); totals.advance += (rowData.advancePay||0); totals.withTotal += totalWithholdings;
                                                totals.net += netPay;

                                                return (
                                                    <tr key={emp.id} onClick={() => handleRowClickMonthly(emp)} className="hover:bg-blue-50 transition-colors cursor-pointer group">
                                                        <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] text-center font-mono text-gray-400 sticky left-0 z-20 bg-white group-hover:bg-blue-50 border-r border-gray-100">{emp.empNo || String(index + 1).padStart(3, '0')}</td>
                                                        <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] text-center sticky left-[60px] z-20 bg-white group-hover:bg-blue-50 border-r border-gray-100">
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isFullTime ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {isFullTime ? '正職' : '兼職'}
                                                            </span>
                                                        </td>
                                                      <td className="p-3 w-[100px] min-w-[100px] max-w-[100px] sticky left-[120px] z-20 bg-white group-hover:bg-blue-50 border-r-2 border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-gray-800 group-hover:text-blue-600 transition-colors">{emp.name}</span>
                                                                {emp.startDate && emp.startDate.substring(0, 7) === `${selectedYear}-${selectedMonth}` && (
                                                                    <span className="text-[10px] text-green-600 font-bold -mt-0.5 tracking-tighter">
                                                                        {emp.startDate.substring(5).replace('-', '/')} 到職
                                                                    </span>
                                                                )}
                                                                {emp.endDate && emp.endDate.substring(0, 7) === `${selectedYear}-${selectedMonth}` && (
                                                                    <span className="text-[10px] text-red-500 font-bold -mt-0.5 tracking-tighter">
                                                                        {emp.endDate.substring(5).replace('-', '/')} 離職
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        
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

                                            {currentMonthEmps.length > 0 && (
                                                <tr className="bg-gray-100 hover:bg-gray-200 transition-colors cursor-default border-t-2 border-gray-300">
                                                    <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] sticky left-0 z-20 bg-gray-100 border-r border-gray-200"></td>
                                                    <td className="p-3 w-[60px] min-w-[60px] max-w-[60px] sticky left-[60px] z-20 bg-gray-100 border-r border-gray-200"></td>
                                                    <td className="p-3 w-[100px] min-w-[100px] max-w-[100px] font-black text-gray-800 text-center sticky left-[120px] z-20 bg-gray-100 border-r-2 border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">本月總計</td>
                                                    
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400 border-r border-gray-200">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400">-</td>
                                                    <td className="p-3 text-center text-gray-400 border-r border-gray-200">-</td>

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

            {/* 📍 標籤三：年度薪資帳冊 (唯讀匯總版 + 互動式編輯) */}
            {activeInnerTab === 'yearly' && (() => {
                const yearlyEmps = employees.filter(e => {
                    if (e.clientId !== String(selectedClient.id)) return false;
                    const startYear = e.startDate ? e.startDate.substring(0, 4) : '';
                    const endYear = e.endDate ? e.endDate.substring(0, 4) : '';
                    if (startYear && selectedYear < startYear) return false;
                    if (endYear && selectedYear > endYear) return false;
                    return true;
                });

                const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

                const grandTotals = {
                    salary: Array(12).fill(0),
                    food: Array(12).fill(0),
                    taxFreeOt: Array(12).fill(0),
                    bonus: Array(12).fill(0),
                    totalSalary: 0, totalFood: 0, totalTaxFreeOt: 0, totalBonus: 0
                };

                const yearlyData = yearlyEmps.map(emp => {
                    const empMonths = months.map((m, mIndex) => {
                        const targetMonthStr = `${selectedYear}-${m}`;
                        const record = yearlySalaries.find(r => r.employeeId === emp.id && r.month === targetMonthStr);
                        
                        const startMonthStr = emp.startDate ? emp.startDate.substring(0, 7) : '';
                        const endMonthStr = emp.endDate ? emp.endDate.substring(0, 7) : '';
                        
                        let isActive = true;
                        if (startMonthStr && targetMonthStr < startMonthStr) isActive = false;
                        if (endMonthStr && targetMonthStr > endMonthStr) isActive = false;

                        let insurance: string | number = 0;
                        if (isActive && emp.insuranceBracket) {
                            const types = [];
                            if (emp.hasLaborIns ?? true) types.push("勞");
                            if (emp.hasHealthIns ?? true) types.push("健");
                            insurance = types.length > 0 
                                ? `${emp.insuranceBracket.toLocaleString()} (${types.join("")})` 
                                : emp.insuranceBracket.toLocaleString();
                        }

                        if (!isActive || !record) {
                            return { salary: 0, food: 0, taxFreeOt: 0, bonus: 0, insurance, isActive };
                        }

                        const rowData = record;
                        const isFullTime = emp.employmentType === 'full_time';
                        
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

                        const salary = (rowData.baseSalary||0) + (rowData.fullAttendance||0) + (rowData.positionAllowance||0) + (rowData.taxableOt||0) 
                                     - (rowData.leaveDeduction ?? realLeaveDeduction) - (rowData.dailyShortage||0) - (rowData.lateDeduction ?? realLateDeduction);
                        const food = rowData.foodAllowance || 0;
                        const taxFreeOt = (rowData.taxFreeOt ?? realTaxFreeOt) || 0;
                        const bonus = rowData.performanceBonus || 0;

                        grandTotals.salary[mIndex] += salary;
                        grandTotals.food[mIndex] += food;
                        grandTotals.taxFreeOt[mIndex] += taxFreeOt;
                        grandTotals.bonus[mIndex] += bonus;

                        grandTotals.totalSalary += salary;
                        grandTotals.totalFood += food;
                        grandTotals.totalTaxFreeOt += taxFreeOt;
                        grandTotals.totalBonus += bonus;

                        return { salary, food, taxFreeOt, bonus, insurance, isActive, month: m };
                    });

                    return { emp, empMonths };
                });

                const renderVal = (val: number, isActive: boolean) => {
                    if (!isActive) return <span className="text-transparent">-</span>;
                    if (val === 0) return <span className="text-gray-300">-</span>;
                    return <span>{val.toLocaleString()}</span>;
                };

                const renderInsuranceVal = (val: number | string, isActive: boolean) => {
                    if (!isActive) return <span className="text-transparent">-</span>;
                    if (val === 0 || val === "0" || val === "") return <span className="text-gray-300">-</span>;
                    return <span className="font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200 shadow-sm whitespace-nowrap">{val}</span>;
                };

                return (
                    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                        <div className="flex-1 overflow-auto custom-scrollbar relative">
                            <table className="w-full text-left text-sm border-separate border-spacing-0 whitespace-nowrap [&_td]:border-b [&_td]:border-gray-100 [&_th]:border-b [&_th]:border-gray-200">
                                <thead className="sticky top-0 z-30 shadow-sm bg-gray-50">
                                    <tr className="text-xs font-bold text-gray-500">
                                        <th className="p-3 w-[60px] min-w-[60px] max-w-[60px] text-center sticky left-0 z-40 bg-gray-50 border-r border-gray-200">序號</th>
                                        <th className="p-3 w-[100px] min-w-[100px] max-w-[100px] text-center sticky left-[60px] z-40 bg-gray-50 border-r-2 border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">姓名</th>
                                        <th className="p-3 w-[120px] min-w-[120px] max-w-[120px] text-center sticky left-[160px] z-40 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">明細項目</th>
                                        {months.map(m => <th key={m} className="p-3 text-center w-20">{Number(m)}月</th>)}
                                        <th className="p-3 text-center w-24 text-blue-700 bg-blue-50 font-black border-l border-blue-200">年度合計</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearlyData.map(({ emp, empMonths }, index) => {
                                        const empTotalSalary = empMonths.reduce((sum, m) => sum + m.salary, 0);
                                        const empTotalFood = empMonths.reduce((sum, m) => sum + m.food, 0);
                                        const empTotalTaxFreeOt = empMonths.reduce((sum, m) => sum + m.taxFreeOt, 0);
                                        const empTotalBonus = empMonths.reduce((sum, m) => sum + m.bonus, 0);

                                        // ✨ 判斷此員工區塊是否被點擊選取
                                        const isEmpHighlighted = yearlyHighlightEmpId === emp.id;
                                        const bgBase = isEmpHighlighted ? "bg-yellow-50/60" : "bg-white group-hover:bg-blue-50/20";
                                        const stickyBg = isEmpHighlighted ? "bg-yellow-50" : "bg-white group-hover:bg-blue-50/20";

                                        // ✨ 取得特定格子 class (已移除單格反白功能)
                                        const getCellClass = (isActive: boolean) => {
                                            if (!isActive) return `p-3 text-right ${isEmpHighlighted ? 'bg-yellow-50/30' : 'bg-gray-50'}`;
                                            return `p-3 text-right font-medium text-gray-700 transition-colors ${isEmpHighlighted ? 'bg-yellow-100/50' : ''}`;
                                        };

                                        return (
                                            <React.Fragment key={emp.id}>
                                              <tr className={`${bgBase} transition-colors group`}>
                                                    {/* 序號 - 點擊反白/取消反白整區 */}
                                                    <td rowSpan={5} onClick={() => setYearlyHighlightEmpId(yearlyHighlightEmpId === emp.id ? null : emp.id)} className={`p-3 text-center font-mono text-gray-500 border-r border-gray-100 border-b-2 border-b-gray-300 sticky left-0 z-20 cursor-pointer hover:bg-yellow-100 transition-colors ${stickyBg}`}>{emp.empNo || String(index + 1).padStart(3, '0')}</td>
                                                    
                                                {/* 姓名 - 點擊開啟編輯視窗 */}
                                                    <td rowSpan={5} onClick={() => {
                                                        setEditingMonthlyEmp(emp);
                                                        setEditModalMode('yearly'); // ✨ 設定為年度模式
                                                        const firstActiveMonth = empMonths.find(m => m.isActive)?.month || '01';
                                                        setEditModalMonth(firstActiveMonth);
                                                        loadFormDataForMonth(emp, firstActiveMonth);
                                                        setIsAddingNewMonthly(false);
                                                        setIsMonthlyEditModalOpen(true);
                                                    }} className={`p-3 text-center border-r-2 border-gray-200 border-b-2 border-b-gray-300 sticky left-[60px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-pointer group/name hover:bg-blue-50 transition-colors ${stickyBg}`}>
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-black text-gray-800 group-hover/name:text-blue-600 transition-colors">{emp.name}</span>
                                                            <span className={`px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold ${emp.employmentType === 'full_time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {emp.employmentType === 'full_time' ? '正職' : '兼職'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Row 1: 薪資總額 */}
                                                    <td className={`p-3 text-center font-bold text-gray-600 border-r border-gray-100 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>薪資總額</td>
                                                    {empMonths.map((m, i) => <td key={i} className={getCellClass(m.isActive)}>{renderVal(m.salary, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalSalary > 0 ? empTotalSalary.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 2: 伙食費 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center font-bold text-gray-600 border-r border-gray-100 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>伙食費</td>
                                                    {empMonths.map((m, i) => <td key={i} className={getCellClass(m.isActive)}>{renderVal(m.food, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalFood > 0 ? empTotalFood.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 3: 免稅加班費 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center font-bold text-gray-600 border-r border-gray-100 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>免稅加班費</td>
                                                    {empMonths.map((m, i) => <td key={i} className={getCellClass(m.isActive)}>{renderVal(m.taxFreeOt, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalTaxFreeOt > 0 ? empTotalTaxFreeOt.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 4: 獎金 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center font-bold text-gray-600 border-r border-gray-100 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>獎金</td>
                                                    {empMonths.map((m, i) => <td key={i} className={getCellClass(m.isActive)}>{renderVal(m.bonus, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalBonus > 0 ? empTotalBonus.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 5: 健保投保金額 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center font-bold text-teal-700 border-r border-teal-200 border-b-2 border-b-gray-300 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-teal-100/80' : 'bg-teal-50'}`}>健保投保金額</td>
                                                    {empMonths.map((m, i) => <td key={i} className={`p-3 text-center border-b-2 border-b-gray-300 ${m.isActive ? (isEmpHighlighted ? 'bg-yellow-50/30' : '') : 'bg-gray-50'}`}>{renderInsuranceVal(m.insurance, m.isActive)}</td>)}
                                                    <td className="p-3 text-center font-black text-gray-400 bg-gray-50 border-l border-gray-200 border-b-2 border-b-gray-300">-</td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    
                                    {yearlyData.length > 0 && (
                                        <>
                                            <tr className="bg-gray-100 border-t-4 border-gray-400">
                                                <td rowSpan={4} colSpan={2} className="p-3 text-center font-black text-gray-800 text-lg sticky left-0 z-20 bg-gray-100 border-r-2 border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">年度總計</td>
                                                <td className="p-3 text-center font-black text-gray-700 bg-gray-200 border-r border-gray-300 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">薪資總額</td>
                                                {grandTotals.salary.map((val, i) => <td key={i} className="p-3 text-right font-black text-gray-800">{val > 0 ? val.toLocaleString() : '-'}</td>)}
                                                <td className="p-3 text-right font-black text-blue-800 bg-blue-200 border-l border-blue-300">{grandTotals.totalSalary.toLocaleString()}</td>
                                            </tr>
                                            <tr className="bg-gray-100">
                                                <td className="p-3 text-center font-black text-gray-700 bg-gray-200 border-r border-gray-300 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">伙食費</td>
                                                {grandTotals.food.map((val, i) => <td key={i} className="p-3 text-right font-black text-gray-800">{val > 0 ? val.toLocaleString() : '-'}</td>)}
                                                <td className="p-3 text-right font-black text-blue-800 bg-blue-200 border-l border-blue-300">{grandTotals.totalFood.toLocaleString()}</td>
                                            </tr>
                                            <tr className="bg-gray-100">
                                                <td className="p-3 text-center font-black text-gray-700 bg-gray-200 border-r border-gray-300 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">免稅加班費</td>
                                                {grandTotals.taxFreeOt.map((val, i) => <td key={i} className="p-3 text-right font-black text-gray-800">{val > 0 ? val.toLocaleString() : '-'}</td>)}
                                                <td className="p-3 text-right font-black text-blue-800 bg-blue-200 border-l border-blue-300">{grandTotals.totalTaxFreeOt.toLocaleString()}</td>
                                            </tr>
                                            <tr className="bg-gray-100">
                                                <td className="p-3 text-center font-black text-gray-700 bg-gray-200 border-r border-gray-300 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">獎金</td>
                                                {grandTotals.bonus.map((val, i) => <td key={i} className="p-3 text-right font-black text-gray-800">{val > 0 ? val.toLocaleString() : '-'}</td>)}
                                                <td className="p-3 text-right font-black text-blue-800 bg-blue-200 border-l border-blue-300">{grandTotals.totalBonus.toLocaleString()}</td>
                                            </tr>
                                        </>
                                    )}

                                    {yearlyData.length === 0 && (
                                        <tr><td colSpan={16} className="py-20 text-center text-gray-400 font-bold">該年度目前尚無任何薪資紀錄</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

          {/* 🚀 薪資編輯小視窗 (整合月份切換器) */}
                    {isMonthlyEditModalOpen && (
                        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsMonthlyEditModalOpen(false)}>
                          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>                                
                            {/* ✨ 視窗標題列 (在年度模式時移除底線，讓月份標籤無縫接軌) */}
                                <div className={`p-5 ${(!isAddingNewMonthly && editModalMode === 'yearly') ? 'pb-3 border-none' : 'border-b'} bg-gray-50 flex justify-between items-center`}>
                                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                        {isAddingNewMonthly ? '新增薪資紀錄' : `編輯薪資結算 - ${editingMonthlyEmp?.name}`}
                                        {!isAddingNewMonthly && <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-sm">{selectedYear} 年 {editModalMode === 'monthly' ? `${selectedMonth} 月` : ''}</span>}
                                        {editingMonthlyEmp && (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${editingMonthlyEmp.employmentType === 'full_time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {editingMonthlyEmp.employmentType === 'full_time' ? '正職' : '兼職'}
                                            </span>
                                        )}
                                    </h3>
                                    <button onClick={() => setIsMonthlyEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-black">✕</button>
                                </div>
                                
                                {/* ✨ 月份切換器 (移除滾動條、縮小上距、優化底色視覺) */}
                                {!isAddingNewMonthly && editModalMode === 'yearly' && (
                                    <div className="px-6 pt-0 pb-0 bg-gray-50 border-b flex gap-1 flex-wrap sm:flex-nowrap overflow-hidden shadow-sm z-10">
                                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => handleModalMonthSwitch(m)}
                                                className={`px-4 py-2.5 rounded-t-lg font-bold transition-colors border-b-2 whitespace-nowrap ${
                                                    editModalMonth === m
                                                    ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                                                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
                                                }`}
                                            >
                                                {Number(m)} 月
                                            </button>
                                        ))}
                                    </div>
                                )})}
                                
                              <form onSubmit={handleSaveMonthlyData} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                                    
                                    {isAddingNewMonthly && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                                            <label className="block text-sm font-bold text-blue-800 mb-2">請選擇要編輯的員工</label>
                                            <select 
                                                required
                                                onChange={(e) => {
                                                    const emp = employees.find(emp => emp.id === e.target.value);
                                                    if (emp) {
                                                        setEditingMonthlyEmp(emp);
                                                        setEditModalMonth(selectedMonth);
                                                        loadFormDataForMonth(emp, selectedMonth);
                                                    }
                                                }} 
                                                className="w-full border border-blue-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white"
                                            >
                                              <option value="">-- 請選擇員工 --</option>
                                                {employees.filter(e => {
                                                    if (e.clientId !== String(selectedClient?.id)) return false;
                                                    const targetMonthStr = `${selectedYear}-${selectedMonth}`;
                                                    const startMonthStr = e.startDate ? e.startDate.substring(0, 7) : '';
                                                    const endMonthStr = e.endDate ? e.endDate.substring(0, 7) : '';
                                                    if (startMonthStr && targetMonthStr < startMonthStr) return false;
                                                    if (endMonthStr && targetMonthStr > endMonthStr) return false;
                                                    return true;
                                                }).map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.empNo})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {editingMonthlyEmp && (
                                        <>
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

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-blue-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>應加與免稅金額</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">免稅加班費 (自動算)</label><input type="text" disabled value={monthlyFormData.taxFreeOt || 0} className="w-full border p-2.5 rounded-xl font-bold text-gray-500 bg-gray-100 cursor-not-allowed text-right" /></div>
                                                    
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

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-orange-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>應扣與代扣款項</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">請假扣款 (自動算)</label><input type="text" disabled value={monthlyFormData.leaveDeduction || 0} className="w-full border p-2.5 rounded-xl font-bold text-gray-500 bg-gray-100 cursor-not-allowed text-right" /></div>
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">遲到扣款 (自動算)</label><input type="text" disabled value={monthlyFormData.lateDeduction || 0} className="w-full border p-2.5 rounded-xl font-bold text-gray-500 bg-gray-100 cursor-not-allowed text-right" /></div>
                                                    
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">結帳差額扣款</label><input type="number" value={monthlyFormData.dailyShortage || ''} onChange={e => handleMonthlyFormChange('dailyShortage', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">勞退自提 (6%)</label><input type="number" value={monthlyFormData.pensionSelf || ''} onChange={e => handleMonthlyFormChange('pensionSelf', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">預支款扣回</label><input type="number" value={monthlyFormData.advancePay || ''} onChange={e => handleMonthlyFormChange('advancePay', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold text-orange-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">勞保費</label><input type="number" value={monthlyFormData.laborIns || ''} onChange={e => handleMonthlyFormChange('laborIns', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">健保費</label><input type="number" value={monthlyFormData.healthIns || ''} onChange={e => handleMonthlyFormChange('healthIns', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">所得稅扣繳</label><input type="number" value={monthlyFormData.incomeTax || ''} onChange={e => handleMonthlyFormChange('incomeTax', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" /></div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <button type="submit" id="submitMonthlyForm" className="hidden"></button>
                                </form>
                                
                                <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 mb-0.5">預估實發金額 ({selectedYear}年{editModalMonth}月)</span>
                                        <span className="text-2xl font-black text-green-600">${
                                            (((monthlyFormData.baseSalary||0) + (monthlyFormData.fullAttendance||0) + (monthlyFormData.positionAllowance||0) + (monthlyFormData.performanceBonus||0) + (monthlyFormData.taxableOt||0)) - 
                                            ((monthlyFormData.leaveDeduction||0) + (monthlyFormData.dailyShortage||0) + (monthlyFormData.lateDeduction||0) + (monthlyFormData.pensionSelf||0)) + 
                                            ((monthlyFormData.foodAllowance||0) + (monthlyFormData.taxFreeOt||0)) - 
                                            ((monthlyFormData.laborIns||0) + (monthlyFormData.healthIns||0) + (monthlyFormData.incomeTax||0) + (monthlyFormData.advancePay||0))).toLocaleString()
                                        }</span>
                                    </div>
                                  <div className="flex gap-3 w-1/2">
                                        <button onClick={() => setIsMonthlyEditModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">取消</button>
                                        <button onClick={() => document.getElementById('submitMonthlyForm')?.click()} className="flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-all bg-blue-600 hover:bg-blue-700">確認存檔</button>
                                    </div>
                                </div>
                            </div>
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

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>詳細個資 (點擊展開才可見)</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">身分證字號</label><input type="text" value={editingEmp.idNumber || ''} onChange={e => setEditingEmp({...editingEmp, idNumber: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm uppercase font-mono" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">銀行分行名稱</label><input type="text" value={editingEmp.bankBranch || ''} onChange={e => setEditingEmp({...editingEmp, bankBranch: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" placeholder="例如: 中國信託 站前分行" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">銀行戶頭代號</label><input type="text" value={editingEmp.bankAccount || ''} onChange={e => setEditingEmp({...editingEmp, bankAccount: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono" /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">戶籍地址</label><input type="text" value={editingEmp.address || ''} onChange={e => setEditingEmp({...editingEmp, address: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" /></div>
                        </div>

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

  // 🔺 第一層：薪資客戶牆 (Client Wall)
  return (
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
