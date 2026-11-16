// Shared Money calculations and review queue. Private records stay in app state.
(function(){
  "use strict";
  const knownAmount=value=>value!==null&&value!==undefined&&String(value).trim()!==""&&Number.isFinite(Number(value));
  const billAmount=value=>knownAmount(value)&&Number(value)>=0;
  const cents=value=>Math.round(Number(value)*100);
  const protectedAccount=a=>!!a.protectFromSpending||a.key==="house_fund"||a.strategy==="Protected reserve";
  function throughDate(days){const date=new Date(ymd()+"T12:00:00");date.setDate(date.getDate()+days);return ymd(date);}

  window.moneyBillReviewRows=function(days=45){
    const through=throughDate(days);
    return billReadiness().filter(r=>r.bill.status!=="paid"&&(!validBillDate(r.bill.due)||r.bill.due<=through))
      .sort((a,b)=>{
        const rank=r=>!validBillDate(r.bill.due)?1:r.bill.due<ymd()?0:2;
        return rank(a)-rank(b)||String(a.bill.due||"").localeCompare(String(b.bill.due||""))||a.index-b.index;
      });
  };
  window.moneyBillActions=function(){
    const actions=[],today=ymd();
    for(const r of moneyBillReviewRows()){
      const b=r.bill,name=b.name||"Unnamed bill",validDate=validBillDate(b.due),due=validDate?dl(b.due):"date needed";
      let action;
      if(validDate&&b.due<today)action={kind:"overdue",title:"Review overdue "+name,detail:"Was due "+due+" · confirm whether it was paid; it is still recorded unpaid."};
      else if(!validDate||!billAmount(b.amount))action={kind:"setup",title:"Fix details for "+name,detail:!validDate?"A valid due date is needed.":"The bill amount is missing or invalid."};
      else if(r.status==="Transfer needed")action={kind:"transfer",title:transferInstruction(r)||("Move money for "+name),detail:name+" · due "+due};
      else if(r.status==="Projected short")action={kind:"short",title:"Short "+money(Math.max(0,-Number(r.projectedAfter||0))/100)+" for "+name,detail:"Needs attention by "+due};
      else if(r.status==="Needs account")action={kind:"setup",title:"Choose payment account",detail:name+" · due "+due};
      else if(r.status==="Balance unavailable")action={kind:"setup",title:"Update account balance",detail:name+" · due "+due};
      else if(["Check bill","Check earlier bill"].includes(r.status))action={kind:"setup",title:"Review bill details",detail:name+" · the projection needs review."};
      if(action)actions.push({...action,index:r.index});
    }
    return actions;
  };

  window.safeToSpendSnapshot=function(){
    const today=ymd(),through=throughDate(30),rows=moneyBillReviewRows(30);
    const accounts=(state.accounts||[]).filter(a=>["checking","savings"].includes(String(a.type||"").toLowerCase()));
    const cash=accounts.filter(a=>!protectedAccount(a)),protectedCash=accounts.filter(protectedAccount);
    const totalC=cash.filter(a=>knownAmount(a.balance)).reduce((sum,a)=>sum+cents(a.balance),0);
    const protectedC=protectedCash.filter(a=>knownAmount(a.balance)).reduce((sum,a)=>sum+cents(a.balance),0);
    const protectedRemaining=new Map(protectedCash.filter(a=>knownAmount(a.balance)).map(a=>[a.key,Math.max(0,cents(a.balance))]));
    let reservedC=0;
    for(const r of rows){
      if(!billAmount(r.bill.amount))continue;
      let amount=cents(r.bill.amount);
      // Only the funded portion of a bill assigned to protected cash can stay
      // outside the ordinary reserve. Unassigned bills still reserve their cost.
      if(r.account&&protectedRemaining.has(r.account.key)){
        const remaining=protectedRemaining.get(r.account.key),funded=Math.min(amount,remaining);
        amount-=funded;protectedRemaining.set(r.account.key,remaining-funded);
      }
      reservedC+=amount;
    }
    const issues=[];
    if(!cash.length)issues.push("Add an account available for everyday spending.");
    if(cash.some(a=>!knownAmount(a.balance)))issues.push("An everyday account balance is missing.");
    if(rows.some(r=>!billAmount(r.bill.amount)))issues.push("An unpaid bill amount is missing or invalid.");
    if(rows.some(r=>!validBillDate(r.bill.due)))issues.push("An unpaid bill needs a valid due date.");
    if(rows.some(r=>["Needs account","Balance unavailable","Check bill","Check earlier bill"].includes(r.status)))issues.push("Review the payment accounts and bill details.");
    const cloudStatus=typeof window.moneyCloudStatusText==="function"?window.moneyCloudStatusText():"";
    if(cloudStatus)issues.push(cloudStatus);
    const cushionC=budgetCents(budgetPlan(today.slice(0,7)).limits?.cushion),rawC=totalC-reservedC-cushionC,incomplete=issues.length>0;
    return {today,through,total:totalC/100,protectedTotal:protectedC/100,reserved:reservedC/100,cushion:cushionC/100,
      safe:incomplete?null:Math.max(0,rawC)/100,gap:Math.max(0,-rawC)/100,incomplete,issues,count:rows.length,
      overdueCount:rows.filter(r=>validBillDate(r.bill.due)&&r.bill.due<today).length};
  };
  window.safeToSpendCard=function(){
    const x=safeToSpendSnapshot();
    return `<div class="card priority-card safe-spend"><div class="section-title"><div><div class="eyebrow">After recorded bill reserves</div><h2>${x.incomplete?"Needs review":money(x.safe)}</h2></div><span class="tag">${x.incomplete?"incomplete details":"recorded balances"}</span></div>
      <div class="row"><span>Known everyday account balances</span><b>${money(x.total)}</b></div>
      ${x.protectedTotal?`<div class="row"><span>Protected / earmarked cash</span><b>${money(x.protectedTotal)}</b></div>`:""}
      <div class="row"><span>Known unpaid bills through ${esc(dl(x.through))}${x.overdueCount?" · includes overdue":""}</span><b>− ${money(x.reserved)}</b></div>
      <div class="row"><span>This month’s budget cushion</span><b>− ${money(x.cushion)}</b></div>
      ${x.gap?`<div class="row"><span>Gap in recorded cash before future deposits</span><b class="budget-negative">${money(x.gap)}</b></div>`:""}
      ${x.incomplete?'<div class="notice">'+x.issues.map(issue=>'<div>'+esc(issue)+'</div>').join("")+'</div><button class="btn" type="button" onclick="openMoneyHubSection(\'bills\')">Review bills</button><button class="btn" type="button" onclick="openMoneyHubSection(\'accounts\')">Review accounts</button>':""}
      <p class="muted small">Uses recorded balances and unpaid bills, including overdue bills and known amounts without a payment account. Future deposits are excluded. Protected cash stays separate; verify balances before spending.</p></div>`;
  };
})();

