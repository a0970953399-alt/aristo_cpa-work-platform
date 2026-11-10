import { isEmployeeResigned, insuranceLabel, parseEmployeeImport, sortEmployees, taiwanToday, employeeStatus, latestPeriod } from './payrollDisplay';
import { usePayrollPresentation, PayrollRow, payrollStatus } from './usePayrollPresentation';
import { groupMonthRows, includedRows, mergedValues, rowAmounts, rowPeriodText, rowStateLabel } from './payrollRows';
import { PayrollMonthTable } from './PayrollMonthTable';
import { validatePeriods, periods, slipPeriod, Slip, amountFields, attendanceFields, legacyAmounts, legacyIssues, annualMetrics, labels, calculate, emptyValues, slipHtml, totals as payrollTotals, maskIdNumber, maskBankAccount, isFullMonth } from './functions/src/payrollDomain';
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Client, PayrollClientConfig, Employee, EmploymentType, CompensationRecord, EmploymentRecord, MonthlySalaryRecord } from './types';
import { ReturnIcon, PlusIcon, TrashIcon } from './Icons';
import { TaskService } from './taskService';



const PAYROLL_TEMPLATE_BASE64 = "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";


interface PayrollViewProps {
  clients: Client[];
}

const EMPLOYEE_STATUS_STYLE = { active: 'bg-green-100 text-green-700', leaving: 'bg-amber-100 text-amber-700', upcoming: 'bg-blue-100 text-blue-700', gone: 'bg-gray-200 text-gray-500' };
const MAIL_ROW_LABELS: Record<string, string> = { PENDING: '已排程', PROCESSING: '處理中', SUCCESS: '已寄送', ERROR: '寄送失敗', UNTRACKED: '已寄送' };
const MAIL_STATE_TEXT: Record<string, string> = { NONE: '尚未寄送', CHECKING: '查詢中…', UNKNOWN: '查詢失敗，請按「查詢寄送狀態」重試', UNTRACKED: '已有寄送標記，無可查詢紀錄', PENDING: '已排程', PROCESSING: '處理中', SUCCESS: '寄送服務已完成', ERROR: '寄送失敗' };

const ExcelFileIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className || "w-6 h-6"}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
    <path d="M12 10v6"/>
    <path d="m9 13 3-3 3 3"/>
  </svg>
);

const FullscreenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
  </svg>
);

const ExitFullscreenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
  </svg>
);

const SendMailIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className || "w-6 h-6"}>
    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/>
    <rect x="2" y="4" width="20" height="16" rx="2"/>
  </svg>
);

// ✨ 時光機 Helper：依月份解析員工當時的聘僱身分
const resolveIsFullTime = (emp: Employee, year: string, month: string): boolean => {
    if (emp.employmentHistory && emp.employmentHistory.length > 0) {
        const targetDateStr = `${year}-${month}-31`;
        const targetMonthStart = `${year}-${month}-01`;
        const active = emp.employmentHistory.find(r =>
            r.startDate <= targetDateStr &&
            (r.endDate === null || r.endDate >= targetMonthStart)
        );
        if (active) return active.type === 'full_time';
    }
    return emp.employmentType === 'full_time';
};

