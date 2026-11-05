const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),cp=require('node:child_process');
const repo=path.resolve(__dirname,'..'),ts=require(path.join(repo,'node_modules/typescript'));
function load(file,imports={}){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(repo,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:n=>imports[n],Intl,Date});return exports;}
const domain=load('functions/src/payrollDomain.ts');
const display=load('payrollDisplay.ts',{'./functions/src/payrollDomain':domain});
const employee={id:'e',employmentType:'full_time',startDate:'2026-01-01',endDate:'2026-12-31'};
test('departure is effective after the last working day, including legacy employee data',()=>{
 assert.equal(display.isEmployeeResigned(employee,'2026-10-12'),false);
 assert.equal(display.isEmployeeResigned(employee,'2026-12-31'),false);
 assert.equal(display.isEmployeeResigned(employee,'2027-01-01'),true);
});
test('rehire, employment gaps and future joining dates use actual periods',()=>{
 const e={...employee,employmentHistory:[{id:'a',type:'full_time',startDate:'2026-01-01',endDate:'2026-03-31'},{id:'b',type:'part_time',startDate:'2026-10-01',endDate:null}]};
 assert.equal(display.isEmployeeResigned(e,'2026-04-01'),true);
 assert.equal(display.isEmployeeResigned(e,'2026-10-01'),false);
 assert.equal(display.isEmployeeResigned({...employee,startDate:'2026-12-01',endDate:''},'2026-10-12'),false);
 assert.equal(display.isEmployeeResigned({...employee,endDate:''},'2026-10-12'),false);
});
test('Taiwan date crosses midnight independently of the host timezone',()=>{
 assert.equal(display.taiwanToday(new Date('2026-10-12T15:59:59Z')),'2026-10-12');
 assert.equal(display.taiwanToday(new Date('2026-10-12T16:00:00Z')),'2026-10-13');
});
test('insurance displays labor, health, both, neither and zero brackets without changing the snapshot',()=>{
 for(const [labor,health,label] of [[true,false,'30,300 (勞)'],[false,true,'30,300 (健)'],[true,true,'30,300 (勞健)'],[false,false,'未投保']]){
  const b={hasLaborIns:labor,hasHealthIns:health,insuranceBracket:30300};const before=JSON.stringify(b);assert.equal(display.insuranceLabel(b),label);assert.equal(JSON.stringify(b),before);
 }
 assert.equal(display.insuranceLabel({hasLaborIns:true,hasHealthIns:false,insuranceBracket:0}),'0 (勞)');
});
const baseline=cp.execFileSync('git',['show','19426ce:PayrollView.tsx'],{cwd:repo,encoding:'utf8'});
const current=fs.readFileSync(path.join(repo,'PayrollView.tsx'),'utf8');
function layout(source){const ast=ts.createSourceFile('PayrollView.tsx',source.replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes=[];
 function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const attrs={};for(const a of n.attributes.properties)if(ts.isJsxAttribute(a)&&['className','style','width','height','colSpan','rowSpan'].includes(a.name.text))attrs[a.name.text]=a.initializer?.getText(ast);nodes.push({tag:n.tagName.getText(ast),attrs});}ts.forEachChild(n,visit);}visit(ast);return nodes;}
test('monthly and annual table layout retain the approved baseline while editor workflow changes',()=>{
 const tables=s=>s.slice(s.indexOf('{/* 📍 標籤二'),s.indexOf('{/* 🚀 薪資編輯'));
 // The per-row mail state and the smaller insurance label are the only approved additions.
 const approved=s=>s.replace(/\{\(\(\)=>\{const state=payroll\.monthMail[^\n]*\n/,'\n').replace('p-3 text-center text-xs font-bold text-teal-700','p-3 text-center font-bold text-teal-700');
 assert(tables(current).length>10000);assert.deepEqual(layout(approved(tables(current))),layout(tables(baseline)));
});
test('legacy saves still carry the revision and original record used to reject stale writes',()=>{
 const newHook=fs.readFileSync(path.join(repo,'usePayrollPresentation.ts'),'utf8').replaceAll('\r\n','\n');
 const logic=newHook.slice(newHook.indexOf('  async function saveLegacy'),newHook.indexOf('  async function sendLegacy'));
 assert(logic.includes('expectedRevision:oldSaved.legacySeptemberRevision||0,expected:oldSaved'));
});

test('employee import validates rows, skips duplicates and supplies backend defaults',()=>{let n=0;const header=['序號','身分','姓名','信箱','到職日','離職日','身分證','分行','帳號','地址'];const existing=[{id:'x',clientId:'c1',name:'既有',startDate:'2026-01-01',idNumber:'A123456789'},{id:'y',clientId:'c2',name:'別家',startDate:'2026-01-01',idNumber:'B123456789'}];
 const r=display.parseEmployeeImport([header,['1','正職','新人','a@b.co','2026/1/5','','C123456789','','',''],['2','兼職','工讀','','2026-02-01'],[],['','','',' '],['3','正職','','a@b.co','2026-01-01'],['4','正職','壞日期','bad','2026-13-01'],['5','正職','早離職','','2026-03-01','2026-02-01'],['6','正職','同證','','2026-04-01','','a123456789'],['7','正職','既有','','2026-01-01'],['8','正職','別家','','2026-05-01','','B123456789'],['9','正職','檔內重複','','2026-06-01','','C123456789']],existing,'c1',()=>'id'+(++n));
 assert.deepEqual([...r.ready.map(e=>e.name)],['新人','工讀','別家']);assert.equal(r.duplicates.length,3);assert.equal(r.errors.length,3);assert.match(r.errors[0],/缺少姓名/);assert.match(r.errors[1],/到職日.*信箱/);assert.match(r.errors[2],/離職日/);
 const first=r.ready[0];assert.equal(first.startDate,'2026-01-05');assert.equal(first.insuranceBracket,0);assert.equal(first.hasLaborIns,true);assert.equal(first.employmentHistory[0].endDate,null);assert.equal(r.ready[1].employmentType,'part_time');assert.equal(r.ready[1].employmentHistory[0].type,'part_time');assert.equal(first.compensationHistory.length,0);});

test('employees sort employed first, then full-time, then number',()=>{const period=(type,endDate=null)=>[{id:'p',type,startDate:'2026-01-01',endDate}];const list=[{name:'離職',empNo:'1',employmentType:'full_time',employmentHistory:period('full_time','2026-02-01')},{name:'兼二',empNo:'2',employmentType:'part_time',employmentHistory:period('part_time')},{name:'正三',empNo:'3',employmentType:'full_time',employmentHistory:period('full_time')},{name:'正二',empNo:'2',employmentType:'full_time',employmentHistory:period('full_time')}];assert.deepEqual(display.sortEmployees(list,'2026-11-05').map(e=>e.name).join(),'正二,正三,兼二,離職');assert.equal(list[0].name,'離職');});

test('the payroll page no longer subscribes to every client employee or unused records',()=>{const view=fs.readFileSync(path.join(repo,'PayrollView.tsx'),'utf8');assert(!view.includes('subscribeEmployees'));assert(!view.includes('subscribePayrollRecords'));assert(!view.includes('isAddingNewMonthly'));assert(!view.includes("toISOString().split('T')[0]"));});
