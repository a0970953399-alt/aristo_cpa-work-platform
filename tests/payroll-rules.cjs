const base = '/databases/(default)/documents';
function scenario(name, expectation, {role='intern',payroll=false,active=true,method='get',path='monthlySalaries/test',data={},existing,uid='test-uid'}={}) {
  const profile={userId:'employee',role,isActive:active,permissions:{clientTasks:role==='intern',payroll,mail:false,cash:false,clientData:false,manageTimesheets:false,canDeleteRecords:false}};
  return {name,testCase:{expectation,request:{auth:uid?{uid}:null,path:`${base}/${path}`,method,resource:{data}},...(existing?{resource:{data:existing}}:{}),functionMocks:[
    {function:'exists',args:[{exactValue:`${base}/googleUserProfiles/test-uid`}],result:{value:true}},
    {function:'get',args:[{exactValue:`${base}/googleUserProfiles/test-uid`}],result:{value:{data:profile}}},
  ]}};
}
const cases=[];
for(const path of ['employees/e1','monthlySalaries/old','payrollSlips/s1','payrollSlips/s1/versions/1','payrollDispatch/s1_2']) {
  cases.push(scenario('authorized read '+path,'ALLOW',{payroll:true,path}));
  cases.push(scenario('revoked read '+path,'DENY',{path}));
  for(const method of ['create','update','delete']) cases.push(scenario('direct '+method+' denied '+path,'DENY',{role:'boss',path,method,data:{clientId:'c1'},existing:{clientId:'c1'}}));
}
for(const path of ['mail/new','payrollOperations/op']) cases.push(scenario('direct queue or operation forgery denied '+path,'DENY',{role:'boss',path,method:'create',data:{}}));
module.exports=cases;
