"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const html=read("index.html");
function section(start,end){
  const a=html.indexOf(start),b=html.indexOf(end,a);
  assert.ok(a>=0&&b>a);return html.slice(a,b);
}
function setup(){
  const today="2026-11-15",state={accounts:[{key:"checking",name:"Checking",type:"checking",balance:1000}],bills:[],settings:{},savingsGoals:[],budget:{spending:[]}};
  const dates=[],ctx={state,console,
    ymd:d=>d?d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"):today,
    dl:d=>d,money:n=>"$"+Number(n).toFixed(2),
    esc:v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),
    budgetCents:v=>Number.isFinite(Number(v))?Math.round(Math.max(0,Number(v))*100):0,
    budgetPlan:month=>{dates.push(month);return {limits:{cushion:month===today.slice(0,7)?50:900}}},
    budgetTotals:month=>{dates.push(month);return null},
    billForecastIncluded:b=>!b.excludeFromForecast,recordedBillSetup:b=>b.paymentSetup||"Unknown",
    incomeBefore:()=>0,transferableIncomeBeforeAccount:()=>0,expectedIncomeOccurrences:()=>[],
    accountStrategy:a=>a.strategy||"Standard",moneyCloudStatusText:()=>"",
    document:{readyState:"loading",getElementById:()=>null,createElement:()=>({}),head:{appendChild:()=>{}},addEventListener:()=>{}},
    render:()=>{},openBill:i=>{ctx.openedBill=i},openMoneyHubSection:()=>{},
    setTimeout:()=>{},BUDGET_CATEGORIES:[]
  };
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(section("function billReadiness(){","// Each occurrence remains"),ctx);
  vm.runInContext(section("function validBillDate(","function nextBillDate("),ctx);
  vm.runInContext(section("function moneyNextActionSummary(){","function openMoneyHubSection("),ctx);
  vm.runInContext(section("function accountSweepPlan(","function accountSortForBills("),ctx);
  vm.runInContext(read("budget-coach.js"),ctx);
  vm.runInContext(read("money-fix.js"),ctx);
  return {ctx,state,dates};
}
const bill=(name,due,amount,extra={})=>({name,due,amount,paymentAccountKey:"checking",status:"upcoming",...extra});

