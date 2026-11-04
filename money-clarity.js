/* Daily Life Money clarity: summarize entered data, activity, and unknowns. */
(function(){
"use strict";
function moneyInsightCard(){
 const today=ymd(),end=new Date(today+"T12:00:00");end.setDate(end.getDate()+30);
 const through=ymd(end),cash=(state.accounts||[]).filter(a=>["checking","savings"].includes(String(a.type||"").toLowerCase())),
  knownCash=cash.filter(a=>a.balance!==null&&a.balance!==undefined&&a.balance!==""&&Number.isFinite(Number(a.balance))),
  cashTotal=knownCash.reduce((n,a)=>n+Number(a.balance),0),missing=cash.length-knownCash.length,balanceDates=knownCash.map(a=>String(a.balanceAsOf||"").slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort(),
  bills=(state.bills||[]).filter(b=>(typeof billForecastIncluded!=="function"||billForecastIncluded(b))&&b.status!=="paid"&&validBillDate(b.due)&&b.due>=today&&b.due<=through),
  knownBills=bills.filter(b=>b.amount!==null&&b.amount!==undefined&&b.amount!==""&&Number.isFinite(Number(b.amount))),
  unknownBills=bills.length-knownBills.length,billTotal=knownBills.reduce((n,b)=>n+Number(b.amount),0),
  month=today.slice(0,7),totals=typeof budgetTotals==="function"?budgetTotals(month):null,logs=totals?.logs||[],byCategory=new Map();
 if(Array.isArray(BUDGET_CATEGORIES)&&typeof budgetCents==="function")for(const c of BUDGET_CATEGORIES){
  const spent=logs.filter(x=>x.category===c.id&&c.id!=="ebt").reduce((n,x)=>n+budgetCents(x.amount),0);
  if(spent>0)byCategory.set(c.id,{label:c.label||c.name||c.id,spent,limit:budgetCents(totals?.plan?.limits?.[c.id])});
 }
 const categories=[...byCategory.values()].sort((a,b)=>b.spent-a.spent).slice(0,3),
  income=typeof expectedIncomeOccurrences==="function"?expectedIncomeOccurrences(through)[0]:null,
  cv=!cash.length?"Not set":money(cashTotal),
  cl=!cash.length?"No checking or savings accounts recorded":(missing?knownCash.length+" of "+cash.length+" balances entered":"Checking + savings balances entered")+(balanceDates.length?" · latest update "+dl(balanceDates[balanceDates.length-1]):" · balance dates not recorded"),
  sv=totals?budgetMoney(totals.spent):"Not available",
  sl=logs.length?logs.length+" spending entries logged this month":"No spending entries logged this month",
  bv=bills.length?money(billTotal):"No bills due",
  bl=bills.length?bills.length+" upcoming · "+(unknownBills?unknownBills+" amount"+(unknownBills===1?"":"s")+" missing":"all amounts entered"):"Next 30 days",
  iv=income?money(income.amount):"Not entered",
  il=income?income.name+" · "+dl(income.date)+(income.confidence==="estimate"?" · estimate":" · expected"):"No expected income entered";
 return '<div class="card money-clarity-card"><div class="section-title"><div><div class="eyebrow">Money at a glance · '+esc(new Date(month+"-01T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"}))+'</div><h2>What’s recorded right now</h2></div><span class="tag">Entered data</span></div>'+
 '<div class="money-clarity-grid">'+
 '<div class="money-clarity-metric"><small>Checking + savings</small><b>'+esc(cv)+'</b><span>'+esc(cl)+'</span></div>'+
 '<div class="money-clarity-metric"><small>Spending logged</small><b>'+esc(sv)+'</b><span>'+esc(sl)+'</span></div>'+
 '<div class="money-clarity-metric"><small>Bills due in 30 days</small><b>'+esc(bv)+'</b><span>'+esc(bl)+'</span></div>'+
 '<div class="money-clarity-metric"><small>Next expected income</small><b>'+esc(iv)+'</b><span>'+esc(il)+'</span></div></div>'+
 (categories.length?'<div class="money-clarity-categories"><b>Logged by category</b>'+categories.map(c=>'<div class="money-clarity-category"><span>'+esc(c.label)+'</span><b>'+esc(budgetMoney(c.spent))+(c.limit>0?' of '+esc(budgetMoney(c.limit)):'')+'</b></div>').join("")+'</div>':'')+
 '<p class="muted small">This summarizes what is entered. Missing balances and bill amounts stay marked unknown; expected income is not counted as cash already available.</p></div>';
}
const previous=window.moneyTransfersCard;
if(typeof previous==="function")window.moneyTransfersCard=function(){return moneyInsightCard()+previous.apply(this,arguments)};
if(!document.getElementById("moneyClarityStyles")){const style=document.createElement("style");style.id="moneyClarityStyles";style.textContent=".money-clarity-card{display:grid;gap:10px}.money-clarity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.money-clarity-metric{display:grid;gap:4px;min-width:0;padding:10px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb,var(--panel) 88%,var(--primary) 12%)}.money-clarity-metric small,.money-clarity-metric span{color:var(--muted);font-size:.68rem;line-height:1.35}.money-clarity-metric b{font-size:1.02rem;overflow-wrap:anywhere}.money-clarity-categories{display:grid;gap:6px;padding-top:8px;border-top:1px solid var(--border)}.money-clarity-category{display:flex;justify-content:space-between;gap:8px;font-size:.78rem}.money-clarity-category b{text-align:right}@media(max-width:370px){.money-clarity-grid{grid-template-columns:1fr}}";document.head.appendChild(style)}
})();