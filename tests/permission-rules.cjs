const base = '/databases/(default)/documents';
function scenario(name, expectation, {role='intern',payroll=false,active=true,method='get',path='monthlySalaries/test',data={},existing,uid='test-uid'}={}) {
  const profile={userId:'employee',role,isActive:active,permissions:{clientTasks:role==='intern',payroll,mail:false,cash:false,clientData:false,manageTimesheets:false,canDeleteRecords:false}};
  return {name,testCase:{expectation,request:{auth:uid?{uid}:null,path:`${base}/${path}`,method,resource:{data}},...(existing?{resource:{data:existing}}:{}),functionMocks:[
    {function:'exists',args:[{exactValue:`${base}/googleUserProfiles/test-uid`}],result:{value:true}},
    {function:'get',args:[{exactValue:`${base}/googleUserProfiles/test-uid`}],result:{value:{data:profile}}},
  ]}};
}
const existing={name:'Test',role:'intern',permissions:{payroll:false,mail:true},googleUid:'target-uid',avatar:'old'};
const reviewNA={category:'帳務處理',workItem:'10月-覆核',clientId:'client',year:'115',status:'done',isNA:true,assigneeId:'',assigneeName:'',completionDate:'',entrySource:'assigned'};
const reviewDone={...reviewNA,isNA:false,assigneeId:'boss',assigneeName:'Boss',completionDate:'10/7',completedAt:'2026-10-07T10:00:00.000Z'};
module.exports=[
 scenario('granted intern can read payroll','ALLOW',{payroll:true}),
 scenario('revoked intern cannot read payroll','DENY'),
 scenario('granted trainee can read payroll','ALLOW',{role:'trainee',payroll:true}),
 scenario('disabled account cannot read payroll','DENY',{payroll:true,active:false}),
 scenario('signed-out account cannot read payroll','DENY',{uid:null}),
 scenario('boss retains payroll access','ALLOW',{role:'boss'}),
 scenario('supervisor retains payroll access','ALLOW',{role:'supervisor'}),
 scenario('supervisor can grant one permission preserving Google binding','ALLOW',{role:'supervisor',method:'update',path:'users/employee',existing,data:{...existing,permissions:{...existing.permissions,payroll:true}}}),
 scenario('supervisor can revoke one permission preserving other grants','ALLOW',{role:'supervisor',method:'update',path:'users/employee',existing:{...existing,permissions:{...existing.permissions,payroll:true}},data:existing}),
 scenario('intern cannot grant own permission','DENY',{method:'update',path:'users/employee',existing,data:{...existing,permissions:{payroll:true}}}),
 scenario('own avatar update remains allowed','ALLOW',{method:'update',path:'users/employee',existing,data:{...existing,avatar:'new'}}),
 scenario('intern cannot update another avatar','DENY',{method:'update',path:'users/other',existing,data:{...existing,avatar:'new'}}),
 scenario('frontend cannot write identity profile','DENY',{role:'supervisor',method:'update',path:'googleUserProfiles/test-uid',existing,data:{...existing,permissions:{payroll:true}}}),
 scenario('supervisor can mark accounting boss review N/A','ALLOW',{role:'supervisor',method:'create',path:'tasks/review',data:reviewNA}),
 scenario('supervisor can edit own N/A note','ALLOW',{role:'supervisor',method:'update',path:'tasks/review',existing:reviewNA,data:{...reviewNA,note:'不適用'}}),
 scenario('supervisor can reset accounting boss review N/A','ALLOW',{role:'supervisor',method:'delete',path:'tasks/review',existing:reviewNA}),
 scenario('supervisor cannot mark accounting boss review completed','DENY',{role:'supervisor',method:'create',path:'tasks/review',data:reviewDone}),
 scenario('supervisor cannot forge completion fields on N/A','DENY',{role:'supervisor',method:'create',path:'tasks/review',data:{...reviewNA,completedByName:'Supervisor'}}),
 scenario('supervisor cannot replace boss completion with N/A','DENY',{role:'supervisor',method:'update',path:'tasks/review',existing:reviewDone,data:reviewNA}),
 scenario('supervisor cannot delete boss completion','DENY',{role:'supervisor',method:'delete',path:'tasks/review',existing:reviewDone}),
 scenario('intern cannot mark accounting boss review N/A','DENY',{role:'intern',method:'create',path:'tasks/review',data:reviewNA}),
 scenario('boss can still complete accounting review','ALLOW',{role:'boss',method:'create',path:'tasks/review',data:reviewDone}),
 scenario('supervisor can still mark accounting check N/A','ALLOW',{role:'supervisor',method:'create',path:'tasks/check',data:{...reviewNA,workItem:'10月-檢核'}}),
];