test("overdue and invalid bills stay reachable while paid and distant bills stay out of urgent actions",()=>{
  const {ctx,state}=setup();state.bills=[
    bill("Later","2027-06-01",2000),bill("Paid","2026-10-01",50,{status:"paid"}),
    bill("Overdue","2026-10-15",100),bill("No date","",20),bill("Wrong date","2026-11-31",25),
    bill("Excluded","2026-10-02",1000,{excludeFromForecast:true}),bill("Upcoming","2026-11-20",10)
  ];
  assert.deepEqual(Array.from(ctx.moneyBillActions(),a=>a.index),[2,3,4]);
  assert.equal(ctx.moneyNextActionSummary().index,2);
  ctx.moneyRunNextAction();assert.equal(ctx.openedBill,2);
  const card=ctx.moneyNextStepsCard();assert.match(card,/openBill\(2\)/);assert.match(card,/2 more money actions/);
  assert.doesNotMatch(card,/Later|Paid|Excluded/);
});
test("all remaining actions are accessible after the first, including more than five issues",()=>{
  const {ctx,state}=setup();state.bills=Array.from({length:12},(_,i)=>bill("Bill "+i,"2026-11-01",1));
  const card=ctx.moneyNextStepsCard();assert.match(card,/11 more money actions/);assert.match(card,/openBill\(11\)/);
});
test("known unassigned bills and overdue amounts reserve cash; incomplete setup prevents a spendable estimate",()=>{
  const {ctx,state}=setup();state.bills=[bill("Overdue","2026-11-01",100),bill("Unassigned","2026-11-20",200,{paymentAccountKey:""})];
  let x=ctx.safeToSpendSnapshot();assert.equal(x.reserved,300);assert.equal(x.safe,null);assert.equal(x.overdueCount,1);
  assert.match(ctx.safeToSpendCard(),/Needs review/);
  state.bills[1].paymentAccountKey="checking";x=ctx.safeToSpendSnapshot();assert.equal(x.safe,650);assert.equal(x.incomplete,false);
});
test("missing, invalid and unknown balances or bill details never become a confirmed zero",()=>{
  for(const value of [null,undefined,""," ","unknown",-5]){
    const {ctx,state}=setup();state.bills=[bill("Unknown amount","2026-11-20",value)];
    assert.equal(ctx.safeToSpendSnapshot().safe,null);assert.match(ctx.dueDateOutlookCard(),/Amount needed/);
    assert.doesNotMatch(ctx.dueDateOutlookCard(),/>on track</);
  }
  for(const value of [null,undefined,""," ","unknown"]){
    const {ctx,state}=setup();state.accounts.push({key:"other",type:"checking",balance:value});
    assert.equal(ctx.safeToSpendSnapshot().safe,null);
  }
  const {ctx,state}=setup();state.bills=[bill("Unknown date","",20)];assert.equal(ctx.safeToSpendSnapshot().safe,null);
});
test("a real zero is valid and decimal reserves use exact cents",()=>{
  const {ctx,state}=setup();state.bills=[bill("Zero","2026-11-20",0),bill("One","2026-11-20",.1),bill("Two","2026-11-20",.2)];
  const x=ctx.safeToSpendSnapshot();assert.equal(x.reserved,.3);assert.equal(x.safe,949.7);assert.equal(x.incomplete,false);
});
test("protected cash covers only its own funded bills, with the rest kept reserved",()=>{
  const {ctx,state}=setup();state.accounts.push({key:"protected",type:"savings",balance:300,protectFromSpending:true});
  state.bills=[bill("First","2026-11-20",200,{paymentAccountKey:"protected"}),bill("Second","2026-11-21",200,{paymentAccountKey:"protected"})];
  const x=ctx.safeToSpendSnapshot();assert.equal(x.total,1000);assert.equal(x.protectedTotal,300);assert.equal(x.reserved,100);assert.equal(x.safe,850);
});
test("viewing an old budget month cannot change today's cushion or coach plan",()=>{
  const {ctx,dates}=setup();ctx.budgetMonth="2026-09";
  assert.equal(ctx.safeToSpendSnapshot().cushion,50);
  ctx.budgetCoachSnapshot();assert.ok(dates.length>=3);assert.ok(dates.every(d=>d==="2026-11"));
});
test("incomplete data blocks savings allocation and positive transfer recommendations",()=>{
  const {ctx,state}=setup();state.savingsGoals=[{name:"Goal",target:500,allocated:0}];
  const x={safe:{safe:500,incomplete:true},totals:{left:50000},target:{name:"Savings"},movable:500,sourceRows:[],transferConfidence:"ready"};
  const plan=ctx.budgetCoachGoalPlan(x);assert.equal(plan.allocations.length,0);
  assert.equal(ctx.budgetCoachPrimaryAction(x,plan).tone,"review");
  ctx.moneyCloudStatusText=()=>"Cloud copy needs review";
  assert.equal(ctx.safeToSpendSnapshot().safe,null);
  x.safe.incomplete=false;assert.equal(ctx.budgetCoachPrimaryAction(x,plan).tone,"review");
});
test("a recorded cash gap remains visible even when spendable cash is clamped to zero",()=>{
  const {ctx,state}=setup();state.bills=[bill("Large bill","2026-11-20",1200)];
  const safe=ctx.safeToSpendSnapshot();assert.equal(safe.safe,0);assert.equal(safe.gap,250);
  assert.equal(ctx.budgetCoachPrimaryAction({safe},{allocations:[]}).tone,"stop");
});
test("required transfers and overdue bills do not receive an on-track badge",()=>{
  const {ctx,state}=setup();state.accounts[0].balance=100;
  state.accounts.push({key:"savings",type:"savings",name:"Savings",balance:500});
  state.bills=[bill("Transfer bill","2026-11-20",200)];
  assert.match(ctx.dueDateOutlookCard(),/Transfer needed/);assert.match(ctx.dueDateOutlookCard(),/1 to review/);
  assert.doesNotMatch(ctx.dueDateOutlookCard(),/>on track</);
  state.bills=[bill("Overdue","2026-11-01",10)];assert.match(ctx.dueDateOutlookCard(),/Overdue · review/);
});
test("overdue bills reduce proposed account sweeps before today's expected income",()=>{
  const {ctx,state}=setup();state.bills=[bill("Overdue","2026-11-01",300)];
  ctx.expectedIncomeOccurrences=()=>[{date:"2026-11-15",accountKey:"checking",amount:1000}];
  const x=ctx.accountSweepPlan(state.accounts[0]);assert.equal(x.requiredNow,300);assert.equal(x.excess,700);assert.equal(x.events[0].kind,"bill");
});
test("bill text is escaped and the calculations do not mutate saved records",()=>{
  const {ctx,state}=setup();state.bills=[bill('<img src=x onerror="alert(1)">',"2026-11-01",100)];
  const before=JSON.stringify(state);const cards=ctx.moneyNextStepsCard()+ctx.dueDateOutlookCard()+ctx.safeToSpendCard();
  assert.doesNotMatch(cards,/<img/);assert.match(cards,/&lt;img/);assert.equal(JSON.stringify(state),before);
});
