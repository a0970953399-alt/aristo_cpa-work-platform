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
 assert(tables(current).length>10000);assert.deepEqual(layout(tables(current)),layout(tables(baseline)));
});
test('deferred Excel import and legacy concurrency write logic remain unchanged',()=>{
 const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a))).replaceAll('\r\n','\n');
 assert.equal(section(current,'  const handleImportEmpExcel','  useEffect(() => {'),section(baseline,'  const handleImportEmpExcel','  useEffect(() => {'));
 const oldHook=cp.execFileSync('git',['show','19426ce:usePayrollPresentation.ts'],{cwd:repo,encoding:'utf8'}),newHook=fs.readFileSync(path.join(repo,'usePayrollPresentation.ts'),'utf8');
 const logic=s=>section(s,'  async function saveLegacy','  async function sendLegacy').replace(/setInfo\('[^']*'\)/g,'setInfo(message)');
 assert.equal(logic(newHook),logic(oldHook));
});
