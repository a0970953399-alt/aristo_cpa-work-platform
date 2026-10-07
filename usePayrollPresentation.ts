import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { Client, Employee, MonthlySalaryRecord } from './types';
import { Slip, amountFields, attendanceFields, emptyValues, periods, basisAt, calculate, monthEnd, legacyIssues, legacyAmounts } from './functions/src/payrollDomain';

export const payrollStatus: Record<string, string> = {draft:'草稿',confirmed:'已確認',void:'已作廢',superseded:'已被更正取代'};
export type PayrollRow = Employee & { sourceEmployeeId: string; slip?: Slip; legacyRecord?: MonthlySalaryRecord; periodId?: string; recommendedStart?: string; recommendedEnd?: string; warning?: string; excluded?: boolean };
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
  const [mailState, setMailState] = useState('NONE');
  const lock = useRef(false);
  const pending = useRef<{body: any; operationId: string}|null>(null);
  useEffect(() => {
    pending.current=null; setLoaded({}); setError(''); setSlips([]); setLegacy([]); setEmployees([]); setEditing(null); setOldEditing(null);
    if (!clientId) return;
    const cleanups = ['employees','monthlySalaries','payrollSlips'].map(name => onSnapshot(query(collection(db,name),where('clientId','==',clientId)), snapshot => {
      const rows = snapshot.docs.map(d=>({...d.data(),id:d.id}));
      if(name==='employees') setEmployees((rows as Employee[]).filter(r=>r.temporaryPayrollHidden!==true));
      if(name==='monthlySalaries') setLegacy((rows as MonthlySalaryRecord[]).filter(r=>r.temporaryPayrollHidden!==true));
      if(name==='payrollSlips') setSlips(rows as Slip[]);
      setLoaded(prev=>({...prev,[name]:true}));
    }, e=>{setError('薪資資料讀取失敗：'+e.message);setLoaded(prev=>({...prev,[name]:false}));}));
    return ()=>cleanups.forEach(fn=>fn());
  },[clientId]);
  const ready = !!clientId && ['employees','monthlySalaries','payrollSlips'].every(k=>loaded[k]);
  async function run(body: any) {
    if(lock.current || !ready) return;
    lock.current=true; setBusy(true); setError(''); setInfo('');
    try {
      if(!pending.current || JSON.stringify(pending.current.body)!==JSON.stringify(body)) pending.current={body,operationId:crypto.randomUUID()};
      const result=await command({...body,clientId,operationId:pending.current.operationId});
      pending.current=null; return result.data;
    } catch(e:any){setError(e.message||'操作失敗，請重試');return undefined;}
    finally{lock.current=false;setBusy(false);}
  }
  function alias(e: Employee, id:string, type:string, start:string, end:string|null): PayrollRow {
    return {...e,id,sourceEmployeeId:e.id,employmentType:type as any,startDate:start,endDate:end||'',employmentHistory:[{id,type:type as any,startDate:start,endDate:end}]};
  }
  function rowsFor(m:string): PayrollRow[] {
    if(!ready) return [];
    const rows:PayrollRow[]=[];
    for(const e of employees) {
      const olds=legacy.filter(r=>r.employeeId===e.id&&r.month===m);
      const ss=slips.filter(s=>s.employeeId===e.id&&s.month===m&&s.status!=='void'&&s.status!=='superseded').sort((a,b)=>a.periodStart.localeCompare(b.periodStart)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
      for(const r of olds) rows.push({...e,id:'old:'+r.id,sourceEmployeeId:e.id,legacyRecord:r,warning:legacyIssues(r,legacy,employees).join('；'),excluded:legacyIssues(r,legacy,employees).length>0});
      for(const s of ss) rows.push({...alias(e,s.id,s.basis.employmentType,periods(e).find(p=>p.id===s.employmentId)?.startDate||e.startDate,periods(e).find(p=>p.id===s.employmentId)?.endDate||null),name:s.employee.name,empNo:s.employee.empNo,email:s.employee.email,idNumber:s.employee.idNumber||'',bankAccount:s.employee.bankAccount||'',defaultBaseSalary:s.basis.baseSalary,defaultFoodAllowance:s.basis.foodAllowance,compensationHistory:[],slip:s,excluded:s.status!=='confirmed'});
      if(olds.length) continue;
      for(const p of periods(e).filter(p=>p.startDate<=monthEnd(m)&&(!p.endDate||p.endDate>=m+'-01'))) {
        const start=p.startDate>m+'-01'?p.startDate:m+'-01'; const end=p.endDate&&p.endDate<monthEnd(m)?p.endDate:monthEnd(m);
        const nextDay=(d:string,offset:number)=>{const date=new Date(d+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);};
        const cuts=[...new Set([start,...(e.compensationHistory||[]).map(c=>c.effectiveDate).filter(d=>d>start&&d<=end)])].sort();
        for(let i=0;i<cuts.length;i++){
          let gaps=[{start:cuts[i],end:i+1<cuts.length?nextDay(cuts[i+1],-1):end}];
          for(const slip of ss.filter(s=>s.employmentId===p.id&&s.kind==='regular')) gaps=gaps.flatMap(g=>slip.periodStart>g.end||slip.periodEnd<g.start?[g]:[...(g.start<slip.periodStart?[{start:g.start,end:nextDay(slip.periodStart,-1)}]:[]),...(g.end>slip.periodEnd?[{start:nextDay(slip.periodEnd,1),end:g.end}]:[])]);
          for(const g of gaps) rows.push({...alias(e,'period:'+e.id+':'+p.id+':'+g.start,p.type,p.startDate,p.endDate),periodId:p.id,recommendedStart:g.start,recommendedEnd:g.end,excluded:true});
        }
      }
    }
    return rows;
  }
  function flat(row:PayrollRow) {
    if(row.slip) return {...row.slip.amounts,...row.slip.attendance,id:row.slip.id};
    if(row.legacyRecord) return {...row.legacyRecord,...legacyAmounts(row.legacyRecord)};
    try {const e=employees.find(e=>e.id===row.sourceEmployeeId)!;const p=periods(e).find(p=>p.id===row.periodId)!;const b=basisAt(e,p,row.recommendedStart||(p.startDate>month+'-01'?p.startDate:month+'-01'),row.recommendedEnd||(p.endDate&&p.endDate<monthEnd(month)?p.endDate:monthEnd(month)));return {...emptyValues(amountFields),...emptyValues(attendanceFields),baseSalary:b.employmentType==='full_time'?b.baseSalary:0,foodAllowance:b.foodAllowance};}
    catch{return {...emptyValues(amountFields),...emptyValues(attendanceFields)};}
  }
  function open(row:PayrollRow,m=month) {
    setError('');setInfo('');setHistory([]);setMailState('NONE');
    if(!ready) return;
    if(row.legacyRecord){setEditing(null);setOldEditing(row.legacyRecord);return;}
    if(row.slip){setOldEditing(null);setEditing(structuredClone(row.slip));return;}
    try{
      const e=employees.find(e=>e.id===row.sourceEmployeeId||e.id===row.id);
      if(!e) throw Error('找不到員工');
      if(legacy.some(r=>r.employeeId===e.id&&r.month===m)) throw Error('該月已有舊薪資，請先核對，避免重複結薪');
      const ps=periods(e).filter(p=>p.startDate<=monthEnd(m)&&(!p.endDate||p.endDate>=m+'-01'));
      const p=ps.find(p=>p.id===row.periodId)||ps[0];if(!p)throw Error('該月沒有有效任職期間');
      const start=row.recommendedStart||(p.startDate>m+'-01'?p.startDate:m+'-01'),end=row.recommendedEnd||(p.endDate&&p.endDate<monthEnd(m)?p.endDate:monthEnd(m));
      const basis=basisAt(e,p,start,end),amounts=emptyValues(amountFields); amounts.baseSalary=basis.employmentType==='full_time'?basis.baseSalary:0;amounts.foodAllowance=basis.foodAllowance;
      setOldEditing(null);setEditing({id:crypto.randomUUID(),schemaVersion:2,revision:0,clientId,employeeId:e.id,employmentId:p.id,month:m,periodStart:start,periodEnd:end,kind:'regular',relatedId:'',replacesId:'',status:'draft',basis,amounts,attendance:emptyValues(attendanceFields),employee:{name:e.name,email:e.email,empNo:e.empNo,idNumber:e.idNumber||'',bankAccount:e.bankAccount||''},company:{name:client!.fullName||client!.name,phone:client!.phone||'',address:client!.contactAddress||client!.regAddress||''},note:'',reason:'',reviewedMonth:false,createdAt:'',updatedAt:'',actor:''});
    }catch(e:any){setEditing(null);setOldEditing(null);setError(e.message);}
  }
  function change(k:string,value:string) {
    if(!editing||editing.status!=='draft'||busy)return;
    const n=Number(value)||0;
    try{let amounts={...editing.amounts};const attendance={...editing.attendance};
      if((attendanceFields as readonly string[]).includes(k)){attendance[k]=n;if(k==='workHours'&&editing.basis.employmentType==='part_time')amounts.baseSalary=n*editing.basis.baseSalary;amounts=calculate(editing.basis,attendance,amounts);}
      else amounts[k]=n;
      setEditing({...editing,amounts,attendance});
    }catch(e:any){setError(e.message);}
  }
  function changePeriod(id:string,start?:string,end?:string) {
    if(!editing||editing.revision>0||editing.status!=='draft')return;
    try{const e=employees.find(e=>e.id===editing.employeeId)!;const p=periods(e).find(p=>p.id===id)!;
      const a=start||(p.startDate>editing.month+'-01'?p.startDate:editing.month+'-01');const z=end||(p.endDate&&p.endDate<monthEnd(editing.month)?p.endDate:monthEnd(editing.month));
      const basis=basisAt(e,p,a,z);const amounts={...editing.amounts};if(id!==editing.employmentId){amounts.baseSalary=basis.employmentType==='full_time'?basis.baseSalary:0;amounts.foodAllowance=basis.foodAllowance;}
      setEditing({...editing,employmentId:id,periodStart:a,periodEnd:z,basis,amounts:calculate(basis,editing.attendance,amounts)});setError('');
    }catch(e:any){setError(e.message);}
  }
  async function save(){if(!editing)return;const result=await run({action:'saveSlip',slip:editing,expectedRevision:editing.revision});if(result){setEditing(result.slip);setInfo('草稿已保存，請核對後確認薪資。');}return result;}
  const saved=editing&&slips.find(s=>s.id===editing.id);
  const signature=(s:Slip)=>JSON.stringify([amountFields.map(k=>s.amounts[k]),attendanceFields.map(k=>s.attendance[k]),s.reviewedMonth,s.reason,s.note,s.periodStart,s.periodEnd,Object.keys(s.basis).sort().map(k=>[k,(s.basis as any)[k]])]);
  const dirty=!!editing&&(!saved||signature(saved)!==signature(editing));
  async function transition(action:'confirm'|'void') {if(!editing)return;if(action==='confirm'&&dirty){setError('請先保存目前修改，再確認薪資。');return;}const reason=action==='void'?window.prompt('請填作廢原因；原始版本仍保留。'):'';if(action==='void'&&!reason?.trim())return;if(action==='confirm'&&!window.confirm('確認金額與同月代扣已核對？確認不代表已付款。'))return;const result=await run({action,id:editing.id,expectedRevision:editing.revision,reason});if(result){setEditing(result.slip);setInfo(action==='confirm'?'薪資已確認。':'薪資已作廢，原始版本保留。');}return result;}
  function revise(kind:'regular'|'supplement'='regular'){if(!editing||editing.status!=='confirmed')return;setEditing({...editing,id:crypto.randomUUID(),revision:0,status:'draft',kind,relatedId:kind==='supplement'?editing.id:'',replacesId:kind==='regular'?editing.id:'',amounts:kind==='supplement'?emptyValues(amountFields):editing.amounts,attendance:kind==='supplement'?emptyValues(attendanceFields):editing.attendance,reason:'',reviewedMonth:false,createdAt:'',updatedAt:''});setMailState('NONE');}
  async function send(retry=false){if(!editing||editing.status!=='confirmed'){setError('只能寄送已確認並保存的薪資單版本。');return;}const result=await run({action:'send',id:editing.id,expectedRevision:editing.revision,retry});if(result){setMailState(result.state);setInfo('已交寄送服務排程；不代表收件匣已收到。');}}
  async function checkMail(){if(!editing)return;const result=await run({action:'mailStatus',id:editing.id,expectedRevision:editing.revision});if(result)setMailState(result.state);}
  async function versions(){if(!editing)return;try{const docs=await getDocs(collection(db,'payrollSlips',editing.id,'versions'));setHistory(docs.docs.map(d=>d.data() as Slip).sort((a,b)=>b.revision-a.revision));}catch(e:any){setError(e.message);}}
  async function batch(){const ss=slips.filter(s=>s.month===month&&s.status==='confirmed');if(!ss.length){setError('本月沒有已確認的新薪資單可寄送。');return;}if(!window.confirm(`寄送本月 ${ss.length} 張已確認薪資單？`))return;for(const s of ss){const r=await run({action:'send',id:s.id,expectedRevision:s.revision,retry:false});if(!r)return;}setInfo('本月已確認單據已交寄送服務排程。');}
  return {employees,legacy,slips,ready,error,info,busy,dirty,editing,setEditing,oldEditing,history,setHistory,mailState,rowsFor,flat,open,change,changePeriod,save,transition,revise,send,checkMail,versions,batch};
}
