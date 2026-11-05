import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { Client, Employee, MonthlySalaryRecord } from './types';
import { Slip, amountFields, attendanceFields, emptyValues, periods, basisAt, calculate, monthEnd, legacyIssues, legacyAmounts, isPayrollEnrolled, legacyCanEdit, totals, legacyNeedsEnrollment, isEffectivePayroll, recurringPayroll, currentPayrollMonth, defaultBaseSalary, defaultFoodAllowance, isFullMonth, previousPayroll, carriedAmounts, payrollSendIssues, legacySendIssues, automaticPayrollIssue, legacyAttendance, Values } from './functions/src/payrollDomain';

export const payrollStatus: Record<string, string> = {draft:'待首次納入',confirmed:'已保存',void:'已作廢',superseded:'已被更正取代'};
export type PayrollRow = Employee & { sourceEmployeeId: string; slip?: Slip; legacyRecord?: MonthlySalaryRecord; periodId?: string; recommendedStart?: string; recommendedEnd?: string; warning?: string; reason?: string; excluded?: boolean };
const HIDDEN_LEGACY_MESSAGE = '這個月有暫藏的舊薪資，請先核對';
export type BatchItem = { key:string; name:string; email:string; amounts:Values; changed:string[]; autoSave:boolean; issues:string[]; slip?:Slip; legacyRecord?:MonthlySalaryRecord };
export type BatchReview = { ready:BatchItem[]; blocked:BatchItem[]; skipped:number };
const command = httpsCallable<any, any>(functions, 'payrollCommand');
export function usePayrollPresentation(client: Client | null, month: string) {
  const clientId = client ? String(client.id) : '';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [legacy, setLegacy] = useState<MonthlySalaryRecord[]>([]);
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Slip | null>(null);
  const [oldEditing, setOldEditing] = useState<MonthlySalaryRecord | null>(null);
  const [history, setHistory] = useState<Slip[]>([]);
  const [legacyHistory, setLegacyHistory] = useState<any[]>([]);
  const [historyUsers, setHistoryUsers] = useState<Record<string, string>>({});
  const [mailState, setMailState] = useState('NONE');
  const [openSequence, setOpenSequence] = useState(0);
  const openedSignature = useRef('');
  const lock = useRef(false);
  const recurringIds = useRef<Record<string,string>>({});
  const pending = useRef<{body: any; operationId: string}|null>(null);
  const lastError = useRef('');
  const [hiddenLegacy, setHiddenLegacy] = useState<Array<{employeeId:string;month:string}>>([]);
  const [openReason, setOpenReason] = useState('');
  const [legacyCorrecting, setLegacyCorrecting] = useState(false);
  const [batchReview, setBatchReview] = useState<BatchReview|null>(null);
  const [batchNotice, setBatchNotice] = useState<{text:string; failures:string[]}|null>(null);
  useEffect(() => { setBatchReview(null); setBatchNotice(null); },[clientId,month]);
  useEffect(() => {
    pending.current=null; openedSignature.current=''; setLoaded({}); setError(''); setSlips([]); setLegacy([]); setEmployees([]); setEditing(null); setOldEditing(null); setHistory([]); setHistoryUsers({});
    if (!clientId) return;
    const cleanups = ['employees','monthlySalaries','payrollSlips'].map(name => onSnapshot(query(collection(db,name),where('clientId','==',clientId)), snapshot => {
      const rows = snapshot.docs.map(d=>({...d.data(),id:d.id}));
      if(name==='employees') setEmployees((rows as Employee[]).filter(r=>r.temporaryPayrollHidden!==true));
      if(name==='monthlySalaries') {
        setLegacy((rows as MonthlySalaryRecord[]).filter(r=>r.temporaryPayrollHidden!==true));
        // Hidden amounts stay out of the page, but the month is reserved exactly as the backend treats it.
        setHiddenLegacy((rows as MonthlySalaryRecord[]).filter(r=>r.temporaryPayrollHidden===true).map(r=>({employeeId:r.employeeId,month:r.month})));
      }
      if(name==='payrollSlips') setSlips(rows as Slip[]);
      setLoaded(prev=>({...prev,[name]:true}));
    }, e=>{setError('薪資資料讀取失敗：'+e.message);setLoaded(prev=>({...prev,[name]:false}));}));
    return ()=>cleanups.forEach(fn=>fn());
  },[clientId]);
  const ready = !!clientId && ['employees','monthlySalaries','payrollSlips'].every(k=>loaded[k]);
  async function run(body: any) {
    if(lock.current || !ready) { lastError.current='操作進行中或資料尚未載入完成'; return; }
    lock.current=true; setBusy(true); setError(''); setInfo('');
    try {
      if(!pending.current || JSON.stringify(pending.current.body)!==JSON.stringify(body)) pending.current={body,operationId:crypto.randomUUID()};
      const result=await command({...body,clientId,operationId:pending.current.operationId});
      pending.current=null; return result.data;
    } catch(e:any){const message=e.message||'操作失敗，請重試';lastError.current=message;setError(message.includes('薪資版本已變更')?'這份薪資已由其他人更新，請重新開啟。':message);return undefined;}
    finally{lock.current=false;setBusy(false);}
  }
  function alias(e: Employee, id:string, type:string, start:string, end:string|null): PayrollRow {
    return {...e,id,sourceEmployeeId:e.id,employmentType:type as any,startDate:start,endDate:end||'',employmentHistory:[{id,type:type as any,startDate:start,endDate:end}]};
  }
  function rowsFor(m:string): PayrollRow[] {
    if(!ready) return [];
    const currentMonth=currentPayrollMonth();
    const rows:PayrollRow[]=[];
    for(const e of employees) {
      const olds=legacy.filter(r=>r.employeeId===e.id&&r.month===m);
      const ss=slips.filter(s=>s.employeeId===e.id&&s.month===m&&s.status!=='void'&&s.status!=='superseded').sort((a,b)=>a.periodStart.localeCompare(b.periodStart)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
      for(const r of olds) rows.push({...e,id:'old:'+r.id,sourceEmployeeId:e.id,legacyRecord:r,warning:legacyIssues(r,legacy,employees).join('；'),excluded:legacyIssues(r,legacy,employees).length>0||legacyNeedsEnrollment(r,employees,slips,legacy)});
      for(const s of ss) rows.push({...alias(e,s.id,s.basis.employmentType,periods(e).find(p=>p.id===s.employmentId)?.startDate||e.startDate,periods(e).find(p=>p.id===s.employmentId)?.endDate||null),name:s.employee.name,empNo:s.employee.empNo,email:s.employee.email,idNumber:s.employee.idNumber||'',bankAccount:s.employee.bankAccount||'',defaultBaseSalary:s.basis.baseSalary,defaultFoodAllowance:s.basis.foodAllowance,compensationHistory:[],slip:s,excluded:!isEffectivePayroll(s,e,slips,legacy)});
      if(olds.length) continue;
      const reservedByHidden=hiddenLegacy.some(r=>r.employeeId===e.id&&r.month===m);
      for(const p of periods(e).filter(p=>p.startDate<=monthEnd(m)&&(!p.endDate||p.endDate>=m+'-01'))) {
        const start=p.startDate>m+'-01'?p.startDate:m+'-01'; const end=p.endDate&&p.endDate<monthEnd(m)?p.endDate:monthEnd(m);
        const nextDay=(d:string,offset:number)=>{const date=new Date(d+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);};
        const cuts=[...new Set([start,...(e.compensationHistory||[]).map(c=>c.effectiveDate).filter(d=>d>start&&d<=end)])].sort();
        for(let i=0;i<cuts.length;i++){
          let gaps=[{start:cuts[i],end:i+1<cuts.length?nextDay(cuts[i+1],-1):end}];
          for(const slip of ss.filter(s=>s.employmentId===p.id&&s.kind==='regular')) gaps=gaps.flatMap(g=>slip.periodStart>g.end||slip.periodEnd<g.start?[g]:[...(g.start<slip.periodStart?[{start:g.start,end:nextDay(slip.periodStart,-1)}]:[]),...(g.end>slip.periodEnd?[{start:nextDay(slip.periodEnd,1),end:g.end}]:[])]);
          for(const g of gaps) {
            const recurring=reservedByHidden?null:recurringPayroll(e,p,m,client!,slips,legacy,currentMonth);
            if(recurring && g.start===recurring.periodStart && g.end===recurring.periodEnd) rows.push({...alias(e,recurring.id,p.type,p.startDate,p.endDate),slip:recurring,excluded:false});
            else rows.push({...alias(e,'period:'+e.id+':'+p.id+':'+g.start,p.type,p.startDate,p.endDate),periodId:p.id,recommendedStart:g.start,recommendedEnd:g.end,excluded:true,reason:reservedByHidden?HIDDEN_LEGACY_MESSAGE:automaticPayrollIssue(e,p,m,g.start,g.end,slips,legacy,currentMonth)});
          }
        }
      }
    }
    return rows;
  }
  function flat(row:PayrollRow) {
    if(row.slip) return {...row.slip.amounts,...row.slip.attendance,id:row.slip.id};
    if(row.legacyRecord) return {...row.legacyRecord,...legacyAmounts(row.legacyRecord)};
    try {const e=employees.find(e=>e.id===row.sourceEmployeeId)!;const p=periods(e).find(p=>p.id===row.periodId)!;const start=row.recommendedStart||(p.startDate>month+'-01'?p.startDate:month+'-01'),end=row.recommendedEnd||(p.endDate&&p.endDate<monthEnd(month)?p.endDate:monthEnd(month));const b=basisAt(e,p,start,end);return {...emptyValues(amountFields),...emptyValues(attendanceFields),baseSalary:defaultBaseSalary(b,start.slice(0,7),start,end),foodAllowance:defaultFoodAllowance(b,start.slice(0,7),start,end)};}
    catch{return {...emptyValues(amountFields),...emptyValues(attendanceFields)};}
  }
  function open(row:PayrollRow,m=month) {
    setOpenSequence(n=>n+1);
    setError('');setInfo('');setHistory([]);setLegacyHistory([]);setHistoryUsers({});setMailState('NONE');setLegacyCorrecting(false);setOpenReason(row.slip||row.legacyRecord?'':row.reason||'');
    if(!ready) return;
    if(row.legacyRecord){setEditing(null);setOldEditing(structuredClone(row.legacyRecord));setMailState(row.legacyRecord.legacySeptemberMailId?'UNKNOWN':'NONE');return;}
    if(row.slip){setOldEditing(null);openedSignature.current=signature(row.slip);setEditing(structuredClone(row.slip.revision===0?{...row.slip,id:recurringIds.current[row.slip.id]||(recurringIds.current[row.slip.id]=crypto.randomUUID())}:row.slip));setMailState(row.slip.status==='confirmed'?'UNKNOWN':'NONE');return;}
    try{
      const e=employees.find(e=>e.id===row.sourceEmployeeId||e.id===row.id);
      if(!e) throw Error('找不到員工');
      if(legacy.some(r=>r.employeeId===e.id&&r.month===m)) throw Error('該月已有舊薪資，請先核對，避免重複結薪');
      if(hiddenLegacy.some(r=>r.employeeId===e.id&&r.month===m)) throw Error(HIDDEN_LEGACY_MESSAGE);
      const ps=periods(e).filter(p=>p.startDate<=monthEnd(m)&&(!p.endDate||p.endDate>=m+'-01'));
      const p=ps.find(p=>p.id===row.periodId)||ps[0];if(!p)throw Error('該月沒有有效任職期間');
      const start=row.recommendedStart||(p.startDate>m+'-01'?p.startDate:m+'-01'),end=row.recommendedEnd||(p.endDate&&p.endDate<monthEnd(m)?p.endDate:monthEnd(m));
      const basis=basisAt(e,p,start,end),amounts=emptyValues(amountFields); amounts.baseSalary=defaultBaseSalary(basis,m,start,end);amounts.foodAllowance=defaultFoodAllowance(basis,m,start,end);
      const previous=basis.employmentType==='full_time'&&isFullMonth(m,start,end)?previousPayroll(e,p,m,slips,legacy):null;if(previous)Object.assign(amounts,carriedAmounts(basis,previous));
      const draft: Slip = {id:crypto.randomUUID(),schemaVersion:2,revision:0,clientId,employeeId:e.id,employmentId:p.id,month:m,periodStart:start,periodEnd:end,kind:'regular',relatedId:'',replacesId:'',status:'draft',basis,amounts,attendance:emptyValues(attendanceFields),employee:{name:e.name,email:e.email,empNo:e.empNo,idNumber:e.idNumber||'',bankAccount:e.bankAccount||''},company:{name:client!.fullName||client!.name,phone:client!.phone||'',address:client!.contactAddress||client!.regAddress||''},note:'',reason:'',reviewedMonth:false,createdAt:'',updatedAt:'',actor:''};
      openedSignature.current=signature(draft);setOldEditing(null);setEditing(draft);
    }catch(e:any){setEditing(null);setOldEditing(null);setError(e.message);}
  }
  const needsEnrollment = oldEditing ? legacyNeedsEnrollment(oldEditing,employees,slips,legacy) : !!editing && !isPayrollEnrolled(employees.find(e=>e.id===editing.employeeId), editing.employmentId, slips, legacy, editing.month);
  // A blank new slip only counts after saving; an unsaved slip is effective only if it came from an automatic row.
  const effectiveEditing = !!editing && (editing.revision>0 || Object.values(recurringIds.current).includes(editing.id)) && isEffectivePayroll(editing,employees.find(e=>e.id===editing.employeeId),slips,legacy);
  const canEdit = !!editing && (editing.status === 'draft' || editing.status === 'confirmed' && mailState === 'NONE');
  const hasOtherPayFor = (s:Slip) => slips.some(x=>x.id!==s.id && x.id!==s.replacesId && x.employeeId===s.employeeId && x.month===s.month && x.status==='confirmed');
  const hasOtherPay = !!editing && hasOtherPayFor(editing);
  // Matches the backend: an unsent slip goes to the address currently on the employee record.
  const recipientOf = (s:Slip) => { const e=employees.find(e=>e.id===s.employeeId); return e?(e.email||''):s.employee.email; };
  const slipSendIssues = (s:Slip) => payrollSendIssues({kind:s.kind,month:s.month,email:recipientOf(s),amounts:s.amounts,basis:s.basis,hasOtherPay:hasOtherPayFor(s)});
  const legacyIssuesToSend = (r:MonthlySalaryRecord) => legacySendIssues(r,employees.find(e=>e.id===r.employeeId));
  const sendIssues = editing ? slipSendIssues(editing) : oldEditing ? legacyIssuesToSend(oldEditing) : [];
  useEffect(()=>{
    if (!ready || (!editing && !oldEditing)) return;
    if (editing?.revision===0) { setMailState('NONE'); return; }
    let cancelled=false;
    setMailState('UNKNOWN');
    command({clientId,operationId:crypto.randomUUID(),action:oldEditing?'legacySeptemberMailStatus':'mailStatus',id:oldEditing?.id||editing?.id}).then(r=>{if(!cancelled)setMailState(r.data.state);}).catch(()=>{if(!cancelled)setMailState('UNKNOWN');});
    return ()=>{cancelled=true;};
  },[clientId,ready,openSequence,editing?.id,editing?.revision,oldEditing?.id,oldEditing?.legacySeptemberRevision]);
  function change(k:string,value:string) {
    if(!editing||!canEdit||busy)return;
    const n=Number(value)||0;
    try{let amounts={...editing.amounts};const attendance={...editing.attendance};
      if((attendanceFields as readonly string[]).includes(k)){attendance[k]=n;if(k==='workHours'&&editing.basis.employmentType==='part_time')amounts.baseSalary=n*editing.basis.baseSalary;amounts=calculate(editing.basis,attendance,amounts);}
      else amounts[k]=n;
      setEditing({...editing,amounts,attendance});
    }catch(e:any){setError(e.message);}
  }
  const oldSaved = oldEditing && legacy.find(r=>r.id===oldEditing.id);
  const legacyCanCorrect = !!oldEditing && !!(oldEditing.isEmailSent||oldEditing.legacySeptemberMailId) && ['SUCCESS','ERROR','UNTRACKED'].includes(mailState) && legacyCanEdit({...oldEditing,isEmailSent:false,legacySeptemberMailId:''},legacy,employees,slips);
  const legacyEditable = !!oldEditing && (legacyCanEdit(oldEditing,legacy,employees,slips) || legacyCorrecting && legacyCanCorrect);
  const dirtyLegacy = !!oldEditing && !!oldSaved && [...amountFields,...attendanceFields].some(k=>(oldEditing as any)[k] !== (oldSaved as any)[k]);
  function changeLegacy(k:string,value:string) {
    if(!legacyEditable || busy || ![...amountFields,...attendanceFields].includes(k as any))return;
    setOldEditing(prev=>prev?{...prev,[k]:Number(value)||0}:prev);
  }
  async function saveLegacy(reason:string) {
    if(!legacyEditable || !oldEditing || !oldSaved || !dirtyLegacy)return;
    const result=await run({action:'saveLegacySeptember',id:oldEditing.id,expectedRevision:oldSaved.legacySeptemberRevision||0,expected:oldSaved,amounts:Object.fromEntries(amountFields.map(k=>[k,(oldEditing as any)[k]])),attendance:legacyAttendance(oldEditing),reason,correction:legacyCorrecting});
    if(result){const corrected=legacyCorrecting;setLegacyCorrecting(false);setOldEditing(result.record);setInfo(corrected?'更正已保存，原值保留；請重新寄送。':'薪資修改已保存，原值保留。');}
  }
  async function sendLegacy(retry=false) {
    if(!oldEditing || dirtyLegacy || legacyCorrecting){setError('請先保存薪資修改，再寄送。');return;}
    if(sendIssues.length){setError('不能寄送：'+sendIssues.join('；'));return;}
    if(!window.confirm(legacyReview(oldEditing)))return;
    const result=await run({action:'sendLegacySeptember',id:oldEditing.id,expectedRevision:oldEditing.legacySeptemberRevision||0,retry});
    if(result){setOldEditing(prev=>prev?{...prev,legacySeptemberMailId:result.mailId}:prev);setMailState(result.state);setInfo('已交寄送服務排程；不代表收件匣已收到。');}
  }
  async function confirmLegacyEnrollment() {
    if(!oldEditing || dirtyLegacy || !window.confirm('確認到職日、待遇與計薪期間，首次納入薪資？'))return;
    const result=await run({action:'confirmLegacyEnrollment',id:oldEditing.id,expected:oldEditing});
    if(result){setOldEditing(result.record);setInfo('已完成首次納入薪資。');}
  }
  const isLegacyIncluded = (r:MonthlySalaryRecord) => !legacyIssues(r,legacy,employees).length && !legacyNeedsEnrollment(r,employees,slips);
  async function checkLegacyMail() {
    if(!oldEditing)return;
    const result=await run({action:'legacySeptemberMailStatus',id:oldEditing.id});
    if(result)setMailState(result.state);
  }
  function changePeriod(id:string,start?:string,end?:string) {
    if(!editing||editing.revision>0||editing.status!=='draft')return;
    try{const e=employees.find(e=>e.id===editing.employeeId)!;const p=periods(e).find(p=>p.id===id)!;
      const a=start||(p.startDate>editing.month+'-01'?p.startDate:editing.month+'-01');const z=end||(p.endDate&&p.endDate<monthEnd(editing.month)?p.endDate:monthEnd(editing.month));
      const basis=basisAt(e,p,a,z);const amounts={...editing.amounts};if(id!==editing.employmentId){amounts.baseSalary=defaultBaseSalary(basis,editing.month,a,z);amounts.foodAllowance=defaultFoodAllowance(basis,editing.month,a,z);}else{if(basis.employmentType==='full_time'&&(amounts.baseSalary===0||amounts.baseSalary===editing.basis.baseSalary))amounts.baseSalary=defaultBaseSalary(basis,editing.month,a,z);if(amounts.foodAllowance===0||amounts.foodAllowance===editing.basis.foodAllowance)amounts.foodAllowance=defaultFoodAllowance(basis,editing.month,a,z);}
      setEditing({...editing,employmentId:id,periodStart:a,periodEnd:z,basis,amounts:calculate(basis,editing.attendance,amounts)});setError('');
    }catch(e:any){setError(e.message);}
  }
  const reviewAmounts = (a:Values) => '勞保 '+a.laborIns.toLocaleString()+'／健保 '+a.healthIns.toLocaleString()+'／所得稅 '+a.incomeTax.toLocaleString()+'／全勤 '+a.fullAttendance.toLocaleString()+'\n實發：'+totals(a).net.toLocaleString()+' 元';
  function legacyReview(r:MonthlySalaryRecord) { const e=employees.find(e=>e.id===r.employeeId); return '核對本次寄送內容：\n'+r.month+'／'+e?.name+'\n收件人：'+e?.email+'\n'+reviewAmounts(legacyAmounts(r))+'\n確認寄送？'; }
  function slipReview(s:Slip) { return s.month+'／'+s.employee.name+'\n收件人：'+recipientOf(s)+'\n'+reviewAmounts(s.amounts); }
  async function save(){if(!editing)return;const result=await run({action:'saveSlip',slip:editing,expectedRevision:editing.revision});if(result){openedSignature.current=signature(result.slip);setEditing(result.slip);setInfo(result.slip.status==='confirmed'?'薪資已保存並納入小計。':'薪資已保存，請完成首次納入確認。');setMailState('NONE');}return result;}
  const saved=editing&&slips.find(s=>s.id===editing.id);
  const signature=(s:Slip)=>JSON.stringify([amountFields.map(k=>s.amounts[k]),attendanceFields.map(k=>s.attendance[k]),s.reviewedMonth,s.reason,s.note,s.periodStart,s.periodEnd,Object.keys(s.basis).sort().map(k=>[k,(s.basis as any)[k]])]);
  const dirty=!!editing&&(saved?signature(saved)!==signature(editing):signature(editing)!==openedSignature.current);
  const hasUnsavedChanges=!!editing&&['draft','confirmed'].includes(editing.status)&&signature(editing)!==openedSignature.current;
  async function transition(action:'confirm'|'void') {if(!editing)return;if(action==='confirm'&&dirty){setError('請先保存目前修改，再確認薪資。');return;}if(action==='void'){const status=await run({action:'mailStatus',id:editing.id});if(!status)return;const warnings=[...(['PENDING','PROCESSING','SUCCESS'].includes(status.state)?['這張薪資單已排程或寄出，信件無法收回；如果是金額有誤，請改用「建立更正」。']:[]),...(editing.replacesId&&editing.status==='confirmed'?['作廢這張更正單後，會恢復被它取代的原單。']:[])];if(warnings.length&&!window.confirm(warnings.join('\n')+'\n確定要作廢嗎？'))return;}const reason=action==='void'?window.prompt('請填作廢原因；原始紀錄仍保留。'):'';if(action==='void'&&!reason?.trim())return;if(action==='confirm'&&!window.confirm('確認此任職的到職日、待遇及計薪期間，首次納入薪資？後續月份保存後直接納入小計。'))return;const result=await run({action,id:editing.id,expectedRevision:editing.revision,reason});if(result){openedSignature.current=signature(result.slip);setEditing(result.slip);if(action==='confirm')setMailState('NONE');setInfo(action==='confirm'?'已完成首次納入薪資。':'薪資已作廢，原始紀錄保留。');}return result;}
  function revise(kind:'regular'|'supplement'='regular'){if(!editing||editing.status!=='confirmed')return;const draft:Slip={...editing,id:crypto.randomUUID(),revision:0,status:'draft',kind,relatedId:kind==='supplement'?editing.id:'',replacesId:kind==='regular'?editing.id:'',amounts:kind==='supplement'?emptyValues(amountFields):editing.amounts,attendance:kind==='supplement'?emptyValues(attendanceFields):editing.attendance,reason:'',reviewedMonth:false,createdAt:'',updatedAt:''};openedSignature.current=signature(draft);setEditing(draft);setMailState('NONE');}
  async function send(retry=false){
    if(!editing||!effectiveEditing||dirty){setError('請先保存修改；新進員工需完成首次納入。');return;}
    if(sendIssues.length){setError('不能寄送：'+sendIssues.join('；'));return;}
    if(!window.confirm('核對本次寄送內容：\n'+slipReview(editing)+'\n確認寄送？'))return;
    let current=editing;
    if(current.revision===0||current.status==='draft'){const result=await save();if(!result)return;if(signature(result.slip)!==signature(current)){setError('保存後內容有變更，請核對最新金額再寄送。');return;}current=result.slip;}
    const result=await run({action:'send',id:current.id,expectedRevision:current.revision,retry});
    if(result){setMailState(result.state);setInfo('已交寄送服務排程；不代表收件匣已收到。');}
  }
  async function checkMail(){if(!editing)return;const result=await run({action:'mailStatus',id:editing.id,expectedRevision:editing.revision});if(result)setMailState(result.state);}
  async function versions(){try{
    setHistory([]);setLegacyHistory([]);
    if(oldEditing){const result=await run({action:'legacyHistory',id:oldEditing.id});if(result)setLegacyHistory(result.history.sort((a:any,b:any)=>b.changedAt.localeCompare(a.changedAt)));}
    else if(editing && editing.revision>0){const docs=await getDocs(collection(db,'payrollSlips',editing.id,'versions'));setHistory(docs.docs.map(d=>d.data() as Slip).sort((a,b)=>b.revision-a.revision));}
    try{const users=await getDocs(collection(db,'users'));setHistoryUsers(Object.fromEntries(users.docs.map(d=>[d.id,String(d.data().name||'')])));}catch{setHistoryUsers({});}
  }catch(e:any){setError(e.message);}}
  function changedFromPrevious(e:Employee|undefined,periodId:string|undefined,m:string,a:Values){
    const p=e&&periods(e).find(p=>p.id===periodId);const previous=e&&p?previousPayroll(e,p,m,slips,legacy):null;
    if(!previous)return [];
    return [...['laborIns','healthIns','incomeTax','fullAttendance'].filter(k=>a[k]!==previous.amounts[k]),...(totals(a).net!==totals(previous.amounts).net?['net']:[])];
  }
  // Collects the month for the review table; nothing is saved or sent until executeBatch.
  async function prepareBatch(){
    setBatchNotice(null);
    const ready:BatchItem[]=[],blocked:BatchItem[]=[];let skipped=0;
    for(const row of rowsFor(month)){
      const e=employees.find(e=>e.id===row.sourceEmployeeId);
      if(row.legacyRecord){
        const r=row.legacyRecord;
        if(r.month<'2026-09')continue;
        if(r.isEmailSent||r.legacySeptemberMailId){skipped++;continue;}
        const issues=[...(row.warning?[row.warning]:[]),...(legacyNeedsEnrollment(r,employees,slips,legacy)?['待首次納入']:[]),...(!row.warning&&!legacyCanEdit(r,legacy,employees,slips)?['舊資料待核對']:[]),...legacyIssuesToSend(r)];
        const ps=e?periods(e).filter(p=>p.startDate<=monthEnd(month)&&(!p.endDate||p.endDate>=month+'-01')):[];
        const item:BatchItem={key:row.id,name:row.name,email:e?.email||'',amounts:legacyAmounts(r),changed:changedFromPrevious(e,ps.length===1?ps[0].id:undefined,month,legacyAmounts(r)),autoSave:false,issues,legacyRecord:r};
        (issues.length?blocked:ready).push(item);
      } else if(row.slip){
        const s=row.slip;
        if(!row.excluded&&s.revision>0){const status=await run({action:'mailStatus',id:s.id});if(!status)return;if(status.state!=='NONE'){skipped++;continue;}}
        const issues=[...(row.excluded?[s.status==='draft'?'待首次納入或待補齊資料':'未納入有效薪資']:[]),...slipSendIssues(s)];
        const item:BatchItem={key:row.id,name:row.name,email:recipientOf(s),amounts:s.amounts,changed:changedFromPrevious(e,s.employmentId,month,s.amounts),autoSave:s.revision===0||s.status==='draft',issues,slip:s};
        (issues.length?blocked:ready).push(item);
      } else blocked.push({key:row.id,name:row.name,email:e?.email||'',amounts:emptyValues(amountFields),changed:[],autoSave:false,issues:[row.reason||'待填當月資料']});
    }
    if(!ready.length&&!blocked.length){setBatchNotice({text:'本月沒有可新寄送的薪資單；已排程、已寄送及失敗待重試的單據不重複寄送。',failures:[]});return;}
    setBatchReview({ready,blocked,skipped});
  }
  async function sendBatchSlip(s:Slip){
    let id=s.id,revision=s.revision;
    if(s.revision===0||s.status==='draft'){
      const saved=await run({action:'saveSlip',slip:{...s,id:s.revision===0?(recurringIds.current[s.id]||(recurringIds.current[s.id]=crypto.randomUUID())):s.id},expectedRevision:s.revision});
      if(!saved)return undefined;
      if(totals(saved.slip.amounts).net!==totals(s.amounts).net){lastError.current='保存後金額有變更，請核對後再寄送';return undefined;}
      id=saved.slip.id;revision=saved.slip.revision;
    }
    return run({action:'send',id,expectedRevision:revision,retry:false});
  }
  // One failed slip must not stop the rest; every outcome is reported on the month page.
  async function executeBatch(){
    if(!batchReview)return;
    const {ready,blocked}=batchReview;setBatchReview(null);
    let completed=0;const failures=blocked.map(item=>item.name+'：'+item.issues.join('；'));
    for(const item of ready){
      lastError.current='';
      const result=item.legacyRecord?await run({action:'sendLegacySeptember',id:item.legacyRecord.id,expectedRevision:item.legacyRecord.legacySeptemberRevision||0,retry:false}):await sendBatchSlip(item.slip!);
      if(result)completed++;else failures.push(item.name+'：'+(lastError.current||'寄送失敗'));
    }
    setError('');
    setBatchNotice({text:'本次 '+completed+' 張薪資單已交寄送服務排程；不代表收件匣已收到。',failures});
  }
  return {openReason,legacyCanCorrect,legacyCorrecting,setLegacyCorrecting,recipientOf,batchReview,setBatchReview,batchNotice,setBatchNotice,prepareBatch,executeBatch,sendIssues,employees,legacy,slips,effectiveEditing,confirmLegacyEnrollment,isLegacyIncluded,canEdit,needsEnrollment,hasOtherPay,legacyHistory,ready,error,info,busy,dirty,hasUnsavedChanges,legacyEditable,dirtyLegacy,editing,setEditing,oldEditing,history,setHistory,historyUsers,mailState,rowsFor,flat,open,change,changeLegacy,saveLegacy,sendLegacy,checkLegacyMail,changePeriod,save,transition,revise,send,checkMail,versions};
}
