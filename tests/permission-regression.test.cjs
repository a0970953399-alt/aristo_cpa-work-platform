const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function extract(file, names) {
  const text = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const declarations = [];
  function walk(node) {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) declarations.push(`const ${node.getText(ast)};`);
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.equal(declarations.length, names.length);
  return ts.transpileModule(declarations.join('\n') + `\nglobalThis.subject = {${names.join(',')}};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
const backend = extract('functions/src/index.ts', ['normalizeEmail','normalizePermissions','getGoogleUserProfilePayload','syncGoogleUserProfile']);
function profileSetup(source, previous = {}) {
  const writes = [];
  const profileDocs = { ...previous };
  const ref = (collection, id) => ({ collection, id });
  const context = {
    FieldValue: { serverTimestamp: () => 'SERVER_TIME' },
    db: {
      collection: collection => ({ doc: id => ref(collection, id) }),
      runTransaction: async callback => callback({
        get: async r => ({ id:r.id, ref:r, exists:r.collection==='users'?!!source:!!profileDocs[r.id], data:()=>r.collection==='users'?source:profileDocs[r.id] }),
        set: (r, data, options) => { writes.push({kind:'set',r,data,options}); profileDocs[r.id] = { ...profileDocs[r.id], ...data }; },
        delete: r => { writes.push({kind:'delete',r}); delete profileDocs[r.id]; },
      }),
    },
  };
  vm.runInNewContext(backend,context);
  return {...context.subject,writes,profileDocs};
}
const user = {name:'Test',role:'intern',googleUid:'uid',permissions:{payroll:false,mail:true}};
test('revocation explicitly clears old payroll grant and preserves other grants',async()=>{
  const s=profileSetup(user,{uid:{userId:'employee',permissions:{payroll:true,mail:true},unrelated:'keep'}});
  await s.syncGoogleUserProfile('employee',{...user,permissions:{payroll:true}});
  assert.equal(s.profileDocs.uid.permissions.payroll,false);
  assert.equal(s.profileDocs.uid.permissions.mail,true);
  assert.equal(s.profileDocs.uid.permissions.clientTasks,true);
  assert.equal(s.profileDocs.uid.unrelated,'keep');
  assert.ok(s.writes[0].options.mergeFields.includes('permissions'));
});
test('missing permission map means false, while intern base matrix permission remains',async()=>{
  const s=profileSetup({...user,permissions:undefined});await s.syncGoogleUserProfile('employee',user);
  assert.equal(s.profileDocs.uid.permissions.payroll,false);assert.equal(s.profileDocs.uid.permissions.clientTasks,true);
});
test('trainee missing permissions does not inherit intern matrix grant',async()=>{
  const s=profileSetup({...user,role:'trainee',permissions:undefined});await s.syncGoogleUserProfile('employee',user);
  assert.equal(s.profileDocs.uid.permissions.clientTasks,false);
});
test('delayed disabled event cannot delete a currently enabled account',async()=>{
  const s=profileSetup({...user,permissions:{payroll:true}},{uid:{userId:'employee'}});
  await s.syncGoogleUserProfile('employee',{...user,isActive:false});assert.equal(s.profileDocs.uid.permissions.payroll,true);
});
test('current disabled user has profile removed despite stale active event',async()=>{
  const s=profileSetup({...user,isActive:false},{uid:{userId:'employee'}});await s.syncGoogleUserProfile('employee',user);assert.equal(s.profileDocs.uid,undefined);
});
test('deleted source removes only its own previous profile',async()=>{
  const s=profileSetup(null,{uid:{userId:'employee'}});await s.syncGoogleUserProfile('employee',user);assert.equal(s.profileDocs.uid,undefined);
  const other=profileSetup(null,{uid:{userId:'another'}});await other.syncGoogleUserProfile('employee',user);assert.equal(other.profileDocs.uid.userId,'another');
});
test('rebind cleans old uid and derives new profile from latest source',async()=>{
  const s=profileSetup({...user,googleUid:'new'},{uid:{userId:'employee'}});await s.syncGoogleUserProfile('employee',user);assert.equal(s.profileDocs.uid,undefined);assert.equal(s.profileDocs.new.userId,'employee');
});

const handlerScript=extract('Dashboard.tsx',['handleToggleUserPermission']);
function handlerSetup(write,options={}){
  const errors=[],calls=[];
  const context={canManageUsers:options.manager!==false,UserRole:{INTERN:'intern'},navigator:{onLine:options.online!==false},permissionPendingRef:{current:new Set()},setPermissionPending:()=>{},setPermissionError:x=>errors.push(x),console:{error(){}},TaskService:{updateUserPermission:async(...args)=>{calls.push(args);await write?.();}}};
  vm.runInNewContext(handlerScript,context);return {...context,errors,calls,handler:context.subject.handleToggleUserPermission};
}
test('permission handler waits for acknowledgement and prevents repeat submission',async()=>{
  let done;const s=handlerSetup(()=>new Promise(resolve=>done=resolve));const pending=s.handler({id:'employee',role:'intern',permissions:{}},'payroll');
  await s.handler({id:'employee',role:'intern',permissions:{}},'payroll');assert.equal(s.calls.length,1);assert.equal(s.permissionPendingRef.current.size,1);done();await pending;assert.equal(s.permissionPendingRef.current.size,0);
});
test('failed permission write releases state and reports error for retry',async()=>{
  const s=handlerSetup(()=>Promise.reject(Error('denied')));await s.handler({id:'employee',role:'intern'},'payroll');assert.equal(s.permissionPendingRef.current.size,0);assert.ok(s.errors.at(-1).includes('失敗'));await s.handler({id:'employee',role:'intern'},'payroll');assert.equal(s.calls.length,2);
});
test('offline and non-manager requests do not write',async()=>{
  for(const options of [{online:false},{manager:false}]){const s=handlerSetup(null,options);await s.handler({id:'employee',role:'intern'},'payroll');assert.equal(s.calls.length,0);}
});

const serviceSource=fs.readFileSync('taskService.ts','utf8');
const serviceAst=ts.createSourceFile('taskService.ts',serviceSource,ts.ScriptTarget.Latest,true);
const serviceMethods=[];
function methods(node){if(ts.isMethodDeclaration(node)&&['updateUserPermission','updateUserAvatar','updateUserActive','saveUsers','syncUsersFromCloud','subscribeUsers'].includes(node.name.getText(serviceAst)))serviceMethods.push(node.getText(serviceAst));ts.forEachChild(node,methods);}methods(serviceAst);
const serviceScript=ts.transpileModule('globalThis.service={'+serviceMethods.join(',')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function serviceSetup(options={}){
 const writes=[],cache=[];let callback;
 const context={db:{},doc:(_,c,id)=>({c,id}),updateDoc:async(r,p)=>writes.push({r,p}),runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>options.exists!==false,data:()=>({role:'intern'})}),set:(r,p)=>writes.push({r,p}),update:(r,p)=>writes.push({r,p})}),mergeUsersWithDefaults:x=>options.color?x.map(u=>({...u,shiftColorHue:170})):x,localStorage:{setItem:(...a)=>cache.push(a)},USERS_STORAGE_KEY:'test',collection:()=>({}),getDocs:async()=>({docs:[]}),subscribeCollection:(_,mapper,cb)=>{callback=cb;return()=>{};}};
 vm.runInNewContext(serviceScript,context);return {service:context.service,writes,cache,emit:x=>callback(x)};
}
test('permission, avatar and active changes write only intended field of one user',async()=>{
 const s=serviceSetup();await s.service.updateUserPermission('employee','payroll',true);await s.service.updateUserAvatar('employee','new-avatar');await s.service.updateUserActive('employee',false);
 assert.deepEqual(s.writes.map(x=>Object.keys(x.p)),[['permissions.payroll'],['avatar'],['isActive']]);assert.ok(s.writes.every(x=>x.r.id==='employee'));
});
test('legacy list save cannot replay permissions or Google bindings',async()=>{
 const s=serviceSetup({exists:false});await s.service.saveUsers([{id:'employee',name:'Test',role:'intern',permissions:{payroll:true},googleUid:'stale',googleEmail:'stale',googleDisplayName:'stale'}]);assert.equal(s.writes.length,1);assert.equal(s.writes[0].p.permissions,undefined);assert.equal(s.writes[0].p.googleUid,undefined);
});
test('directory refresh performs no writes',async()=>{const s=serviceSetup();await s.service.syncUsersFromCloud();assert.equal(s.writes.length,0);});
test('color maintenance never writes cached permission or binding fields',async()=>{
 const s=serviceSetup({color:true});s.service.subscribeUsers(()=>{},()=>{});s.emit([{id:'employee',role:'intern',permissions:{payroll:true},googleUid:'stale'}]);await new Promise(r=>setImmediate(r));assert.equal(s.writes.length,1);assert.equal(s.writes[0].p.shiftColorHue,170);assert.ok(s.writes.every(x=>!('permissions'in x.p)&&!('googleUid'in x.p)));
});

test('payroll tab follows explicit grant; other roles and tabs retain behavior',()=>{
 const c={exports:{},require:()=>({UserRole:{BOSS:'boss',SUPERVISOR:'supervisor',INTERN:'intern'},TabCategory:{PAYROLL:'薪資計算',STOCK:'股票進銷存',ACCOUNTING:'帳務處理',TAX:'營業稅申報',INCOME_TAX:'所得扣繳',ANNUAL:'年度申報',SUBMISSION:'送件',CASH:'零用金/代墊款'}})};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('permissions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,c);
 const {canAccessTab}=c.exports;
 assert.equal(canAccessTab({role:'intern',permissions:{payroll:true}},'薪資計算'),true);
 assert.equal(canAccessTab({role:'intern',permissions:{payroll:false}},'薪資計算'),false);
 assert.equal(canAccessTab({role:'intern'},'帳務處理'),true);
 assert.equal(canAccessTab({role:'trainee'},'帳務處理'),false);
 for(const role of ['boss','supervisor'])assert.equal(canAccessTab({role},'薪資計算'),true);
 assert.equal(canAccessTab({role:'intern',permissions:{payroll:true}},'股票進銷存'),false);
});

test('legacy list save leaves every existing profile field untouched',async()=>{const s=serviceSetup();await s.service.saveUsers([{id:'employee',role:'intern',isActive:false,permissions:{payroll:true}}]);assert.equal(s.writes.length,0);});