export const PayrollView: React.FC<PayrollViewProps> = ({ clients }) => {
  const [payrollClients, setPayrollClients] = useState<PayrollClientConfig[]>([]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeInnerTab, setActiveInnerTab] = useState<'employees' | 'monthly' | 'yearly'>('employees');

  const systemToday = taiwanToday();
  const currentSystemYear = Number(systemToday.slice(0, 4));
  const currentSystemMonth = systemToday.slice(5, 7);

  const availableYears = Array.from(
      { length: Math.max(currentSystemYear - 2025 + 2, 2) },
      (_, i) => String(2025 + i)
  ).reverse();

  const [selectedYear, setSelectedYear] = useState(String(currentSystemYear));
  const [selectedMonth, setSelectedMonth] = useState(currentSystemMonth);


  const [isMonthlyEditModalOpen, setIsMonthlyEditModalOpen] = useState(false);
  const [editingMonthlyEmp, setEditingMonthlyEmp] = useState<Employee | null>(null);

  const [editModalMode, setEditModalMode] = useState<'monthly' | 'yearly'>('monthly'); // ✨ 區分是從哪個頁面打開的

  const [isFullscreen, setIsFullscreen] = useState(false); // ✨ 控制年度表格全螢幕

  const [isSendingBatch, setIsSendingBatch] = useState(false); // ✨ 控制一鍵發送的轉圈圈狀態

  // ✨ 新增：彈出視窗專用的月份狀態
  const [editModalMonth, setEditModalMonth] = useState(selectedMonth);

  // ✨ 新增：年度帳冊的反白選取狀態
  const [yearlyHighlightEmpId, setYearlyHighlightEmpId] = useState<string | null>(null);

  const payroll = usePayrollPresentation(selectedClient, selectedYear+'-'+selectedMonth);
  const employees = payroll.employees;
  const monthlyFormData: any = payroll.editing ? {...payroll.editing.amounts,...payroll.editing.attendance} : payroll.oldEditing ? {...payroll.oldEditing,...legacyAmounts(payroll.oldEditing)} : {};
  const [previewHtml,setPreviewHtml] = useState('');
  const previewSlip = (slip: Slip) => {
    const employee = payroll.employees.find(e=>e.id===slip.employeeId);
    setPreviewHtml(slipHtml(slip, employee ? slipPeriod(slip, employee) : undefined));
  };
  const [showPayrollHistory,setShowPayrollHistory] = useState(false);
  const [showRecycle,setShowRecycle] = useState(false);
  const [showVersionHistory,setShowVersionHistory] = useState(false);
  const editorSent = ['PENDING','PROCESSING','SUCCESS','UNTRACKED'].includes(payroll.mailState);
  const editorState = payroll.editing ? payroll.dirty ? '有未儲存修改' : ['void','superseded'].includes(payroll.editing.status) ? payrollStatus[payroll.editing.status] : editorSent ? '已寄' : payroll.effectiveEditing ? '待寄' : '待填' : payroll.oldEditing ? payroll.dirtyLegacy ? '有未儲存修改' : editorSent ? '已寄' : payroll.legacyEditable ? '待寄' : '待核對' : '';
  const editorStateStyle = editorState==='已寄' ? 'bg-green-100 text-green-700' : editorState==='待寄' ? 'bg-blue-100 text-blue-700' : editorState==='有未儲存修改'||editorState==='待填' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600';
  // Enter, Ctrl+Enter and the save button share this one rule.
  const canSaveMonthly = !payroll.busy && payroll.ready && !(payroll.oldEditing ? !payroll.legacyEditable || !payroll.dirtyLegacy : !payroll.canEdit || (payroll.editing && payroll.editing.revision>0 && !payroll.dirty && payroll.editing.status!=='draft'));
  const partialFood = payroll.editing && payroll.canEdit && payroll.editing.kind==='regular' && !isFullMonth(payroll.editing.month,payroll.editing.periodStart,payroll.editing.periodEnd) && payroll.editing.basis.foodAllowance>0 && payroll.editing.amounts.foodAllowance===payroll.editing.basis.foodAllowance ? payroll.editing.basis.foodAllowance : 0;
  const reviewNotes = [...payroll.editNotes, ...(payroll.openReason && payroll.editing?.revision===0 && !payroll.openReason.startsWith('本月不足月') && !payroll.openReason.startsWith('本月有待遇變動') ? [payroll.openReason] : []), ...(partialFood ? ['不足月，伙食費目前是整月金額'] : [])];
  const sendBlockReason = payroll.busy ? '處理中' : payroll.sendIssues.length ? payroll.sendIssues.join('；') : payroll.oldEditing ? payroll.legacyCorrecting||payroll.dirtyLegacy ? '請先保存修改' : !payroll.legacyEditable ? '這份舊薪資目前不能寄送' : '' : payroll.editing ? ['void','superseded'].includes(payroll.editing.status) ? '這張薪資單已失效' : payroll.editing.replacesId&&!payroll.editing.reason.trim() ? '請先填更正原因' : payroll.mailState==='CHECKING' ? '寄送狀態查詢中' : payroll.mailState==='UNKNOWN' ? '寄送狀態不明，請先查詢' : payroll.mailState==='ERROR' ? '請按「失敗重寄」' : payroll.mailState!=='NONE' ? '已排程或已寄送' : '' : '沒有可寄送的薪資單';
  const [editorMenuOpen,setEditorMenuOpen] = useState(false);
  useEffect(()=>setEditorMenuOpen(false),[payroll.editing?.id,payroll.editing?.revision,payroll.oldEditing?.id]);
  useEffect(()=>setShowVersionHistory(false),[payroll.editing?.id,payroll.editing?.revision,payroll.oldEditing?.id,payroll.oldEditing?.legacySeptemberRevision]);
  const monthlyRows = payroll.rowsFor(selectedYear+'-'+selectedMonth);
  useEffect(()=>{
    if(payroll.editing){const employee=payroll.employees.find(e=>e.id===payroll.editing!.employeeId);if(employee)setEditingMonthlyEmp({...employee,employmentType:payroll.editing.basis.employmentType});}

  },[payroll.editing,payroll.oldEditing]);
  // ✨ 專門給 Modal 讀取指定月份資料用的函數
  const loadFormDataForMonth = async (emp: Employee, month: string) => {
    const id=(emp as PayrollRow).sourceEmployeeId||emp.id;
    const rows=payroll.rowsFor(selectedYear+'-'+month).filter(row=>row.sourceEmployeeId===id);
    payroll.open((rows.find(r=>r.id===emp.id)||rows[0]||{...emp,sourceEmployeeId:id}) as PayrollRow,selectedYear+'-'+month);
  };
  const editingEmployeeId = payroll.editing?.employeeId || payroll.oldEditing?.employeeId || (editingMonthlyEmp as PayrollRow | null)?.sourceEmployeeId || editingMonthlyEmp?.id;
  const editorRows = editingEmployeeId ? (groupMonthRows(payroll.rowsFor(selectedYear+'-'+editModalMonth).filter(r=>r.sourceEmployeeId===editingEmployeeId), payroll.monthMail, selectedYear+'-'+editModalMonth, payroll.employees)[0]?.rows || []) : [];
  const editorRowIsCurrent = (r:PayrollRow) => r.id===payroll.openedRowId || (!!payroll.editing && r.slip?.id===payroll.editing.id) || (!!payroll.oldEditing && r.legacyRecord?.id===payroll.oldEditing.id);
  const fieldHint = (k:string) => payroll.editHints[k] && payroll.editing ? <small className="block mt-1 text-xs font-medium text-blue-600">{payroll.editHints[k]}</small> : null;
  const canLeaveMonthlyEditor = () => !payroll.busy && (!(payroll.hasUnsavedChanges || payroll.dirtyLegacy) || window.confirm('薪資修改尚未保存，確定放棄修改並離開？'));
  const closeMonthlyEditor = () => { if(canLeaveMonthlyEditor())setIsMonthlyEditModalOpen(false); };
  const handleModalMonthSwitch = (m:string)=>{if(!editingMonthlyEmp||m===editModalMonth||!canLeaveMonthlyEditor())return;setEditModalMonth(m);loadFormDataForMonth(editingMonthlyEmp,m);};
  const monthlyEmployeeIds = [...new Set(monthlyRows.map(r=>r.sourceEmployeeId))];
  const editingEmployeeIndex = monthlyEmployeeIds.indexOf(String(editingEmployeeId));
  const goToMonthlyEmployee = (offset:number)=>{const row=monthlyRows.find(r=>r.sourceEmployeeId===monthlyEmployeeIds[editingEmployeeIndex+offset]);if(!row||!canLeaveMonthlyEditor())return;setEditingMonthlyEmp(row);setEditModalMonth(selectedMonth);loadFormDataForMonth(row,selectedMonth);};
  const openYearlyEditor = (emp:Employee,month:string)=>{if(payroll.busy)return;setEditingMonthlyEmp(emp);setEditModalMode('yearly');setEditModalMonth(month);loadFormDataForMonth(emp,month);setIsMonthlyEditModalOpen(true);};
  const handleSaveMonthlyData = async(e:React.FormEvent)=>{e.preventDefault();if(!canSaveMonthly)return;if(payroll.oldEditing){const reason=window.prompt('請填寫這次薪資修改原因');if(reason?.trim())await payroll.saveLegacy(reason.trim());return;}await payroll.save();};
  // ✨ 新增：預覽 Email 薪資單
  const handlePreviewEmail = () => {
    if(payroll.editing){previewSlip(['NONE','ERROR'].includes(payroll.mailState)?{...payroll.editing,employee:{...payroll.editing.employee,email:payroll.recipientOf(payroll.editing)}}:payroll.editing);return;}
    if(payroll.oldEditing&&editingMonthlyEmp&&selectedClient){
      const r=payroll.oldEditing;
      if(amountFields.some(k=>typeof (r as any)[k]!=='number'||!Number.isFinite((r as any)[k]))){alert('這份舊資料缺少金額明細，請在核對與歷史紀錄查看原始欄位，不能產生完整薪資單。');return;}
      const old={id:r.id,schemaVersion:2,revision:0,employeeId:r.employeeId,month:r.month,periodStart:r.month+'-01',periodEnd:r.month+'（舊制未保存計薪區間）',status:'draft',amounts:legacyAmounts(r),attendance:Object.fromEntries(attendanceFields.map(k=>[k,(r as any)[k]||0])),employee:{name:editingMonthlyEmp.name,email:editingMonthlyEmp.email,empNo:editingMonthlyEmp.empNo,idNumber:editingMonthlyEmp.idNumber},company:{name:selectedClient.fullName||selectedClient.name,phone:selectedClient.phone||'',address:selectedClient.contactAddress||selectedClient.regAddress||''},note:'舊制保存值，確認及付款狀態未知',reason:legacyIssues(r,payroll.legacy,payroll.employees).join('；')} as Slip;
      previewSlip(old);
    }
  };
  const handleSendEmail = async()=>{if(payroll.oldEditing)await payroll.sendLegacy();else await payroll.send();};
  const handleBatchSendEmails = async()=>{setIsSendingBatch(true);try{await payroll.prepareBatch();}finally{setIsSendingBatch(false);}};
  const handleConfirmBatchSend = async()=>{setIsSendingBatch(true);try{await payroll.executeBatch();}finally{setIsSendingBatch(false);}};
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

          if(!payroll.ready){alert('薪資資料尚未載入完成');return;}
          const currentMonthEmps = groupMonthRows(includedRows(monthlyRows), payroll.monthMail, selectedYear+'-'+selectedMonth, payroll.employees);
          if (currentMonthEmps.length === 0 && !payroll.legacy.some(r=>r.month===selectedYear+'-'+selectedMonth) && !payroll.slips.some(r=>r.month===selectedYear+'-'+selectedMonth)) {
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

          currentMonthEmps.forEach((group, index) => {
              const R = 2 + index;
              const row = ws.getRow(R);
              const emp = group.rows[group.rows.length - 1];
              const rowData = mergedValues(group.rows);
              const isFullTime = resolveIsFullTime(emp, selectedYear, selectedMonth);
              const baseSalary = rowData.baseSalary || 0;
              const foodAllowance = rowData.foodAllowance || 0;
              const otPay = (rowData.taxableOt || 0) + (rowData.taxFreeOt || 0);
              const otherAdd = (rowData.fullAttendance || 0) + (rowData.positionAllowance || 0) + (rowData.performanceBonus || 0);

              const leaveDed = -(rowData.leaveDeduction || 0);
              const lateDed = -(rowData.lateDeduction || 0);
              const laborIns = -(rowData.laborIns || 0);
              const healthIns = -(rowData.healthIns || 0);
              const otherDed = -((rowData.dailyShortage || 0) + (rowData.pensionSelf || 0) + (rowData.advancePay || 0) + (rowData.incomeTax || 0));

              const netPay = payrollTotals(rowData).net;

              // ✨ 時光機：依該月找對應的勞健保設定
              let insBracket = emp.slip?.basis.insuranceBracket ?? emp.insuranceBracket ?? 0;
              let insHasLabor = emp.slip?.basis.hasLaborIns ?? emp.hasLaborIns ?? true;
              let insHasHealth = emp.slip?.basis.hasHealthIns ?? emp.hasHealthIns ?? true;
              if (emp.compensationHistory && emp.compensationHistory.length > 0) {
                  const targetDateStr = `${selectedYear}-${selectedMonth}-31`;
                  const sorted = [...emp.compensationHistory].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
                  const matched = sorted.find(r => r.effectiveDate <= targetDateStr) || sorted[sorted.length - 1];
                  insBracket = matched.insuranceBracket ?? insBracket;
                  insHasLabor = matched.hasLaborIns ?? insHasLabor;
                  insHasHealth = matched.hasHealthIns ?? insHasHealth;
              }
              let insStr = "";
              if (insBracket) {
                  const types = [];
                  if (insHasLabor) types.push("勞");
                  if (insHasHealth) types.push("健");
                  if (types.length > 0) insStr = `${insBracket.toLocaleString()} (${types.join("")})`;
              }

          const remarks = [];
          for (const part of group.rows) {
              const noteDate = (date: string, word: string) => { if (date && date.substring(0, 7) === `${selectedYear}-${selectedMonth}`) { const note = `${parseInt(date.substring(5, 7), 10)}/${parseInt(date.substring(8, 10), 10)}${word}`; if (!remarks.includes(note)) remarks.push(note); } };
              noteDate(part.startDate, '到職');
              noteDate(part.endDate || '', '離職');
          }
          if (rowData.lateHours > 0) remarks.push(`遲到${rowData.lateHours}分鐘`);
          if (rowData.sickLeave > 0) remarks.push(`病假${rowData.sickLeave}小時`);
          if (rowData.personalLeave > 0) remarks.push(`事假${rowData.personalLeave}小時`);
          if (!isFullTime) {
              if (rowData.workHours > 0) remarks.push(`日常排班工時${rowData.workHours}小時`);
              if (rowData.normalOt > 0) remarks.push(`日常加班${rowData.normalOt}小時`);
          } else {
              if (rowData.normalOt > 0) remarks.push(`日常加班${rowData.normalOt}小時`);
          }
          if (rowData.holidayOt > 0) remarks.push(`國定假日出勤${rowData.holidayOt}小時`);

          const remarkStr = remarks.length > 0 ? remarks.join("，") + "。" : "";

              totals.base += baseSalary; totals.food += foodAllowance; totals.ot += otPay; totals.otherAdd += otherAdd;
              totals.leave += leaveDed; totals.late += lateDed; totals.labor += laborIns; totals.health += healthIns;
              totals.otherDed += otherDed; totals.net += netPay;

              row.getCell(1).value = monthStr;
              row.getCell(2).value = emp.empNo || "";
              row.getCell(3).value = emp.name || "";
              row.getCell(4).value = insStr;
              row.getCell(5).value = emp.slip ? emp.slip.employee.idNumber || "" : emp.idNumber || "";
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
              row.getCell(18).value = [remarkStr,emp.slip ? emp.slip.revision===0 ? '固定薪資自動帶入；尚未保存或寄送，變動加扣項需另行填寫' : emp.slip.periodStart+'～'+emp.slip.periodEnd+'／'+emp.slip.id+'／v'+emp.slip.revision : '舊制保存值，狀態未知'].join('；');
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

          const rawSheet=workbook.addWorksheet('舊紀錄核對');
          rawSheet.addRow(['文件','員工','月份','核對說明',...amountFields.map(k=>labels[k])]);
          payroll.legacy.filter(r=>r.month===selectedYear+'-'+selectedMonth).forEach(r=>rawSheet.addRow([r.id,r.employeeId,r.month,legacyIssues(r,payroll.legacy,payroll.employees).join('；')||'舊制保存值，狀態未知',...amountFields.map(k=>(r as any)[k]??'缺少')]));
          const slipsSheet=workbook.addWorksheet('逐單狀態');slipsSheet.addRow(['單號','員工','計薪起日','計薪迄日','狀態','版本',...amountFields.map(k=>labels[k])]);
          const auditSlips=[...payroll.slips.filter(r=>r.month===selectedYear+'-'+selectedMonth),...monthlyRows.filter(r=>r.slip?.revision===0).map(r=>r.slip!)];
          auditSlips.forEach(r=>slipsSheet.addRow([r.id,r.employee.name,r.periodStart,r.periodEnd,r.revision===0?'固定薪資自動帶入（未保存／未寄送）':r.status==='draft'&&monthlyRows.some(row=>row.slip?.id===r.id&&!row.excluded)?'已保存（既有草稿）':payrollStatus[r.status],r.revision,...amountFields.map(k=>r.amounts[k])]));
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          saveAs(blob, `${selectedClient.name}_薪資總表_${selectedYear}${selectedMonth}.xlsx`);

      } catch (error: any) {
          console.error("匯出失敗詳細錯誤：", error);
          alert(`匯出失敗，請稍後再試。\n\n${error.message}`);
      }
  };

  const handleRowClickMonthly = (emp: Employee) => {
      if(payroll.busy)return;
      setEditingMonthlyEmp(emp);
      setEditModalMonth(selectedMonth);
      setEditModalMode('monthly'); // ✨ 設定為每月模式
      loadFormDataForMonth(emp, selectedMonth);
      setIsMonthlyEditModalOpen(true);
  };

  const handleMonthlyFormChange = (field:string,value:string)=>{if(payroll.oldEditing)payroll.changeLegacy(field,value);else payroll.change(field,value);};

  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [newClientSelectId, setNewClientSelectId] = useState('');
  const [clientsToDelete, setClientsToDelete] = useState<string[]>([]);
  const [clientActionBusy, setClientActionBusy] = useState(false);
  const [clientActionError, setClientActionError] = useState('');

  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Partial<Employee> | null>(null);
  const [editingEmpEmployHistory, setEditingEmpEmployHistory] = useState<EmploymentRecord[]>([]);
  const [editingEmpCompHistory, setEditingEmpCompHistory] = useState<CompensationRecord[]>([]);
  const employeeSaveLock = useRef(false);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [employeeOriginal, setEmployeeOriginal] = useState<Employee | null>(null);
  const employeeSnapshot = useRef('');
  const [employeeVersions, setEmployeeVersions] = useState<Array<{changes:Array<{label:string;from:string;to:string}>;actorName:string;changedAt:string}>|null>(null);
  const [employeeVersionsError, setEmployeeVersionsError] = useState('');
  const employeeFormState = () => JSON.stringify([editingEmp, editingEmpEmployHistory, editingEmpCompHistory]);
  useEffect(() => { if (isEmpModalOpen) { employeeSnapshot.current = employeeFormState(); setEmployeeVersions(null); setEmployeeVersionsError(''); } }, [isEmpModalOpen]);
  const closeEmployeeEditor = () => {
    if (employeeSaving) return;
    if (employeeFormState() !== employeeSnapshot.current && !window.confirm('員工資料尚未保存，確定放棄修改並離開？')) return;
    setIsEmpModalOpen(false);
  };

  const empFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportEmpExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        let parsed;
        try {
          const wb = XLSX.read(evt.target?.result, { type: 'binary', cellDates: true });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
          parsed = parseEmployeeImport(rows, employees, String(selectedClient.id), () => crypto.randomUUID());
        } catch {
          alert('檔案讀取失敗，請確認是否為標準的 Excel 檔案。');
          return;
        }
        const summary = [`可匯入 ${parsed.ready.length} 筆，重複略過 ${parsed.duplicates.length} 筆，有錯誤 ${parsed.errors.length} 筆。`, ...parsed.duplicates.map(d => '重複：' + d), ...parsed.errors.map(d => '錯誤：' + d)].join('\n');
        if (!parsed.ready.length) { alert(summary + '\n沒有可匯入的員工資料。'); return; }
        if (!window.confirm(summary + '\n確定匯入可匯入的資料嗎？')) return;
        const failures: string[] = [];
        for (const emp of parsed.ready) {
          try { await TaskService.addEmployee(emp); }
          catch (error: any) { failures.push(emp.name + '：' + (error.message || '保存失敗')); }
        }
        const saved = parsed.ready.length - failures.length;
        alert([`成功匯入 ${saved} 筆員工資料。`, ...(failures.length ? ['以下未匯入：', ...failures] : []), ...(saved ? ['匯入不含待遇資料，請到員工的待遇歷程補上後才能開薪資單。'] : [])].join('\n'));
      } finally {
        if (empFileInputRef.current) empFileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    const handleSyncError = (error: Error) => console.error('Payroll real-time sync failed:', error);
    const unsubscribe = [
      TaskService.subscribePayrollClients(setPayrollClients, handleSyncError),
    ];
    return () => unsubscribe.forEach(stopListening => stopListening());
  }, []);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: close open modals
      if (e.key === 'Escape') {
        if (previewHtml) { setPreviewHtml(''); return; }
        if (payroll.batchReview) { payroll.setBatchReview(null); return; }
        if (showPayrollHistory) { setShowPayrollHistory(false); return; }
        if (showRecycle) { setShowRecycle(false); return; }
        if (isMonthlyEditModalOpen) { e.preventDefault(); closeMonthlyEditor(); return; }
        if (isEmpModalOpen) { closeEmployeeEditor(); return; }
        if (isFullscreen) { setIsFullscreen(false); return; }
        return;
      }
      // Ctrl+Enter: submit currently open form
      if (e.ctrlKey && e.key === 'Enter') {
        if (isMonthlyEditModalOpen) {
          e.preventDefault();
          document.getElementById('submitMonthlyForm')?.click();
          return;
        }
        if (isEmpModalOpen) {
          e.preventDefault();
          document.getElementById('submitEmpForm')?.click();
          return;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMonthlyEditModalOpen, isEmpModalOpen, payroll.busy, payroll.hasUnsavedChanges, payroll.dirtyLegacy, editingEmp, editingEmpEmployHistory, editingEmpCompHistory, employeeSaving, previewHtml, payroll.batchReview, showPayrollHistory, showRecycle, isFullscreen]);

  const handleOpenAddEmp = () => {
    setEmployeeOriginal(null);
    setEmployeeError('');
    setEditingEmp({
        id: crypto.randomUUID(), createdAt:new Date().toISOString(),
        employmentType: 'full_time', email: '', defaultBaseSalary: 0, defaultFoodAllowance: 0
    });
    setEditingEmpEmployHistory([{ id: crypto.randomUUID(), type: 'full_time', startDate: '', endDate: null }]);
    setEditingEmpCompHistory([]);
    setIsEmpModalOpen(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editingEmp) return;

    if (employeeSaveLock.current) return;
    employeeSaveLock.current = true; setEmployeeSaving(true); setEmployeeError('');
    try {
    if (editingEmpEmployHistory.some(p => !p.startDate)) throw new Error('請填寫到職日');
    if (editingEmpCompHistory.some(c => !c.effectiveDate)) throw new Error('請填寫待遇生效日期');
    if (new Set(editingEmpCompHistory.map(c => c.effectiveDate)).size !== editingEmpCompHistory.length) throw new Error('待遇生效日期不能重複');
    for (const p of editingEmpEmployHistory) { const over = payroll.slips.filter(s => s.employeeId === editingEmp.id && s.employmentId === p.id && s.status !== 'void' && p.endDate && s.periodEnd > p.endDate)[0]; if (over) throw new Error(`已有 ${over.periodStart.slice(5).replace('-', '/')}–${over.periodEnd.slice(5).replace('-', '/')} 的薪資單超過離職日，請先作廢該單`); }
    validatePeriods(editingEmpEmployHistory.length ? editingEmpEmployHistory : periods({...editingEmp, id:editingEmp.id || 'new'}));
    const uncovered = editingEmpEmployHistory.filter(p => !editingEmpCompHistory.some(c => c.effectiveDate <= p.startDate));
    if (uncovered.length && !window.confirm(`到職日 ${uncovered.map(p => p.startDate).join('、')} 尚無對應的待遇紀錄，補上前不能開該期薪資單。確定先存檔嗎？`)) return;
    // 從任職歷程推導向下相容欄位
    const sortedEmploy = [...editingEmpEmployHistory].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const latestEmploy = sortedEmploy[0];
    const earliestEmploy = [...editingEmpEmployHistory].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const derivedType: EmploymentType = (latestEmploy?.type ?? editingEmp.employmentType ?? 'full_time') as EmploymentType;
    const derivedStart = earliestEmploy?.startDate || editingEmp.startDate || '';
    const derivedEnd = latestEmploy ? (latestEmploy.endDate ?? '') : (editingEmp.endDate || '');

    // 從待遇歷程推導 defaultBaseSalary
    const savedComp = editingEmpCompHistory.map(({ forPeriodId, ...c }: any) => c);
    const sortedComp = [...savedComp].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    const derivedBase = sortedComp[0]?.baseSalary ?? Number(editingEmp.defaultBaseSalary ?? 0);

    const empData: Employee = {
        id: editingEmp.id || Date.now().toString(),
        clientId: String(selectedClient.id),
        empNo: editingEmp.empNo || '',
        employmentType: derivedType,
        name: editingEmp.name || '',
        email: editingEmp.email || '',
        startDate: derivedStart,
        endDate: typeof derivedEnd === 'string' ? derivedEnd : (derivedEnd ?? ''),
        idNumber: editingEmp.idNumber || '',
        bankBranch: editingEmp.bankBranch || '',
        bankAccount: editingEmp.bankAccount || '',
        address: editingEmp.address || '',
        defaultBaseSalary: derivedBase,
        defaultFoodAllowance: Number(sortedComp[0]?.foodAllowance ?? editingEmp.defaultFoodAllowance ?? 0) || 0,
        insuranceBracket: sortedComp[0]?.insuranceBracket ?? Number(editingEmp.insuranceBracket ?? 0),
        hasLaborIns: sortedComp[0]?.hasLaborIns ?? editingEmp.hasLaborIns ?? true,
        hasHealthIns: sortedComp[0]?.hasHealthIns ?? editingEmp.hasHealthIns ?? true,
        createdAt: editingEmp.createdAt || new Date().toISOString(),
        employmentHistory: editingEmpEmployHistory,
        compensationHistory: savedComp,
    };

    if (employeeOriginal) {
        await TaskService.updateEmployee(empData, employeeOriginal || undefined);
    } else {
        await TaskService.addEmployee(empData);
    }
    setIsEmpModalOpen(false);
    } catch (error: any) { setEmployeeError(error.message || '保存失敗'); }
    finally { employeeSaveLock.current = false; setEmployeeSaving(false); }
  };

  const enabledClientIds = payrollClients.map(pc => pc.clientId);
  const availableClientsToAdd = clients.filter(c => !enabledClientIds.includes(String(c.id)));
  const displayClients = clients.filter(c => enabledClientIds.includes(String(c.id)));

  const handleAddClient = async () => {
    if (!newClientSelectId || clientActionBusy) return;
    setClientActionBusy(true); setClientActionError('');
    try {
      const newConfig: PayrollClientConfig = { id: Date.now().toString(), clientId: newClientSelectId, createdAt: new Date().toISOString() };
      await TaskService.addPayrollClient(newConfig);
      setIsAddClientModalOpen(false);
      setNewClientSelectId('');
    } catch (error: any) {
      setClientActionError('開通失敗：' + (error.message || '請稍後再試'));
    } finally { setClientActionBusy(false); }
  };

  const handleConfirmDeleteClients = async () => {
    if (clientActionBusy) return;
    setClientActionBusy(true); setClientActionError('');
    const failed: string[] = [], reasons: string[] = [];
    for (const clientId of clientsToDelete) {
      try { await TaskService.deletePayrollClient(clientId); }
      catch (error: any) { failed.push(clientId); reasons.push((clients.find(c => String(c.id) === clientId)?.name || clientId) + '：' + (error.message || '移除失敗')); }
    }
    setClientActionBusy(false);
    setClientsToDelete(failed);
    if (failed.length) { setClientActionError('以下客戶未移除，其餘已完成。\n' + reasons.join('\n')); return; }
    setIsDeleteClientModalOpen(false);
  };


  if (selectedClient) {
    // ✨ Feature 1: 員工排序邏輯 (正職優先，再來依編號，離職墊底)
    const currentEmps = sortEmployees(employees.filter(e => e.clientId === String(selectedClient.id)));

    const buildYearlyData = () => {
        const yearlyEmps = payroll.ready ? sortEmployees(payroll.employees.filter(e=>periods(e).some(p=>p.startDate<=selectedYear+'-12-31'&&(!p.endDate||p.endDate>=selectedYear+'-01-01'))||payroll.slips.some(s=>s.employeeId===e.id&&s.month.startsWith(selectedYear+'-'))||payroll.legacy.some(r=>r.employeeId===e.id&&r.month.startsWith(selectedYear+'-')))) : [];
        const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
        const grandTotals={salary:Array(12).fill(0),food:Array(12).fill(0),taxFreeOt:Array(12).fill(0),bonus:Array(12).fill(0),totalSalary:0,totalFood:0,totalTaxFreeOt:0,totalBonus:0};
        const yearlyData=yearlyEmps.map(emp=>({emp,empMonths:months.map((m,i)=>{
          const target=selectedYear+'-'+m;
          const included=includedRows(payroll.rowsFor(target)).filter(r=>r.sourceEmployeeId===emp.id);
          const ss=included.filter(r=>r.slip).map(r=>r.slip!);
          const values=included.map(rowAmounts).map(annualMetrics);
          const salary=values.reduce((n,v)=>n+v['薪資總額'],0),food=values.reduce((n,v)=>n+v['伙食費'],0),taxFreeOt=values.reduce((n,v)=>n+v['免稅加班費'],0),bonus=values.reduce((n,v)=>n+v['獎金'],0);
          const isActive=periods(emp).some(p=>p.startDate<=target+'-31'&&(!p.endDate||p.endDate>=target+'-01'))||included.length>0;
          const comp=[...(emp.compensationHistory||[])].sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate)).find(c=>c.effectiveDate<=target+'-31');
          const insurance=ss.length ? ss.map(s=>s.periodStart.slice(5)+'～'+s.periodEnd.slice(5)+'：'+insuranceLabel(s.basis)).join('；') : isActive&&comp?.insuranceBracket ? insuranceLabel(comp) : 0;
          grandTotals.salary[i]+=salary;grandTotals.food[i]+=food;grandTotals.taxFreeOt[i]+=taxFreeOt;grandTotals.bonus[i]+=bonus;
          grandTotals.totalSalary+=salary;grandTotals.totalFood+=food;grandTotals.totalTaxFreeOt+=taxFreeOt;grandTotals.totalBonus+=bonus;
          return {salary,food,taxFreeOt,bonus,insurance,isActive,month:m,automatic:ss.some(s=>s.revision===0)};
        })}));
        return {months,grandTotals,yearlyData};
    };

    const handleExportYearlyExcel = () => {
        try {
            const {months,grandTotals,yearlyData} = buildYearlyData();
            const items = [['薪資總額','salary'],['伙食費','food'],['免稅加班費','taxFreeOt'],['獎金','bonus']] as const;
            const sheetRows: any[][] = [['序號','姓名','身分','明細項目',...months.map(m=>Number(m)+'月'),'年度合計','備註']];
            yearlyData.forEach(({emp,empMonths},index) => {
                const lead = [emp.empNo || String(index + 1).padStart(3, '0'), emp.name, emp.employmentType === 'full_time' ? '正職' : '兼職'];
                const automatic = empMonths.filter(m=>m.automatic).map(m=>Number(m.month)+'月');
                items.forEach(([label,key],n) => sheetRows.push([...lead,label,...empMonths.map(m=>m[key]||''),empMonths.reduce((sum,m)=>sum+m[key],0),n===0&&automatic.length?automatic.join('、')+'為自動帶入，尚未保存或寄送':'']));
                sheetRows.push([...lead,'勞健保投保金額',...empMonths.map(m=>m.isActive&&m.insurance?m.insurance:''),'','']);
            });
            items.forEach(([label,key]) => sheetRows.push(['','年度總計','',label,...grandTotals[key].map((v:number)=>v||''),grandTotals[key].reduce((sum:number,v:number)=>sum+v,0),'']));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheetRows), '年度薪資帳冊');
            const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
            saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${selectedClient.name}_年度薪資帳冊_${selectedYear}.xlsx`);
        } catch (error: any) {
            alert(`匯出失敗，請稍後再試。\n\n${error.message}`);
        }
    };

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
                  <button onClick={() => setActiveInnerTab('employees')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'employees' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>員工名單</button>
                  <button onClick={() => setActiveInnerTab('monthly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>每月薪資明細</button>
                  <button onClick={() => setActiveInnerTab('yearly')} className={`px-4 py-2 text-sm font-black rounded-lg transition-colors ${activeInnerTab === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>年度薪資帳冊</button>
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
                          {/* ✨ 新增：一鍵寄送按鈕 */}
                          <button
                              onClick={handleBatchSendEmails}
                              disabled={isSendingBatch || payroll.busy || !payroll.ready}
                              title="核對並寄送本月薪資單"
                              className={`p-2.5 font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center ${
                                  isSendingBatch ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                          >
                              {isSendingBatch ? (
                                  <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                  <SendMailIcon className="w-5 h-5" />
                              )}
                          </button>

                          {/* 匯出 Excel 按鈕 */}
                          <button disabled={!payroll.ready || payroll.busy} onClick={handleExportEmployerExcel} title="匯出薪資總表" className="p-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
                          </button>
                      </div>
                  )}

                {/* ✨ 新增：年度薪資帳冊專屬的「全螢幕放大」按鈕 */}
                  {activeInnerTab === 'yearly' && (
                      <div className="flex items-center gap-2 animate-fade-in">
                          <button disabled={!payroll.ready} onClick={handleExportYearlyExcel} title="匯出年度帳冊" className="p-2.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
                          </button>
                          <button title="全螢幕" onClick={() => setIsFullscreen(true)} className="p-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 flex items-center justify-center transition-colors">
                              <FullscreenIcon className="w-5 h-5" />
                          </button>
                      </div>
                  )}
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
            {activeInnerTab !== 'employees' && !payroll.ready && <p role="status" className="text-sm text-gray-500 mb-2">薪資資料尚未完整載入，暫不顯示合計或允許開單。</p>}
            {payroll.error && <p role="alert" className="text-sm text-red-600 mb-2">{payroll.error}</p>}
            {activeInnerTab === 'monthly' && payroll.batchNotice && <div role="status" className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex justify-between gap-4"><div><p className="font-bold">{payroll.batchNotice.text}</p>{payroll.batchNotice.failures.length>0&&<><p className="mt-1 font-bold text-amber-700">以下 {payroll.batchNotice.failures.length} 位未寄送：</p>{payroll.batchNotice.failures.map(f=><p key={f} className="text-amber-700">{f}</p>)}</>}</div><button type="button" aria-label="關閉通知" onClick={()=>payroll.setBatchNotice(null)} className="shrink-0 font-bold text-gray-500 hover:text-gray-700">關閉</button></div>}
            <div className="fixed bottom-3 right-5 z-40 flex gap-2">{activeInnerTab==='monthly'&&<button type="button" onClick={()=>payroll.refreshMonthMail()} className="text-xs font-bold text-gray-500 hover:text-blue-600 bg-white/90 px-2 py-1 rounded-lg border border-gray-200">重新整理寄送狀態</button>}{activeInnerTab !== 'employees' && <button type="button" onClick={()=>setShowPayrollHistory(true)} className="text-xs font-bold text-gray-500 hover:text-blue-600 bg-white/90 px-2 py-1 rounded-lg border border-gray-200">核對與歷史紀錄</button>}{payroll.ready && <button type="button" onClick={()=>setShowRecycle(true)} className="text-xs font-bold text-gray-500 hover:text-blue-600 bg-white/90 px-2 py-1 rounded-lg border border-gray-200">資源回收桶（{payroll.recycle.length}）</button>}</div>

            {/* 📍 標籤一：員工名單 */}
            {activeInnerTab === 'employees' && (
                <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                                <tr>
                                  <th className="p-3 font-bold text-gray-500 w-16 text-center">序號</th>
                                    <th className="p-3 font-bold text-gray-500 w-20 text-center">身分</th>
                                    <th className="p-3 font-bold text-gray-500 w-32">姓名</th>
                                    <th className="p-3 font-bold text-gray-500 w-24">狀態</th>
                                    <th className="p-3 font-bold text-gray-500 w-52">任職期間</th>
                                    <th className="p-3 font-bold text-gray-500 w-48">電子郵件</th>
                                    <th className="p-3 font-bold text-gray-500 w-32 font-mono">身分證字號</th>
                                    <th className="p-3 font-bold text-gray-500 w-40">銀行分行</th>
                                    <th className="p-3 font-bold text-gray-500 w-40 font-mono">帳戶代號</th>
                                    <th className="p-3 font-bold text-gray-500">戶籍地址</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentEmps.map((emp, index) => {
                                    const isResigned = isEmployeeResigned(emp);
                                    const status = employeeStatus(emp), latest = latestPeriod(emp);
                                    return (
                                        <tr
                                            key={emp.id}
                                            onClick={() => {
                                                setEditingEmp(emp);
                                                setEmployeeOriginal(emp); setEmployeeError('');
                                                // 任職歷程無痛升級
                                                if (emp.employmentHistory && emp.employmentHistory.length > 0) {
                                                    setEditingEmpEmployHistory(emp.employmentHistory);
                                                } else {
                                                    setEditingEmpEmployHistory([{
                                                        id: 'legacy-' + emp.id,
                                                        type: emp.employmentType || 'full_time',
                                                        startDate: emp.startDate || taiwanToday(),
                                                        endDate: emp.endDate || null
                                                    }]);
                                                }
                                                // 待遇歷程無痛升級
                                                if (emp.compensationHistory && emp.compensationHistory.length > 0) {
                                                    setEditingEmpCompHistory(emp.compensationHistory);
                                                } else {
                                                    setEditingEmpCompHistory([]);
                                                }
                                                setIsEmpModalOpen(true);
                                            }}
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
                                            <td className="p-3"><span data-testid="employee-status" className={`px-2 py-0.5 rounded-md text-xs font-bold ${EMPLOYEE_STATUS_STYLE[status.tone]}`}>{status.label}</span></td>
                                            <td data-testid="employee-period" className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{latest.startDate.replaceAll('-', '/')} – {latest.endDate ? latest.endDate.replaceAll('-', '/') : '在職'}</td>
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-500'}`}>{emp.email || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{maskIdNumber(emp.idNumber) || '-'}</td>
                                            <td className={`p-3 text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{emp.bankBranch || '-'}</td>
                                            <td className={`p-3 font-mono text-sm ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>{maskBankAccount(emp.bankAccount) || '-'}</td>

                                            <td className={`p-3 text-sm whitespace-normal ${isResigned ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {emp.address || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {currentEmps.length === 0 && (
                                    <tr><td colSpan={10} className="py-20 text-center text-gray-400 font-bold">{payroll.ready ? '目前尚無員工資料，請點擊右上角新增' : '員工資料載入中…'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 📍 標籤二：每月薪資明細 */}
            {activeInnerTab === 'monthly' && <PayrollMonthTable rows={monthlyRows} month={selectedYear+'-'+selectedMonth} employees={payroll.employees} mail={payroll.monthMail} ready={payroll.ready} isFullTime={r=>resolveIsFullTime(r,selectedYear,selectedMonth)} onOpen={handleRowClickMonthly}/>}

            {/* 📍 標籤三：年度薪資帳冊 (唯讀匯總版 + 互動式編輯) */}
            {activeInnerTab === 'yearly' && (() => {
                const {months,grandTotals,yearlyData} = buildYearlyData();

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
                    <div className={isFullscreen
                        ? "fixed inset-0 z-[120] bg-gray-100 p-4 sm:p-6 flex flex-col animate-fade-in"
                        : "flex flex-col h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in"
                    }>

                        {/* ✨ 全螢幕模式專屬的上方標題列與縮小按鈕 */}
                        {isFullscreen && (
                            <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 shrink-0">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                    📖 {selectedClient.name} - {selectedYear}年度薪資帳冊
                                </h2>
                                <button title="離開全螢幕" onClick={() => setIsFullscreen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                    <ExitFullscreenIcon className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>
                        )}

                        <div className={`flex-1 overflow-auto custom-scrollbar relative ${isFullscreen ? 'bg-white rounded-2xl shadow-lg border border-gray-200' : ''}`}>
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
                                            return `p-3 text-right font-medium text-gray-700 transition-colors cursor-pointer hover:bg-blue-50 ${isEmpHighlighted ? 'bg-yellow-100/50' : ''}`;
                                        };

                                        return (
                                            <React.Fragment key={emp.id}>
                                              <tr className={`${bgBase} transition-colors group`}>
                                                    {/* 序號 - 點擊反白/取消反白整區 */}
                                                    <td rowSpan={5} onClick={() => setYearlyHighlightEmpId(yearlyHighlightEmpId === emp.id ? null : emp.id)} className={`p-3 text-center font-mono text-gray-500 border-r border-gray-100 border-b-2 border-b-gray-300 sticky left-0 z-20 cursor-pointer hover:bg-yellow-100 transition-colors ${stickyBg}`}>{emp.empNo || String(index + 1).padStart(3, '0')}</td>

                                                {/* 姓名 - 點擊開啟編輯視窗 */}
                                                    <td rowSpan={5} onClick={() => {
                                                        const thisMonth = selectedYear === String(currentSystemYear) ? empMonths.find(m => m.month === currentSystemMonth && m.isActive) : undefined;
                                                        openYearlyEditor(emp, (thisMonth || empMonths.find(m => m.isActive))?.month || '01');
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
                                                    {empMonths.map((m, i) => <td key={i} title={m.automatic?'固定薪資自動帶入，尚未保存或寄送；變動加扣項另行填寫':undefined} className={getCellClass(m.isActive)} onClick={()=>{if(m.isActive)openYearlyEditor(emp,m.month);}}>{renderVal(m.salary, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalSalary > 0 ? empTotalSalary.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 2: 伙食費 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center font-bold text-gray-600 border-r border-gray-100 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>伙食費</td>
                                                    {empMonths.map((m, i) => <td key={i} title={m.automatic?'固定薪資自動帶入，尚未保存或寄送；變動加扣項另行填寫':undefined} className={getCellClass(m.isActive)} onClick={()=>{if(m.isActive)openYearlyEditor(emp,m.month);}}>{renderVal(m.food, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalFood > 0 ? empTotalFood.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 3: 免稅加班費 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center font-bold text-gray-600 border-r border-gray-100 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>免稅加班費</td>
                                                    {empMonths.map((m, i) => <td key={i} title={m.automatic?'固定薪資自動帶入，尚未保存或寄送；變動加扣項另行填寫':undefined} className={getCellClass(m.isActive)} onClick={()=>{if(m.isActive)openYearlyEditor(emp,m.month);}}>{renderVal(m.taxFreeOt, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalTaxFreeOt > 0 ? empTotalTaxFreeOt.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 4: 獎金 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center font-bold text-gray-600 border-r border-gray-100 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>獎金</td>
                                                    {empMonths.map((m, i) => <td key={i} title={m.automatic?'固定薪資自動帶入，尚未保存或寄送；變動加扣項另行填寫':undefined} className={getCellClass(m.isActive)} onClick={()=>{if(m.isActive)openYearlyEditor(emp,m.month);}}>{renderVal(m.bonus, m.isActive)}</td>)}
                                                    <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50 border-l border-blue-100">{empTotalBonus > 0 ? empTotalBonus.toLocaleString() : '-'}</td>
                                                </tr>
                                                {/* Row 5: 健保投保金額 */}
                                                <tr className={`${bgBase} transition-colors group`}>
                                                    <td className={`p-3 text-center text-xs font-bold text-teal-700 border-r border-teal-200 border-b-2 border-b-gray-300 sticky left-[160px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${isEmpHighlighted ? 'bg-teal-100/80' : 'bg-teal-50'}`}>勞健保投保金額</td>
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
                        <div className="fixed inset-0 bg-black/60 z-[125] flex items-center justify-center p-4 animate-fade-in" onClick={closeMonthlyEditor}>
                          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                            {/* ✨ 視窗標題列 (在年度模式時移除底線，讓月份標籤無縫接軌) */}
                                <div className={`p-5 ${editModalMode === 'yearly' ? 'pb-3 border-none' : 'border-b'} bg-gray-50 flex justify-between items-center`}>
                                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                        {`編輯薪資結算 - ${editingMonthlyEmp?.name}`}
                                        <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-sm">{selectedYear} 年 {Number(editModalMonth)} 月</span>
                                        {editingMonthlyEmp && (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${editingMonthlyEmp.employmentType === 'full_time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {editingMonthlyEmp.employmentType === 'full_time' ? '正職' : '兼職'}
                                            </span>
                                        )}
                                        {editorState && <span data-testid="payroll-editor-state" className={`px-2 py-0.5 rounded-md text-xs font-bold ${editorStateStyle}`}>{editorState}</span>}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {editModalMode === 'monthly' && editingEmployeeIndex >= 0 && <>
                                            <button type="button" disabled={payroll.busy || editingEmployeeIndex===0} onClick={()=>goToMonthlyEmployee(-1)} className="px-3 py-1.5 text-sm font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">上一位</button>
                                            <button type="button" disabled={payroll.busy || editingEmployeeIndex===monthlyEmployeeIds.length-1} onClick={()=>goToMonthlyEmployee(1)} className="px-3 py-1.5 text-sm font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">下一位</button>
                                        </>}
                                        <button onClick={closeMonthlyEditor} className="ml-2 text-gray-400 hover:text-gray-600 text-2xl font-black">✕</button>
                                    </div>
                                </div>

                                {/* ✨ 月份切換器 (移除滾動條、縮小上距、優化底色視覺) */}
                                {editModalMode === 'yearly' && (
                                    <div className="px-6 pt-0 pb-0 bg-gray-50 border-b flex gap-1 flex-wrap sm:flex-nowrap overflow-hidden shadow-sm z-10">
                                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                disabled={payroll.busy}
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
                                )}

                              {editorRows.length>1 && <div className="px-6 pt-3 flex flex-wrap gap-2 shrink-0">{editorRows.map(r=><button key={r.id} type="button" data-testid="slip-tab" aria-pressed={editorRowIsCurrent(r)} disabled={payroll.busy} onClick={()=>{if(!editorRowIsCurrent(r)&&canLeaveMonthlyEditor())payroll.open(r,selectedYear+'-'+editModalMonth);}} className={`px-3 py-1 rounded-lg border text-sm font-bold ${editorRowIsCurrent(r) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{rowPeriodText(r,selectedYear+'-'+editModalMonth)}　{rowStateLabel(r,payroll.monthMail)}</button>)}</div>}
                              {payroll.editing && <div data-testid="payroll-facts" className="px-6 py-2 border-b text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 shrink-0"><span className="font-bold text-gray-800">{payroll.editing.periodStart.slice(5).replace('-','/')} – {payroll.editing.periodEnd.slice(5).replace('-','/')}<span className="font-normal text-gray-500">（{isFullMonth(payroll.editing.month,payroll.editing.periodStart,payroll.editing.periodEnd)?'整月':(Math.round((Date.parse(payroll.editing.periodEnd)-Date.parse(payroll.editing.periodStart))/86400000)+1)+' 天'}）</span></span><span>{payroll.editing.basis.employmentType==='full_time'?'約定月薪':'時薪'} <b className="text-gray-800">{payroll.editing.basis.baseSalary.toLocaleString()}</b></span>{payroll.editing.basis.employmentType==='full_time'&&<span>約定伙食費 <b className="text-gray-800">{payroll.editing.basis.foodAllowance.toLocaleString()}</b></span>}{payroll.editing.revision===0&&payroll.effectiveEditing&&<span>已自動帶入，尚未保存</span>}{payroll.hasOtherPay&&payroll.canEdit&&<span>本月另一張單：{payroll.slips.filter(s=>s.id!==payroll.editing!.id&&s.employeeId===payroll.editing!.employeeId&&s.month===payroll.editing!.month&&s.status==='confirmed').map(s=>'勞保 '+s.amounts.laborIns+'、健保 '+s.amounts.healthIns).join('；')}</span>}</div>}
                              {payroll.oldEditing && <div className="px-6 py-2 border-b text-sm text-gray-500 shrink-0">舊格式薪資，金額以保存值為準{legacyIssues(payroll.oldEditing,payroll.legacy,payroll.employees).length>0?'：'+legacyIssues(payroll.oldEditing,payroll.legacy,payroll.employees).join('；'):''}</div>}
                              {(payroll.error || payroll.info || reviewNotes.length>0 || payroll.mailState==='ERROR' || payroll.mailState==='UNKNOWN' || editorSent || payroll.legacyCorrecting || (payroll.oldEditing && !payroll.legacyEditable) || (payroll.sendIssues.length>0 && (payroll.oldEditing ? payroll.legacyEditable : payroll.canEdit))) && <div className="px-6 py-2 border-b bg-white space-y-1 shrink-0">
                                    {payroll.error && <p role="alert" className="text-sm text-red-600">{payroll.error}</p>}
                                    {payroll.info && <p role="status" className="text-sm text-blue-600">{payroll.info}</p>}
                                    {payroll.sendIssues.length>0 && (payroll.oldEditing ? payroll.legacyEditable : payroll.canEdit) && <p data-testid="payroll-send-issues" className="text-sm font-bold text-red-700">不能寄送：{payroll.sendIssues.join('、')}</p>}
                                    {reviewNotes.length>0 && <p data-testid="payroll-review-notes" className="text-sm font-bold text-amber-700">請留意：{reviewNotes.join('、')}</p>}
                                    {editorSent && !payroll.legacyCorrecting && <p className="text-sm font-bold text-green-700">{MAIL_STATE_TEXT[payroll.mailState]}。要修改請從「更多」建立更正。</p>}
                                    {payroll.legacyCorrecting && <p className="text-sm font-bold text-amber-700">更正中：保存時需填原因，保存後請重新寄送。</p>}
                                    {payroll.oldEditing && !payroll.legacyEditable && !editorSent && <p className="text-sm font-bold text-amber-700">這份舊薪資目前唯讀，請核對資料是否完整、有無重複。</p>}
                                    {payroll.mailState==='ERROR' && <p className="text-sm font-bold text-red-700">寄送失敗。<button type="button" disabled={payroll.busy} onClick={()=>payroll.oldEditing?payroll.sendLegacy(true):payroll.send(true)} className="ml-1 underline">失敗重寄</button></p>}
                                    {payroll.mailState==='UNKNOWN' && <p className="text-sm font-bold text-amber-700">寄送狀態查詢失敗。<button type="button" disabled={payroll.busy} onClick={()=>payroll.oldEditing?payroll.checkLegacyMail():payroll.checkMail()} className="ml-1 underline">重新查詢</button></p>}
                              </div>}
                              <form onSubmit={handleSaveMonthlyData} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                                    {payroll.editing?.replacesId && <label className="block text-sm font-bold text-gray-600">更正原因（必填）<input aria-label="更正原因" disabled={payroll.busy||!payroll.canEdit} value={payroll.editing.reason} onChange={e=>payroll.setEditing({...payroll.editing!,reason:e.target.value})} className="mt-1 w-full border p-2.5 rounded-xl font-normal"/></label>}
                                    {editingMonthlyEmp && (
                                        <>
                                            <fieldset disabled={payroll.busy || (payroll.oldEditing ? !payroll.legacyEditable : !payroll.canEdit)} className="contents"><div className="space-y-4">
                                                <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-gray-500 rounded-full"></div>出勤時數</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">出勤時數</label>
                                                        <input type="number" step="any" disabled={editingMonthlyEmp.employmentType === 'full_time'} value={editingMonthlyEmp.employmentType === 'full_time' ? '' : (monthlyFormData.workHours || '')} onChange={e => handleMonthlyFormChange('workHours', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={editingMonthlyEmp.employmentType === 'full_time' ? '正職免填' : '0'} />
                                                    </div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">遲到 (分)</label><input type="number" step="any" value={monthlyFormData.lateHours || ''} onChange={e => handleMonthlyFormChange('lateHours', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600 bg-red-50/30" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">病假 (時)</label><input type="number" step="any" value={monthlyFormData.sickLeave || ''} onChange={e => handleMonthlyFormChange('sickLeave', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600 bg-red-50/30" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">事假 (時)</label><input type="number" step="any" value={monthlyFormData.personalLeave || ''} onChange={e => handleMonthlyFormChange('personalLeave', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600 bg-red-50/30" placeholder="0" /></div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-blue-500 mb-1">特休換薪 (時)</label>
                                                        <input type="number" step="any" disabled={editingMonthlyEmp.employmentType === 'part_time'} value={editingMonthlyEmp.employmentType === 'part_time' ? '' : (monthlyFormData.annualLeave || '')} onChange={e => handleMonthlyFormChange('annualLeave', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-600 bg-blue-50/30 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={editingMonthlyEmp.employmentType === 'part_time' ? '兼職無' : '0'} />
                                                    </div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">國定加班 (時)</label><input type="number" step="any" value={monthlyFormData.holidayOt || ''} onChange={e => handleMonthlyFormChange('holidayOt', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-600 bg-blue-50/30" placeholder="0" /></div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-blue-500 mb-1">日常加班 (時)</label>
                                                        <input type="number" step="any" value={monthlyFormData.normalOt || ''} onChange={e => handleMonthlyFormChange('normalOt', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-600 bg-blue-50/30" placeholder="0" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-blue-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>應加與免稅金額</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">免稅加班費</label><input type="number" step="any" disabled={!payroll.oldEditing} value={monthlyFormData.taxFreeOt ?? 0} onChange={e=>handleMonthlyFormChange('taxFreeOt',e.target.value)} className={`w-full border p-2.5 rounded-xl font-bold disabled:cursor-not-allowed text-right ${payroll.oldEditing&&payroll.legacyEditable?'text-gray-800 bg-white':'text-gray-500 bg-gray-100'}`} /></div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-blue-500 mb-1">{editingMonthlyEmp.employmentType === 'full_time' ? '本薪' : '應付薪資'}</label>
                                                        <input type="number" step="any" value={monthlyFormData.baseSalary || ''} onChange={e => handleMonthlyFormChange('baseSalary', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-800 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="0" />
                                                        {fieldHint('baseSalary')}
                                                        {editingMonthlyEmp.employmentType === 'part_time' && <span className="text-[10px] text-gray-400 mt-1">依約定時薪帶算，可人工調整</span>}
                                                    </div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">全勤獎金</label><input type="number" step="any" value={monthlyFormData.fullAttendance || ''} onChange={e => handleMonthlyFormChange('fullAttendance', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">職務津貼</label><input type="number" step="any" value={monthlyFormData.positionAllowance || ''} onChange={e => handleMonthlyFormChange('positionAllowance', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">業績獎金</label><input type="number" step="any" value={monthlyFormData.performanceBonus || ''} onChange={e => handleMonthlyFormChange('performanceBonus', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-yellow-600 mb-1">伙食費 (免稅)</label><input type="number" step="any" value={monthlyFormData.foodAllowance || ''} onChange={e => handleMonthlyFormChange('foodAllowance', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" placeholder="0" />{fieldHint('foodAllowance')}</div>
                                                    <div><label className="block text-xs font-bold text-blue-500 mb-1">應稅加班費</label><input type="number" step="any" value={monthlyFormData.taxableOt || ''} onChange={e=>handleMonthlyFormChange('taxableOt',e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0"/></div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-orange-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>應扣與代扣款項</h4>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">請假扣款</label><input type="number" step="any" disabled={!payroll.oldEditing} value={monthlyFormData.leaveDeduction ?? 0} onChange={e=>handleMonthlyFormChange('leaveDeduction',e.target.value)} className={`w-full border p-2.5 rounded-xl font-bold disabled:cursor-not-allowed text-right ${payroll.oldEditing&&payroll.legacyEditable?'text-gray-800 bg-white':'text-gray-500 bg-gray-100'}`} /></div>
                                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">遲到扣款</label><input type="number" step="any" disabled={!payroll.oldEditing} value={monthlyFormData.lateDeduction ?? 0} onChange={e=>handleMonthlyFormChange('lateDeduction',e.target.value)} className={`w-full border p-2.5 rounded-xl font-bold disabled:cursor-not-allowed text-right ${payroll.oldEditing&&payroll.legacyEditable?'text-gray-800 bg-white':'text-gray-500 bg-gray-100'}`} /></div>

                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">結帳差額扣款</label><input type="number" step="any" value={monthlyFormData.dailyShortage || ''} onChange={e => handleMonthlyFormChange('dailyShortage', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-red-500 mb-1">勞退自提 (6%)</label><input type="number" step="any" value={monthlyFormData.pensionSelf || ''} onChange={e => handleMonthlyFormChange('pensionSelf', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">預支款扣回</label><input type="number" step="any" value={monthlyFormData.advancePay || ''} onChange={e => handleMonthlyFormChange('advancePay', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold text-orange-600" placeholder="0" /></div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">勞保費</label><input type="number" step="any" value={monthlyFormData.laborIns || ''} onChange={e => handleMonthlyFormChange('laborIns', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" />{fieldHint('laborIns')}</div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">健保費</label><input type="number" step="any" value={monthlyFormData.healthIns || ''} onChange={e => handleMonthlyFormChange('healthIns', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" />{fieldHint('healthIns')}</div>
                                                    <div><label className="block text-xs font-bold text-orange-500 mb-1">所得稅扣繳</label><input type="number" step="any" value={monthlyFormData.incomeTax || ''} onChange={e => handleMonthlyFormChange('incomeTax', e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold" placeholder="0" /></div>
                                                </div>
                                            </div>
                                        </fieldset></>
                                    )}
                                    {payroll.editing && <label className="block text-xs font-bold text-gray-500">內部備註（不顯示於薪資單）<input aria-label="薪資備註" disabled={payroll.busy||!payroll.canEdit} value={payroll.editing.note} onChange={e=>payroll.setEditing({...payroll.editing!,note:e.target.value})} className="mt-1 w-full border p-2.5 rounded-xl text-sm font-normal text-gray-800"/></label>}
                                    <div className="text-xs py-2">
                                      <button type="button" aria-expanded={showVersionHistory} aria-controls="payroll-change-records" disabled={payroll.busy} onClick={()=>{if(!showVersionHistory)payroll.versions();setShowVersionHistory(!showVersionHistory);}} className="font-bold text-gray-600 underline hover:text-blue-700">變更紀錄</button>
                                                                            {showVersionHistory && <div id="payroll-change-records" className="mt-2 max-h-64 overflow-auto">
                                        {!payroll.history.length && !payroll.legacyHistory.length && <p className="text-gray-500">{payroll.oldEditing?'既有資料，早期修改歷程未保存。':'尚無變更紀錄。'}</p>}
                                        {payroll.history.map(v=>{const previous=payroll.history.find(p=>p.revision===v.revision-1);return <button type="button" key={v.revision} onClick={()=>previewSlip(v)} className="block w-full border-b border-gray-200 py-2 text-left hover:bg-blue-50"><span className="block font-bold">{new Date(v.updatedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})} · {payroll.historyUsers[v.actor]||'操作人未記錄'} · {payrollStatus[v.status]}</span>{previous ? [...amountFields,...attendanceFields].filter(k=>(k in v.amounts?v.amounts[k]:v.attendance[k])!==(k in previous.amounts?previous.amounts[k]:previous.attendance[k])).map(k=><span key={k} className="block">{labels[k]}：{k in previous.amounts?previous.amounts[k]:previous.attendance[k]} → {k in v.amounts?v.amounts[k]:v.attendance[k]}</span>) : <span>首次保存，實發 {payrollTotals(v.amounts).net.toLocaleString()} 元</span>}{previous && previous.note!==v.note && <span className="block">備註：{previous.note||'無'} → {v.note||'無'}</span>}{v.reason&&<span className="block">原因：{v.reason}</span>}</button>;})}
                                        {payroll.legacyHistory.map((v,i)=><div key={i} className="border-b border-gray-200 py-2"><p className="font-bold">{new Date(v.changedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})} · {payroll.historyUsers[v.actor]||'操作人未記錄'}</p>{[...amountFields,...attendanceFields].filter(k=>v.before[k]!==v.after[k]).map(k=><p key={k}>{labels[k]}：{v.before[k]??'未保存'} → {v.after[k]}</p>)}<p>原因：{v.reason}</p></div>)}
                                      </div>}
                                    </div>

                                    <button type="submit" id="submitMonthlyForm" className="hidden"></button>
                                </form>

                            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 mb-0.5">預估實發金額 ({selectedYear}年{editModalMonth}月)</span>
                                        <span className="text-2xl font-black text-green-600">${
                                            payrollTotals({...emptyValues(amountFields),...monthlyFormData}).net.toLocaleString()
                                        }</span>
                                    </div>
                              <div className="flex gap-2 flex-1 ml-6 justify-end items-center">
                                <div className="relative"><button type="button" aria-expanded={editorMenuOpen} onClick={()=>setEditorMenuOpen(v=>!v)} className="px-3 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 whitespace-nowrap">更多 ▾</button>
                                  {editorMenuOpen && <div role="menu" className="absolute bottom-full mb-2 left-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-1 w-44 grid">
                                    {payroll.editing?.status==='confirmed' && (editorSent||payroll.mailState==='ERROR') && <button type="button" role="menuitem" disabled={payroll.busy} onClick={()=>{setEditorMenuOpen(false);payroll.revise();}} className="px-3 py-2 text-left font-bold rounded-lg hover:bg-gray-100">建立更正</button>}
                                    {payroll.legacyCanCorrect && !payroll.legacyCorrecting && <button type="button" role="menuitem" onClick={()=>{setEditorMenuOpen(false);payroll.setLegacyCorrecting(true);}} className="px-3 py-2 text-left font-bold rounded-lg hover:bg-gray-100">建立更正</button>}
                                    {payroll.editing && payroll.editing.revision>0 && ['draft','confirmed'].includes(payroll.editing.status) && <button type="button" role="menuitem" disabled={payroll.busy} onClick={()=>{setEditorMenuOpen(false);payroll.voidSlip();}} className="px-3 py-2 text-left font-bold text-red-600 rounded-lg hover:bg-red-50">作廢</button>}
                                    {((payroll.editing && payroll.editing.revision>0) || payroll.oldEditing) && <button type="button" role="menuitem" disabled={payroll.busy} onClick={()=>{setEditorMenuOpen(false);if(payroll.oldEditing)payroll.checkLegacyMail();else payroll.checkMail();}} className="px-3 py-2 text-left font-bold rounded-lg hover:bg-gray-100">查詢寄送狀態</button>}
                                    {!((payroll.editing && payroll.editing.revision>0) || payroll.oldEditing) && <p className="px-3 py-2 text-sm text-gray-400">保存後才能使用</p>}
                                  </div>}
                                </div>
                                <button type="button" onClick={handlePreviewEmail} title="預覽薪資單" aria-label="預覽薪資單" className="px-3 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 whitespace-nowrap">預覽</button>
                                <button type="button" onClick={closeMonthlyEditor} className="px-4 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap">{payroll.hasUnsavedChanges||payroll.dirtyLegacy||payroll.legacyCorrecting||payroll.editing?.revision===0?'取消':'關閉'}</button>
                                <button disabled={!canSaveMonthly} onClick={() => document.getElementById('submitMonthlyForm')?.click()} className="px-4 py-3 bg-white border border-blue-200 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">{payroll.legacyEditable?'保存修改':'保存薪資'}</button>
                                <button type="button" disabled={!!sendBlockReason} onClick={handleSendEmail} title={sendBlockReason || '寄送薪資單'} aria-label="寄送薪資單" className="px-4 py-3 text-white font-bold rounded-xl shadow-md transition-all bg-blue-600 hover:bg-blue-700 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">{payroll.editing&&(payroll.dirty||payroll.editing.revision===0)?'保存並寄送':'寄送'}</button>
                              </div>
                            </div>
                          </div>
                        </div>
      )}
        </div>


        {previewHtml && <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"><div className="p-4 bg-gray-50 border-b flex justify-between font-bold">薪資單預覽<button onClick={()=>setPreviewHtml('')}>關閉預覽</button></div><iframe id="salary-preview" title="薪資單預覽" srcDoc={previewHtml} className="flex-1 w-full border-0"/></div></div>}
        {showPayrollHistory && <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"><div className="p-5 bg-gray-50 border-b flex justify-between font-bold">核對與歷史紀錄<button onClick={()=>setShowPayrollHistory(false)}>關閉</button></div><div className="p-6 overflow-auto text-sm space-y-4"><p>表格有效小計包括自動帶入值（已納入員工、月份不晚於當月且上月有已保存的完整薪資）、有效保存單與無異常的舊制保存值；未首次納入、資料不完整、作廢、被取代與待核對舊文件不計入。自動帶入不代表已寄送或付款。舊制確認及付款狀態未知，不能視為完整應付或已付款總額。</p>{payroll.legacy.filter(r=>activeInnerTab==='monthly'?r.month===selectedYear+'-'+selectedMonth:r.month.startsWith(selectedYear+'-')).map(r=><p key={r.id} className="p-3 bg-amber-50 rounded-xl">{r.month}／{payroll.employees.find(e=>e.id===r.employeeId)?.name||'員工主檔不存在'}／{r.id}：{legacyIssues(r,payroll.legacy,payroll.employees).join('；')||'舊制原值保存'}<br/>{amountFields.map(k=>labels[k]+': '+((r as any)[k]??'缺少')).join('；')}</p>)}{payroll.slips.filter(s=>activeInnerTab==='monthly'?s.month===selectedYear+'-'+selectedMonth:s.month.startsWith(selectedYear+'-')).map(s=><button key={s.id} className="block w-full text-left p-3 bg-gray-50 rounded-xl" onClick={()=>{const emp=payroll.employees.find(e=>e.id===s.employeeId);if(!emp)return;setEditingMonthlyEmp(emp);setEditModalMonth(s.month.slice(5));setEditModalMode(activeInnerTab==='yearly'?'yearly':'monthly');payroll.open({...emp,sourceEmployeeId:emp.id,slip:s} as PayrollRow,s.month);setIsMonthlyEditModalOpen(true);setShowPayrollHistory(false);}}>{s.employee.name}／{s.periodStart}～{s.periodEnd}／{payrollStatus[s.status]}</button>)}</div></div></div>}
        {showRecycle && <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="資源回收桶" className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"><div className="p-5 bg-gray-50 border-b flex justify-between font-bold">資源回收桶<button onClick={()=>setShowRecycle(false)}>關閉</button></div><div className="p-6 overflow-auto text-sm space-y-4"><p className="text-gray-600">不計入任何金額，也不影響開單。目前只能查看，不能刪除。</p>{payroll.recycle.length===0?<p className="text-gray-500">回收桶是空的。</p>:<table className="w-full text-left whitespace-nowrap"><thead className="bg-gray-50 border-b"><tr><th className="p-2">類型</th><th className="p-2">月份</th><th className="p-2">對象</th><th className="p-2 text-right">實發</th><th className="p-2">放入原因</th></tr></thead><tbody>{payroll.recycle.map(r=><tr key={r.id} className="border-b border-gray-100"><td className="p-2">{r.kind}</td><td className="p-2">{r.month||'—'}</td><td className="p-2">{r.who}</td><td className="p-2 text-right tabular-nums">{r.net===null?'—':r.net.toLocaleString()}</td><td className="p-2">{r.why}</td></tr>)}</tbody></table>}</div></div></div>}

        {payroll.batchReview && <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4"><div role="dialog" aria-label="核對本月薪資單" className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="p-5 bg-gray-50 border-b font-black text-gray-800">核對 {selectedYear} 年 {selectedMonth} 月薪資單</div>
          <div className="p-6 overflow-auto text-sm space-y-4">
            <p className="text-xs text-gray-500">黃底表示與上月不同。{payroll.batchReview.skipped>0&&`另有 ${payroll.batchReview.skipped} 張已排程、已寄送或寄送失敗，不會重複寄送。`}</p>
            {payroll.batchReview.ready.length>0 && <table className="w-full text-left whitespace-nowrap"><thead className="text-xs text-gray-500 border-b"><tr><th className="p-2">姓名</th><th className="p-2">收件信箱</th><th className="p-2 text-right">勞保</th><th className="p-2 text-right">健保</th><th className="p-2 text-right">所得稅</th><th className="p-2 text-right">全勤</th><th className="p-2 text-right">實發</th><th className="p-2">備註</th></tr></thead><tbody>{payroll.batchReview.ready.map(item=>{const cell=(key:string,value:number)=><td data-changed={item.changed.includes(key)} className={`p-2 text-right font-bold ${item.changed.includes(key)?'bg-amber-100 text-amber-800':'text-gray-700'}`}>{value.toLocaleString()}</td>;return <tr key={item.key} className="border-b border-gray-100"><td className="p-2 font-black text-gray-800">{item.name}</td><td className="p-2 text-gray-600">{item.email}</td>{cell('laborIns',item.amounts.laborIns)}{cell('healthIns',item.amounts.healthIns)}{cell('incomeTax',item.amounts.incomeTax)}{cell('fullAttendance',item.amounts.fullAttendance)}{cell('net',payrollTotals(item.amounts).net)}<td className="p-2 text-xs text-gray-500">{item.autoSave?'寄送前會先保存':''}</td></tr>;})}</tbody></table>}
            {payroll.batchReview.blocked.length>0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl"><p className="font-bold text-amber-800 mb-1">需處理，這次不會寄送（{payroll.batchReview.blocked.length} 位）</p>{payroll.batchReview.blocked.map(item=><p key={item.key} className="text-amber-800">{item.name}：{item.issues.join('；')}</p>)}</div>}
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"><button type="button" onClick={()=>payroll.setBatchReview(null)} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100">取消</button><button type="button" disabled={!payroll.batchReview.ready.length} onClick={handleConfirmBatchSend} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">確認寄送 {payroll.batchReview.ready.length} 張</button></div>
        </div></div>}

        {/* 🚀 員工詳細資訊 (新增/編輯) Modal */}
        {isEmpModalOpen && editingEmp && (
            <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={closeEmployeeEditor}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-3"><h3 className="text-xl font-black text-gray-800">{employeeOriginal ? '編輯員工資料 - ' + employeeOriginal.name : '新增員工'}</h3>{employeeOriginal && <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${EMPLOYEE_STATUS_STYLE[employeeStatus(employeeOriginal).tone]}`}>{employeeStatus(employeeOriginal).label}</span>}</div>
                        <button onClick={closeEmployeeEditor} className="text-gray-400 hover:text-gray-600 text-2xl font-black">✕</button>
                    </div>
                    {employeeError && <p role="alert" className="bg-red-50 text-red-700 px-6 py-3 border-b shrink-0">{employeeError}</p>}

                    <form onSubmit={handleSaveEmp} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>核心資料</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">序號</label><input type="text" value={editingEmp.empNo || ''} onChange={e => setEditingEmp({...editingEmp, empNo: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="例如: 001" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">姓名</label><input type="text" required value={editingEmp.name || ''} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">電子郵件</label><input type="email" value={editingEmp.email || ''} onChange={e => setEditingEmp({...editingEmp, email: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>詳細個資</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">身分證字號</label><input type="text" value={editingEmp.idNumber || ''} onChange={e => setEditingEmp({...editingEmp, idNumber: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm uppercase font-mono" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">銀行分行名稱</label><input type="text" value={editingEmp.bankBranch || ''} onChange={e => setEditingEmp({...editingEmp, bankBranch: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" placeholder="例如: 中國信託 站前分行" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">銀行戶頭代號</label><input type="text" value={editingEmp.bankAccount || ''} onChange={e => setEditingEmp({...editingEmp, bankAccount: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono" /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">戶籍地址</label><input type="text" value={editingEmp.address || ''} onChange={e => setEditingEmp({...editingEmp, address: e.target.value})} className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" /></div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-green-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-green-500 rounded-full"></div>任職歷程<span className="flex-1"></span>
                                <button type="button" onClick={() => {
                                  if (editingEmpEmployHistory.some(p => !p.endDate)) { setEmployeeError('請先填寫目前任職的離職日，再新增復職'); return; }
                                  const last = [...editingEmpEmployHistory].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
                                  const pay = [...editingEmpCompHistory].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
                                  const id = crypto.randomUUID();
                                  setEditingEmpEmployHistory(prev => [...prev, { id, type: last?.type || editingEmp.employmentType || 'full_time', startDate: '', endDate: null }]);
                                  // The previous pay is carried over to confirm; its date follows the new start date.
                                  setEditingEmpCompHistory(prev => [...prev, { ...(pay || { baseSalary: 0, foodAllowance: 0, insuranceBracket: 0, hasLaborIns: true, hasHealthIns: true }), id: crypto.randomUUID(), effectiveDate: '', forPeriodId: id } as any]);
                                  setEmployeeError('');
                                }} className="text-xs font-bold text-green-700 bg-white border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">+ 新增任職／員工復職</button>
                            </h4>
                            {editingEmpEmployHistory.length === 0 && <p className="text-xs text-gray-400 text-center py-3">尚無任職紀錄</p>}
                            <div className="space-y-2">
                                {[...editingEmpEmployHistory].sort((a, b) => (b.startDate || '9').localeCompare(a.startDate || '9')).map(rec => {
                                    const locked = !!employeeOriginal && payroll.slips.some(s => s.employeeId === editingEmp.id && s.employmentId === rec.id && s.status !== 'void');
                                    return <div key={rec.id} data-testid="employment-row" className={`flex flex-wrap items-end gap-3 border rounded-xl p-3 ${!rec.endDate ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200 bg-white'}`}>
                                        <label className="flex-1 min-w-[120px] text-xs font-bold text-gray-500">聘僱身分<select disabled={locked} value={rec.type} onChange={e => setEditingEmpEmployHistory(prev => prev.map(r => r.id === rec.id ? { ...r, type: e.target.value as 'full_time' | 'part_time' } : r))} className="mt-1 w-full border p-2 rounded-lg text-sm font-bold bg-white text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"><option value="full_time">正職</option><option value="part_time">兼職</option></select></label>
                                        <label className="flex-1 min-w-[140px] text-xs font-bold text-gray-500">到職日<input aria-label="到職日" type="date" disabled={locked} value={rec.startDate} onChange={e => { const value = e.target.value; setEditingEmpEmployHistory(prev => prev.map(r => r.id === rec.id ? { ...r, startDate: value } : r)); setEditingEmpCompHistory(prev => prev.map(c => (c as any).forPeriodId === rec.id ? { ...c, effectiveDate: value } : c)); }} className="mt-1 w-full border p-2 rounded-lg text-sm text-gray-800 bg-white disabled:bg-gray-100 disabled:text-gray-500" /></label>
                                        <label className="flex-1 min-w-[140px] text-xs font-bold text-gray-500">離職日（留空代表在職）<input aria-label="離職日" type="date" value={rec.endDate || ''} onChange={e => setEditingEmpEmployHistory(prev => prev.map(r => r.id === rec.id ? { ...r, endDate: e.target.value || null } : r))} className="mt-1 w-full border p-2 rounded-lg text-sm text-gray-800 bg-white" /></label>
                                        <button type="button" disabled={locked} aria-label="移除這段任職" title={locked ? '這段任職已有薪資單，不能移除' : '移除這段任職'} onClick={() => { setEditingEmpEmployHistory(prev => prev.filter(r => r.id !== rec.id)); setEditingEmpCompHistory(prev => prev.filter(c => (c as any).forPeriodId !== rec.id)); }} className="p-2 text-red-400 hover:text-red-600 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed">✕</button>
                                    </div>;
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-orange-700 border-b pb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>待遇歷程<span className="flex-1"></span>
                                <button type="button" onClick={() => setEditingEmpCompHistory(prev => { const pay = [...prev].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]; const first = [...editingEmpEmployHistory].filter(p => p.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))[0]?.startDate; return [...prev, { ...(pay || { baseSalary: 0, foodAllowance: 0, insuranceBracket: 0, hasLaborIns: true, hasHealthIns: true }), id: crypto.randomUUID(), effectiveDate: pay ? taiwanToday() : (first || taiwanToday()) } as any]; })} className="text-xs font-bold text-orange-700 bg-white border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">+ 新增調薪紀錄</button>
                            </h4>
                            {editingEmpCompHistory.length === 0 && <p className="text-sm font-bold text-red-600 text-center py-2">尚無待遇紀錄，補上後才能開單</p>}
                            <div className="space-y-2">
                                {[...editingEmpCompHistory].sort((a, b) => (b.effectiveDate || '9').localeCompare(a.effectiveDate || '9')).map(rec => {
                                    const current = rec.effectiveDate && rec.effectiveDate === editingEmpCompHistory.map(c => c.effectiveDate).filter(d => d && d <= taiwanToday()).sort().pop();
                                    const fullTime = (editingEmpEmployHistory.find(p => p.startDate && p.startDate <= rec.effectiveDate && (!p.endDate || p.endDate >= rec.effectiveDate))?.type ?? editingEmp.employmentType) === 'full_time';
                                    const update = (patch: any) => setEditingEmpCompHistory(prev => prev.map(r => r.id === rec.id ? { ...r, ...patch } : r));
                                    return <div key={rec.id} data-testid="pay-row" className={`flex flex-wrap items-end gap-3 border rounded-xl p-3 ${current ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200 bg-white'}`}>
                                        <label className="flex-1 min-w-[140px] text-xs font-bold text-gray-500">生效日期<input aria-label="生效日期" type="date" value={rec.effectiveDate} onChange={e => update({ effectiveDate: e.target.value })} className="mt-1 w-full border p-2 rounded-lg text-sm text-gray-800 bg-white" /></label>
                                        <label className="flex-1 min-w-[100px] text-xs font-bold text-gray-500">{fullTime ? '月薪' : '時薪'}<input aria-label="月薪或時薪" type="number" step="any" min="0" value={rec.baseSalary || ''} onChange={e => update({ baseSalary: Number(e.target.value) })} placeholder="0" className="mt-1 w-full border p-2 rounded-lg text-sm font-bold text-gray-800 bg-white" /></label>
                                        <label className="flex-1 min-w-[100px] text-xs font-bold text-gray-500">約定伙食費<input aria-label="約定伙食費" type="number" step="any" min="0" value={rec.foodAllowance ?? ''} onChange={e => update({ foodAllowance: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" className="mt-1 w-full border p-2 rounded-lg text-sm font-bold text-gray-800 bg-white" /></label>
                                        <label className="flex-1 min-w-[100px] text-xs font-bold text-gray-500">勞健保級距<input aria-label="勞健保級距" type="number" step="any" min="0" value={rec.insuranceBracket || ''} onChange={e => update({ insuranceBracket: Number(e.target.value) })} placeholder="0" className="mt-1 w-full border p-2 rounded-lg text-sm font-bold text-gray-800 bg-white" /></label>
                                        <div className="grid gap-1 text-sm font-bold text-gray-700 pb-1">
                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={rec.hasLaborIns ?? true} onChange={e => update({ hasLaborIns: e.target.checked })} />投保勞保</label>
                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={rec.hasHealthIns ?? true} onChange={e => update({ hasHealthIns: e.target.checked })} />投保健保</label>
                                        </div>
                                        <button type="button" aria-label="移除這筆待遇" onClick={() => setEditingEmpCompHistory(prev => prev.filter(r => r.id !== rec.id))} className="p-2 text-red-400 hover:text-red-600 rounded-lg">✕</button>
                                    </div>;
                                })}
                            </div>
                        </div>

                        {employeeOriginal && <div className="text-xs">
                            <button type="button" aria-expanded={!!employeeVersions} onClick={async () => { if (employeeVersions) { setEmployeeVersions(null); return; } setEmployeeVersionsError(''); try { setEmployeeVersions(await payroll.employeeHistory(employeeOriginal.id)); } catch (error: any) { setEmployeeVersionsError(error.message || '變更紀錄讀取失敗'); } }} className="font-bold text-gray-600 underline hover:text-blue-700">變更紀錄</button>
                            {employeeVersionsError && <p role="alert" className="text-red-600 mt-1">{employeeVersionsError}</p>}
                            {employeeVersions && <div className="mt-2 max-h-64 overflow-auto">
                                {!employeeVersions.length && <p className="text-gray-500">尚無變更紀錄；只會記錄此功能上線之後的修改。</p>}
                                {employeeVersions.map((version, index) => <div key={index} className="border-b border-gray-200 py-2"><p className="font-bold">{new Date(version.changedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })} · {version.actorName || '操作人未記錄'}</p>{version.changes.map((change, n) => <p key={n}>{change.label}：{change.from} → {change.to}</p>)}</div>)}
                            </div>}
                        </div>}

                        <button type="submit" disabled={employeeSaving} id="submitEmpForm" className="hidden"></button>
                    </form>

                    <div className="p-4 border-t bg-gray-50 flex gap-3">
                        <span className="self-center text-sm text-gray-500">歷史資料保留</span>
                        <button onClick={closeEmployeeEditor} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">取消</button>
                        <button disabled={employeeSaving} onClick={() => document.getElementById('submitEmpForm')?.click()} className="flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-all bg-blue-600 hover:bg-blue-700">確認存檔</button>
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
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">客戶薪資計算</h2>
        <div className="flex gap-2">
          <button onClick={() => { setClientActionError(''); setIsAddClientModalOpen(true); }} title="新增客戶" className="p-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center">
            <PlusIcon className="w-5 h-5" />
          </button>
          <button onClick={() => { setClientActionError(''); setClientsToDelete([]); setIsDeleteClientModalOpen(true); }} title="移除客戶" className="p-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center">
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
            {clientActionError && <p role="alert" className="text-sm text-red-600 mb-4 whitespace-pre-line">{clientActionError}</p>}
            <div className="flex gap-3">
              <button disabled={clientActionBusy} onClick={() => setIsAddClientModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleAddClient} disabled={!newClientSelectId || clientActionBusy} className="flex-1 py-3 bg-blue-600 font-bold rounded-xl text-white disabled:opacity-50">確認加入</button>
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
            {clientActionError && <p role="alert" className="text-sm text-red-600 mb-4 whitespace-pre-line">{clientActionError}</p>}
            <div className="flex gap-3">
              <button disabled={clientActionBusy} onClick={() => { setIsDeleteClientModalOpen(false); setClientsToDelete([]); }} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-600">取消</button>
              <button onClick={handleConfirmDeleteClients} disabled={clientsToDelete.length === 0 || clientActionBusy} className="flex-1 py-3 bg-red-600 font-bold rounded-xl text-white disabled:opacity-50">確認移除 ({clientsToDelete.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
