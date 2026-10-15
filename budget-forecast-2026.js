/* Advisory forecast only. Real budgets/bills live in private IndexedDB.
   No user's earnings, balances, bills or tax estimates are embedded as public defaults. */
(function(){
"use strict";
const KEY="dailyLifeBudgetForecast2026_v1";
const empty={monthlyIncome:null,ebt:null,rent:null,electric:null,water:null,insurance:null,phone:null,subscriptions:null,transport:null,groceriesCash:null,restaurants:null,shopping:null,householdOther:null,irregularReserve:null,peakWeekly:null,peakWeeks:8,otherMonthlyIncome:null,taxRefund:null,peakGoal:null};
const names={rent:"Rent",electric:"Electric",water:"Water reserve",insurance:"Insurance reserve",phone:"Phone plans",subscriptions:"Subscriptions",transport:"Fuel / transportation",groceriesCash:"Groceries (cash)",restaurants:"Dining / drinks",shopping:"Shopping",householdOther:"Household / children / other",irregularReserve:"Irregular bills reserve"};
const fields=Object.keys(names);
function num(v){return v===null||v===undefined||v===""?null:Number.isFinite(Number(v))?Math.max(0,Number(v)):null}
function cash(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)}
function esc(s){return String(s===null||s===undefined?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function privateStartingPoint(){
 const d={...empty};
 try{
  if(typeof budgetPlan!=="function")return d;
  const month=new Date().toISOString().slice(0,7),p=budgetPlan(month),limits=p&&p.limits||{};
  if(p.income!==null&&p.income!==undefined)d.monthlyIncome=num(p.income);
  if(p.ebt!==null&&p.ebt!==undefined)d.ebt=num(p.ebt);
  const mapping={transport:"transport",dining:"restaurants",grocery:"groceriesCash",household:"householdOther"};
  for(const [k,out] of Object.entries(mapping))if(limits[k]!==null&&limits[k]!==undefined)d[out]=num(limits[k]);
  const current=(state.bills||[]).find(b=>/^rent\b/i.test(String(b.name||""))&&String(b.due||"").slice(0,7)===month&&num(b.amount)!==null);
  if(current)d.rent=num(current.amount);
 }catch(_){}
 return d;
}
function read(){
 const initial=privateStartingPoint();
 try{const stored=JSON.parse(localStorage.getItem(KEY)||"null");return stored&&typeof stored==="object"&&!Array.isArray(stored)?{...initial,...stored}:{...initial}}
 catch(_){return {...initial}}
}
function assigned(d){return fields.filter(k=>num(d[k])!==null)}
function preview(d){
 const have=assigned(d),cost=have.reduce((a,k)=>a+Number(d[k]),0),complete=have.length===fields.length,inc=num(d.monthlyIncome),weeks=Math.max(1,num(d.peakWeeks)||8);
 const other=num(d.otherMonthlyIncome)||0,weekly=num(d.peakWeekly),peakCash=weekly===null?null:weekly*weeks+other*weeks/(52/12),peakExpense=cost*weeks/(52/12);
 return {cost,complete,inc,margin:complete&&inc!==null?inc-cost:null,weeks,peakCash,peakExcess:complete&&peakCash!==null?peakCash-peakExpense:null,missing:fields.length-have.length};
}
function input(k,label,d,step="1"){
 return '<label style="font-size:.8rem;min-width:0">'+esc(label)+'<input style="width:100%;box-sizing:border-box" type="number" min="0" step="'+esc(step)+'" inputmode="decimal" value="'+esc(d[k])+'" onchange="dailyLifeBudgetForecastSet(\''+k+'\',this.value)" placeholder="Not set"></label>';
}
function result(v,emptyLabel="Not yet calculated"){return v===null?esc(emptyLabel):cash(v)}
function render(){
 const d=read(),v=preview(d);
 const missing='<span class="muted small">'+v.missing+' spending target'+(v.missing===1?"":"s")+' still blank</span>';
 return '<section id="dl-budget-forecast" style="margin:16px 0;padding:14px;border:1px solid var(--border,#ccc);border-radius:18px;background:var(--card,#fff);color:var(--text,inherit)">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><h3 style="margin:0">🌈 Real-life money plan</h3><button type="button" class="btn small" onclick="dailyLifeBudgetForecastReset()">Reset to private budget</button></div>'+
 '<p class="muted small">Editable planning estimates stored on this device. Existing bills, transactions, savings goals and IndexedDB budget are not changed here. Blank values mean unknown, not $0.</p>'+
 '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0">'+
 '<div><small>Monthly cash income</small><b style="display:block">'+result(v.inc,"Enter income")+'</b></div>'+
 '<div><small>Monthly expense targets entered</small><b style="display:block">'+cash(v.cost)+'</b>'+(!v.complete?missing:"")+'</div>'+
 '<div><small>Monthly cash margin</small><b style="display:block;color:'+(v.margin===null?"inherit":v.margin<0?"#b33939":"#5b4664")+'">'+result(v.margin,"Complete the estimate")+'</b></div>'+
 '<div><small>EBT (separate from cash)</small><b style="display:block">'+result(num(d.ebt),"Not entered")+'</b></div></div>'+
 '<details><summary style="cursor:pointer;font-weight:700">Edit monthly spending targets</summary><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 0">'+
 fields.map(k=>input(k,names[k],d)).join('')+'</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">'+
 input("monthlyIncome","Monthly cash income",d)+input("ebt","Monthly EBT benefit",d)+'</div></details>'+
 '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Peak season + tax scenarios</summary><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0">'+
 input("peakWeekly","Weekly UPS take-home during peak",d)+input("peakWeeks","Peak weeks",d)+input("otherMonthlyIncome","Other monthly cash income during peak",d)+input("peakGoal","Savings target from peak",d)+input("taxRefund","Possible tax refund",d)+'</div>'+
 '<p><b>Peak-period cash after entered expenses:</b> '+result(v.peakExcess,"Complete spending and peak pay")+
 ' <small>(scenario only: '+v.weeks+' peak weeks; other income counts only when entered. This is not guaranteed savings and excludes unplanned costs and benefit changes.)</small></p>'+
 '<p><b>Peak savings target:</b> '+result(num(d.peakGoal),"Not set")+'</p>'+
 '<p><b>Tax refund estimate:</b> '+result(num(d.taxRefund),"Unknown")+' <small>(not counted toward available cash until received; verify after tax forms and credits are known)</small></p></details>'+
 '<p class="muted small" style="margin-bottom:0">For uneven utility, insurance and phone charges, use a planning reserve rather than treating one unusually large payment as the permanent monthly amount. A loan, mortgage grant, FSS escrow and future tax refund are never assumed spendable.</p></section>';
}
window.dailyLifeBudgetForecastHtml=render;
window.dailyLifeBudgetForecastSet=function(k,v){
 if(!(k in empty))return;
 const d=read();d[k]=num(v);
 localStorage.setItem(KEY,JSON.stringify(d));
 const el=document.getElementById("dl-budget-forecast");if(el)el.outerHTML=render();
};
window.dailyLifeBudgetForecastReset=function(){
 localStorage.removeItem(KEY);
 const el=document.getElementById("dl-budget-forecast");if(el)el.outerHTML=render();
};
})();