// Vehicle service duplicate cleanup
(function(){
  async function normalizeVehicleServiceDuplicates(){
    if(typeof state==="undefined"||!Array.isArray(state.vehicleServices))return false;
    const rows=state.vehicleServices,out=[];let changed=false;
    const fuel=x=>/fuel|gas/i.test(String(x?.type||""))||Number(x?.gallons||0)>0;
    const same=(a,b)=>{
      if(!fuel(a)||!fuel(b)||String(a.date||"")!==String(b.date||""))return false;
      const am=Number(a.mileage||0),bm=Number(b.mileage||0),ac=Number(a.cost||0),bc=Number(b.cost||0),ag=Number(a.gallons||0),bg=Number(b.gallons||0);
      if(am&&bm&&am!==bm)return false;
      if(ac&&bc&&Math.abs(ac-bc)>.01)return false;
      if(ag&&bg&&Math.abs(ag-bg)>.005)return false;
      return !!((am&&bm)||(ac&&bc)||(ag&&bg));
    };
    const richness=x=>["mileage","cost","gallons","tripMeter","notes","cloudEntryId"].reduce((n,k)=>n+(x?.[k]!==undefined&&x?.[k]!==null&&x?.[k]!==""?1:0),0)+(x?.fullTank?1:0);
    for(const row of rows){
      const i=out.findIndex(x=>same(x,row));
      if(i<0){out.push(row);continue}
      changed=true;
      const a=out[i],primary=richness(row)>richness(a)?row:a,other=primary===row?a:row,merged={...primary};
      for(const k of ["vehicleId","type","date","mileage","cost","gallons","tripMeter","fullTank","cloudEntryId","source","importedAt"])if((merged[k]===undefined||merged[k]===null||merged[k]==="")&&other?.[k]!==undefined)merged[k]=other[k];
      if(String(other?.notes||"").length>String(merged.notes||"").length)merged.notes=other.notes;
      out[i]=merged;
    }
    if(!changed)return false;
    state.vehicleServices=out;
    if(typeof dbSet==="function")await dbSet("state",state);
    if(typeof render==="function")render();
    return true;
  }
  const run=()=>setTimeout(()=>normalizeVehicleServiceDuplicates().catch(()=>{}),0);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
})();


