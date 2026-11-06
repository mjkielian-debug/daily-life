/* Daily Life Money clarity: summarize entered data, activity, and unknowns. */
(function(){
"use strict";
function moneyRecurringChargeSuggestions(){
 const tx=typeof cloudRecentTransactions!=="undefined"&&Array.isArray(cloudRecentTransactions)?cloudRecentTransactions:[],
  normalize=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim(),
  excluded=[...(state.bills||[]),...(state.settings?.bankExitPlans||[])].map(x=>normalize(x.name||x.renewalName)).filter(Boolean),
  groups=new Map(),today=ymd();
 for(const t of tx){
  const amount=Number(t.provider_amount||0),date=String(t.posted_date||""),name=String(t.merchant_name||"").trim();
  if(t.pending||t.is_transfer||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name)continue;
  if(typeof bankTransactionIsGenericAccountFee==="function"&&bankTransactionIsGenericAccountFee(t))continue;
  const key=normalize(name);if(key.length<3)continue;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);
 }
 const out=[];
 for(const [key,rows] of groups){
  if(rows.length<3||excluded.some(name=>name===key||name.includes(key)||key.includes(name)))continue;
  rows.sort((a,b)=>String(a.posted_date).localeCompare(String(b.posted_date)));
  const gaps=[];
  for(let i=1;i<rows.length;i++){
   const a=new Date(rows[i-1].posted_date+"T12:00:00"),b=new Date(rows[i].posted_date+"T12:00:00");
   gaps.push(Math.round((b-a)/86400000));
  }
  const sorted=gaps.slice().sort((a,b)=>a-b),gap=sorted[Math.floor(sorted.length/2)]||0;
  if(gap<27||gap>34||gaps.some(x=>x<24||x>38))continue;
  const amounts=rows.map(x=>Number(x.provider_amount||0)),low=Math.min(...amounts),high=Math.max(...amounts),variable=high-low>Math.max(4,high*.25);
  const latest=rows[rows.length-1],latestDate=String(latest.posted_date||"");
  const age=Math.round((new Date(today+"T12:00:00")-new Date(latestDate+"T12:00:00"))/86400000);if(!latestDate||latestDate>today||age>45)continue;
  const account=typeof cloudFinancialAccounts!=="undefined"&&Array.isArray(cloudFinancialAccounts)?cloudFinancialAccounts.find(a=>String(a.id)===String(latest.account_id||"")):null;
  const scheduledDate=new Date(latestDate+"T12:00:00"),scheduledDay=scheduledDate.getDate();scheduledDate.setDate(1);scheduledDate.setMonth(scheduledDate.getMonth()+1);scheduledDate.setDate(Math.min(scheduledDay,new Date(scheduledDate.getFullYear(),scheduledDate.getMonth()+1,0,12).getDate()));
  out.push({name:String(latest.merchant_name||latest.name||"Recurring payment"),count:rows.length,amount:Number(latest.provider_amount||0),low,high,variable,latestDate,nextDate:ymd(scheduledDate),account:account?(account.display_name||(account.account_subtype||"account")+(account.mask?" ••••"+account.mask:"")):"linked account"});
 }
 return out.sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).slice(0,5);
}
function moneyRecurringChargeCard(){
 const rows=moneyRecurringChargeSuggestions();if(!rows.length)return "";
 return '<div class="card money-recurring-charge-card"><div class="section-title"><div><div class="eyebrow">From posted bank history</div><h2>Possible monthly payments</h2></div><span class="tag">estimate</span></div>'+
 rows.map(x=>'<div class="row"><span><b>'+esc(x.name)+' · latest '+esc(money(x.amount))+'</b><div class="muted small">'+x.count+' monthly payments · last '+esc(dl(x.latestDate))+' · '+esc(x.account)+(x.variable?' · observed range '+esc(money(x.low))+'–'+esc(money(x.high)):'')+'</div></span><b>~'+esc(dl(x.nextDate))+'</b></div>').join("")+
 '<p class="muted small">Patterns and next dates are estimated from posted transactions. These are not confirmed bills and are excluded from bill totals and cash forecasts.</p></div>';
}
function moneyInsightCard(){
 const today=ymd(),end=new Date(today+"T12:00:00");end.setDate(end.getDate()+30);
 const through=ymd(end),cash=(state.accounts||[]).filter(a=>["checking","savings"].includes(String(a.type||"").toLowerCase())),
  knownCash=cash.filter(a=>a.balance!==null&&a.balance!==undefined&&a.balance!==""&&Number.isFinite(Number(a.balance))),
  cashTotal=knownCash.reduce((n,a)=>n+Number(a.balance),0),missing=cash.length-knownCash.length,balanceDates=knownCash.map(a=>String(a.balanceAsOf||"").slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort(),
  bills=(state.bills||[]).filter(b=>(typeof billForecastIncluded!=="function"||billForecastIncluded(b))&&b.status!=="paid"&&validBillDate(b.due)&&b.due>=today&&b.due<=through),
  knownBills=bills.filter(b=>b.amount!==null&&b.amount!==undefined&&b.amount!==""&&Number.isFinite(Number(b.amount))),
  unknownBills=bills.length-knownBills.length,billTotal=knownBills.reduce((n,b)=>n+Number(b.amount),0),
  renewal=(state.settings?.bankExitPlans||[]).find(p=>p.priority&&p.renewalName&&validBillDate(p.renewalDate)&&!["cancelled","not_renewing"].includes(String(p.subscriptionStatus||""))),
  renewalDate=renewal?new Date(renewal.renewalDate+"T12:00:00"):null,
  renewalIsEstimate=!!renewal&&(renewal.renewalDateEstimated===true||/estimated/i.test(String(renewal.notes||""))),
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
 (renewal?'<div class="notice money-renewal-estimate"><b>'+esc(renewal.renewalName)+(renewalIsEstimate?' · estimated renewal':' · renewal to review')+'</b><div>'+esc(renewal.renewalPaidAmount!=null?money(Number(renewal.renewalPaidAmount)):'Amount not recorded')+' · '+esc(renewalDate?renewalDate.toLocaleDateString():'date not recorded')+(renewal.renewalPaymentAccountLabel?' · charged to '+esc(renewal.renewalPaymentAccountLabel):'')+'</div><small>'+esc(renewal.subscriptionStatus==="decision_pending"?'Keep/cancel decision still pending.':'Renewal is recorded as active.')+' This estimate is separate from saved bill totals.</small></div>':'')+
 moneyRecurringChargeCard()+
 (categories.length?'<div class="money-clarity-categories"><b>Logged by category</b>'+categories.map(c=>'<div class="money-clarity-category"><span>'+esc(c.label)+'</span><b>'+esc(budgetMoney(c.spent))+(c.limit>0?' of '+esc(budgetMoney(c.limit)):'')+'</b></div>').join("")+'</div>':'')+
 '<p class="muted small">This summarizes what is entered. Missing balances and bill amounts stay marked unknown; expected income is not counted as cash already available.</p></div>';
}
window.moneyCloudStatusText=function(){
 const signedIn=typeof cloudUser==="function"&&!!cloudUser();
 const clientReady=typeof cloudClient!=="undefined"&&!!cloudClient;
 const pending=typeof cloudNeedsReview!=="undefined"&&!!cloudNeedsReview;
 const busy=typeof cloudBusy!=="undefined"&&!!cloudBusy;
 const error=typeof cloudError!=="undefined"&&!!cloudError;
 const synced=typeof cloudRemoteUpdatedAt!=="undefined"&&!!cloudRemoteUpdatedAt;
 if(!clientReady)return "Cloud status is unavailable. These totals only reflect information saved on this device.";
 if(!signedIn)return "This browser is signed out. These totals only reflect information saved on this device; your private cloud copy is not included.";
 if(error)return "Cloud data could not be confirmed. Treat missing balances and bills as unknown until sync is checked.";
 if(pending)return "Your cloud copy needs review. These totals may not include the latest saved budget.";
 if(busy)return "Cloud sync is in progress. These totals may not include the latest saved budget yet.";
 if(!synced)return "No cloud copy has been confirmed for this account. Missing budget details are not confirmed zeros.";
 return "";
};
window.moneyCloudStatusNote=function(){
 const message=window.moneyCloudStatusText();
 if(!message)return "";
 return '<div class="money-cloud-status" role="status"><b>Budget data status</b><span>'+esc(message)+'</span></div>';
};
if(!document.getElementById("moneyCloudStatusStyles")){const style=document.createElement("style");style.id="moneyCloudStatusStyles";style.textContent=".money-cloud-status{display:grid;gap:4px;padding:11px 13px;border:1px solid color-mix(in srgb,var(--accent) 45%,var(--border));border-radius:15px;background:color-mix(in srgb,var(--accent) 9%,var(--panel));font-size:.8rem;line-height:1.4}.money-cloud-status b{font-size:.82rem}.money-cloud-status span{color:var(--muted)}";document.head.appendChild(style)}
const previous=window.moneyTransfersCard;
if(typeof previous==="function")window.moneyTransfersCard=function(){return window.moneyCloudStatusNote()+moneyInsightCard()+previous.apply(this,arguments)};
if(!document.getElementById("moneyClarityStyles")){const style=document.createElement("style");style.id="moneyClarityStyles";style.textContent=".money-clarity-card{display:grid;gap:10px}.money-renewal-estimate{display:grid;gap:5px}.money-renewal-estimate small{display:block;color:var(--muted);font-size:.76rem}.money-clarity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.money-clarity-metric{display:grid;gap:4px;min-width:0;padding:10px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb,var(--panel) 88%,var(--primary) 12%)}.money-clarity-metric small,.money-clarity-metric span{color:var(--muted);font-size:.68rem;line-height:1.35}.money-clarity-metric b{font-size:1.02rem;overflow-wrap:anywhere}.money-clarity-categories{display:grid;gap:6px;padding-top:8px;border-top:1px solid var(--border)}.money-clarity-category{display:flex;justify-content:space-between;gap:8px;font-size:.78rem}.money-clarity-category b{text-align:right}@media(max-width:370px){.money-clarity-grid{grid-template-columns:1fr}}";document.head.appendChild(style)}
})();
/* Replace the compressed Money snapshot with explicit recorded, assigned, and unknown states. */
(function(){
 "use strict";
 const prior=window.moreView;
 if(typeof prior!=="function")return;
 window.moreView=function(){
  let html=prior.apply(this,arguments);
  if(typeof budgetTotals!=="function"||typeof budgetPlan!=="function"||typeof BUDGET_CATEGORIES==="undefined")return html;
  html=window.moneyCloudStatusNote()+html;
  const today=ymd(),month=today.slice(0,7),end=shiftDateString(today,30),totals=budgetTotals(month),plan=totals.plan||{},
   cashAccounts=(state.accounts||[]).filter(a=>["checking","savings"].includes(String(a.type||"").toLowerCase())),
   knownAccounts=cashAccounts.filter(a=>a.balance!==null&&a.balance!==undefined&&a.balance!==""&&Number.isFinite(Number(a.balance))),
   accountTotal=knownAccounts.reduce((n,a)=>n+Number(a.balance),0),
   monthBills=(state.bills||[]).filter(b=>(typeof billForecastIncluded!=="function"||billForecastIncluded(b))&&String(b.due||"").slice(0,7)===month),
   upcoming=(state.bills||[]).filter(b=>(typeof billForecastIncluded!=="function"||billForecastIncluded(b))&&b.status!=="paid"&&validBillDate(b.due)&&b.due>=today&&b.due<=end),
   upcomingKnown=upcoming.filter(b=>b.amount!==null&&b.amount!==undefined&&b.amount!==""&&Number.isFinite(Number(b.amount))),
   upcomingCents=upcomingKnown.reduce((n,b)=>n+budgetCents(b.amount),0),
   monthBillMissing=monthBills.some(b=>b.amount===null||b.amount===undefined||b.amount===""||!Number.isFinite(Number(b.amount))),
   enteredLimits=BUDGET_CATEGORIES.filter(c=>plan.limits&&plan.limits[c.id]!==null&&plan.limits[c.id]!==undefined&&plan.limits[c.id]!==""&&Number.isFinite(Number(plan.limits[c.id]))),
   assignedCents=enteredLimits.reduce((n,c)=>n+budgetCents(plan.limits[c.id]),0),
   cashLogs=(totals.logs||[]).filter(x=>x.category!=="ebt"),
   incomeMissing=plan.income===null||plan.income===undefined||plan.income==="",
   currentBalances=!cashAccounts.length?"Not entered":knownAccounts.length===cashAccounts.length?money(accountTotal):knownAccounts.length?money(accountTotal)+" known":"Balances not entered",
   balanceDetail=!cashAccounts.length?"No checking or savings accounts recorded":knownAccounts.length===cashAccounts.length?knownAccounts.length+" balance"+(knownAccounts.length===1?"":"s")+" recorded":knownAccounts.length+" of "+cashAccounts.length+" balances recorded",
   spendValue=cashLogs.length?budgetMoney(totals.spent):"No entries",
   spendDetail=cashLogs.length?cashLogs.length+" purchase"+(cashLogs.length===1?"":"s")+" logged this month":"No spending entries recorded this month",
   billValue=!upcoming.length?"No saved bills due":upcomingKnown.length===upcoming.length?budgetMoney(upcomingCents):budgetMoney(upcomingCents)+" known",
   billDetail=!upcoming.length?"Nothing recorded due in the next 30 days":upcoming.length+" bill"+(upcoming.length===1?"":"s")+" due · "+(upcoming.length-upcomingKnown.length?upcoming.length-upcomingKnown.length+" amount"+(upcoming.length-upcomingKnown.length===1?"":"s")+" missing":"all amounts entered"),
   assignedValue=enteredLimits.length?budgetMoney(assignedCents):"Not set",
   assignedDetail=enteredLimits.length+" of "+BUDGET_CATEGORIES.length+" category limits entered",
   monthlyBillCents=monthBills.reduce((n,b)=>n+budgetCents(b.amount),0),
   leftValue=incomeMissing?"Income not set":monthBillMissing?"Bill amounts needed":budgetMoney(totals.income-monthlyBillCents-assignedCents),
   leftDetail=incomeMissing?"Enter monthly cash income to calculate this":monthBillMissing?"A current-month bill has no recorded amount":"After saved bills and entered category amounts",
   incomeRows=expectedIncomeOccurrences(ymd(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0))).filter(x=>x.date>=today&&!/\b(ebt|snap|food benefit)\b/i.test(x.name||"")),
   incomeCents=incomeRows.reduce((n,x)=>n+Math.round(Number(x.amount||0)*100),0),
   incomeValue=incomeRows.length?budgetMoney(incomeCents):"None entered",
   incomeDetail=incomeRows.length?incomeRows.length+" expected cash deposit"+(incomeRows.length===1?"":"s"):"No expected cash deposits saved for the rest of this month",
   ebtUnset=(plan.ebt===null||plan.ebt===undefined||plan.ebt==="")&&(plan.ebtStart===null||plan.ebtStart===undefined||plan.ebtStart===""),
   ebtValue=ebtUnset?"Not set":budgetMoney(Math.max(0,totals.ebtAvailable)),
   ebtDetail="Kept separate from cash";
  const tile=(label,value,detail)=>'<div class="money-clarity-metric"><small>'+esc(label)+'</small><b>'+esc(value)+'</b><span>'+esc(detail)+'</span></div>';
  const grid='<div class="money-clarity-grid" aria-label="Recorded money, upcoming bills, and monthly assignments">'+
   tile("Checking + savings recorded",currentBalances,balanceDetail)+
   tile("Expected cash deposits",incomeValue,incomeDetail)+
   tile("Cash spending recorded",spendValue,spendDetail)+
   tile("Bills due in next 30 days",billValue,billDetail)+
   tile("Assigned to categories",assignedValue,assignedDetail)+
   tile("Cash left to assign",leftValue,leftDetail)+
   tile("EBT available",ebtValue,ebtDetail)+'</div>';
  const gridStart=html.indexOf('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin-top:12px">'),
        gridEnd=html.indexOf('<div class="muted small" style="margin-top:12px">',gridStart);
  if(gridStart>=0&&gridEnd>gridStart)html=html.slice(0,gridStart)+grid+html.slice(gridEnd);
  if(!incomeRows.length)html=html.replace(/(<div class="card budget-income-compact">[\s\S]*?<h2>)\$0\.00(<\/h2>[\s\S]*?<div class="muted small">)0 upcoming deposits/,"$1Not entered$2No expected cash deposits saved");
  if(ebtUnset){
   html=html.replace(/(<span>Starting balance \/ carryover<\/span><b>)[^<]*(<\/b><\/div>)/,"$1Not entered$2");
   html=html.replace(/(<span>Monthly benefit<\/span><b>)[^<]*(<\/b><\/div>)/,"$1Not entered$2");
   html=html.replace(/(<span>(?:Over available EBT|EBT available)<\/span><b[^>]*>)[^<]*(<\/b>)/,"$1Not calculated$2");
   html=html.replace(/<progress class="budget-progress [^"]*" max="100" value="[^"]+" aria-label="EBT spending" aria-valuetext="[^"]*">[^<]*<\/progress>/,'<p class="muted small">Enter a starting balance and monthly benefit to calculate EBT availability.</p>');
  }
  return html;
 };
})();
/* Distinguish missing Money mappings from a real zero balance. */
(function installMoneyAccountEmptyStates(){
  const priorAccounts=window.moneyAccountsCard;
  if(typeof priorAccounts==="function"){
    window.moneyAccountsCard=function(){
      let html=priorAccounts();
      const local=Array.isArray(state.accounts)?state.accounts:[];
      if(local.length)return html;
      const linked=typeof cloudFinancialAccounts!=="undefined"&&Array.isArray(cloudFinancialAccounts)?cloudFinancialAccounts:[];
      const cashLinked=linked.filter(a=>a.account_type==="depository"&&["checking","savings"].includes(String(a.account_subtype||"").toLowerCase())).length;
      const note=cashLinked
        ?'<div class="notice"><b>Synced accounts are available, but not mapped into Money yet.</b><div class="muted small">'+cashLinked+' checking or savings account(s) are connected. Review the list below and tap “Use in Money” only for accounts you still use; closed accounts stay out of your spending totals.</div></div>'
        :'<div class="notice"><b>No Money accounts are set up yet.</b><div class="muted small">Add an account or connect and map a checking or savings account before using balance-based estimates.</div></div>';
      return html.replace('<div class="notice">No accounts entered.</div>',note);
    };
  }
  const priorSafeCard=window.safeToSpendCard;
  if(typeof priorSafeCard==="function"){
    window.safeToSpendCard=function(){
      const local=Array.isArray(state.accounts)?state.accounts:[];
      const cash=local.filter(a=>["checking","savings"].includes(String(a.type||"").toLowerCase()));
      const known=cash.some(a=>a.balance!==null&&a.balance!==undefined&&a.balance!==""&&Number.isFinite(Number(a.balance)));
      if(known)return priorSafeCard();
      const linked=typeof cloudFinancialAccounts!=="undefined"&&Array.isArray(cloudFinancialAccounts)?cloudFinancialAccounts:[];
      const cashLinked=linked.filter(a=>a.account_type==="depository"&&["checking","savings"].includes(String(a.account_subtype||"").toLowerCase())).length;
      const detail=cashLinked
        ?cashLinked+' synced checking or savings account(s) are not counted until you map the accounts you still use in Accounts.'
        :'Add or map a checking or savings balance to calculate this. A missing balance should not look like $0.';
      return '<div class="card priority-card safe-spend"><div class="section-title"><div><div class="eyebrow">Available now</div><h2>Not calculated</h2></div><span class="tag">needs account setup</span></div><p class="muted small">'+esc(detail)+'</p><button class="btn" type="button" onclick="openMoneyHubSection(\'accounts\')">Review Money accounts</button></div>';
    };
  }
})();