/* Compact action-first Money surface. All review entry points use the same queue. */
(function compactMoneyActionSurface(){
  window.moneyNextStepsCard=function(){
    const actions=moneyBillActions(),first=actions[0];
    if(!first)return '<div class="card money-do-next"><div class="eyebrow">Do this next</div><h2>No bill action found</h2><div class="money-all-clear">No overdue or near-term issue was found in your recorded bills.</div><button class="btn" type="button" onclick="openBill()">Add a bill</button></div>';
    const row=a=>'<button type="button" class="money-action compact" onclick="openBill('+a.index+')"><span><b>'+esc(a.title)+'</b><small>'+esc(a.detail)+'</small></span><span>›</span></button>';
    return '<div class="card money-do-next"><div class="eyebrow">Do this next · overdue + next 45 days</div><button class="money-primary-action" type="button" onclick="openBill('+first.index+')"><span><b>'+esc(first.title)+'</b><small>'+esc(first.detail)+'</small></span><strong>Open ›</strong></button>'+
      (actions.length>1?'<details class="money-other-actions"><summary>'+ (actions.length-1)+' more money action'+(actions.length===2?'':'s')+'</summary>'+actions.slice(1).map(row).join('')+'</details>':'')+'</div>';
  };
  window.dueDateOutlookCard=function(){
    const all=moneyBillReviewRows(),rows=all.slice(0,8),today=ymd();
    if(!rows.length)return "";
    const ready=r=>validBillDate(r.bill.due)&&r.bill.due>=today&&["Covered now","Covered by due date"].includes(r.status);
    const covered=all.filter(ready).length,review=all.length-covered;
    return '<div class="card money-outlook-compact"><div class="section-title"><div><div class="eyebrow">Bill outlook · next 45 days + overdue</div><h2>'+covered+' of '+all.length+' projected covered</h2></div><span class="bill-status '+(review?'unknown':'covered')+'">'+(review?review+' to review':'on track')+'</span></div>'+
      rows.map(r=>{
        const b=r.bill,validDate=validBillDate(b.due),overdue=validDate&&b.due<today;
        const status=overdue?'Overdue · review':!validDate?'Date needed':r.status;
        const amount=b.amount!==null&&b.amount!==undefined&&String(b.amount).trim()!==""&&Number.isFinite(Number(b.amount))&&Number(b.amount)>=0?money(Number(b.amount)):'Amount needed';
        return '<button type="button" class="money-outlook-row" onclick="openBill('+r.index+')"><span><b>'+esc(b.name||'Unnamed bill')+'</b><small>'+esc(validDate?dl(b.due):'Due date needed')+' · '+esc(amount)+'</small></span><span class="bill-status '+(ready(r)?'covered':r.status==='Projected short'||overdue?'short':'unknown')+'">'+esc(status)+'</span></button>';
      }).join('')+(all.length>rows.length?'<p class="muted small">Showing '+rows.length+' of '+all.length+' bills. Open the full bill list below for the rest.</p>':'')+
      '<details class="reading-details"><summary>How this is calculated</summary><p class="muted small">Uses entered balances, earlier unpaid bills and expected income before each due date. A required transfer still needs action. Overdue entries need payment confirmation even when enough money is recorded.</p></details></div>';
  };
  window.moneyTransfersCard=function(){
    const coach=typeof budgetCoachCard==="function"?budgetCoachCard():"";
    const strategy=typeof accountStrategyCard==="function"?accountStrategyCard():"";
    return moneyNextStepsCard()+'<details class="money-more-details"><summary>Show balances, budget math + strategy</summary><div class="money-more-details-body">'+safeToSpendCard()+coach+strategy+'</div></details>';
  };
  if(!document.getElementById("compactMoneyActionStyles")){
    const style=document.createElement("style");style.id="compactMoneyActionStyles";
    style.textContent='.money-do-next{display:grid;gap:9px}.money-primary-action,.money-outlook-row{width:100%;border:1px solid color-mix(in srgb,var(--primary) 22%,var(--border));background:color-mix(in srgb,var(--panel) 94%,var(--primary) 6%);color:var(--text);border-radius:16px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;font:inherit}.money-primary-action span,.money-outlook-row span:first-child{display:grid;gap:3px}.money-primary-action b{font-size:.92rem}.money-primary-action small,.money-outlook-row small{font-size:.66rem;color:var(--muted);line-height:1.35}.money-primary-action strong{white-space:nowrap}.money-other-actions summary,.money-more-details summary{cursor:pointer;font-weight:800;font-size:.72rem;padding:10px 2px}.money-action.compact{width:100%;border:0;border-top:1px solid var(--border);background:transparent;color:var(--text);padding:10px 2px;display:flex;justify-content:space-between;text-align:left}.money-action.compact span:first-child{display:grid;gap:2px}.money-action.compact small{font-size:.64rem;color:var(--muted)}.money-outlook-compact{display:grid;gap:7px}.money-outlook-row{padding:9px 10px;border-radius:13px}.money-outlook-row .bill-status{flex:0 0 auto}';
    document.head.appendChild(style);
  }
  if(typeof render==="function")render();
})();
