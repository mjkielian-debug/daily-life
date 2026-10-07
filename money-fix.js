// Daily Life Money display hotfix: keep current-cash reserve separate from due-date projections.
(function(){
  const oldMoneyNextStepsCard=window.moneyNextStepsCard;
  window.safeToSpendSnapshot=function(){
    const today=ymd(),endDateObj=new Date(today+"T12:00:00");endDateObj.setDate(endDateObj.getDate()+30);const through=ymd(endDateObj);
    const allCash=(state.accounts||[]).filter(a=>["checking","savings"].includes(a.type)&&a.balance!==null&&a.balance!==""&&Number.isFinite(Number(a.balance)));
    const protectedCash=allCash.filter(a=>a.protectFromSpending||a.key==="house_fund");
    const cash=allCash.filter(a=>!a.protectFromSpending&&a.key!=="house_fund");
    const cashKeys=new Set(cash.map(a=>a.key));
    const total=cash.reduce((sum,a)=>sum+Number(a.balance||0),0);
    const protectedTotal=protectedCash.reduce((sum,a)=>sum+Number(a.balance||0),0);
    const rows=billReadiness().filter(r=>r.bill.status!=="paid"&&validBillDate(r.bill.due)&&r.bill.due>=today&&r.bill.due<=through);
    const reserved=rows.filter(r=>r.account&&cashKeys.has(r.account.key)).reduce((sum,r)=>{const amount=Number(r.bill.amount);return sum+(Number.isFinite(amount)&&amount>=0?amount:0)},0);
    const cushion=budgetCents(budgetPlan().limits?.cushion)/100;
    const raw=total-reserved-cushion;
    return{today,through,total,protectedTotal,reserved,cushion,safe:Math.max(0,raw),gap:Math.max(0,-raw),incomplete:rows.some(r=>["Needs account","Balance unavailable","Check bill","Check earlier bill"].includes(r.status)),count:rows.length};
  };
  window.safeToSpendCard=function(){
    const x=safeToSpendSnapshot();
    return `<div class="card priority-card safe-spend"><div class="section-title"><div><div class="eyebrow">🛡 Available now after near-term reserves</div><h2>${money(x.safe)}</h2></div><span class="tag">${x.incomplete?"provisional":"current cash"}</span></div><div class="row"><span>Spendable cash accounts</span><b>${money(x.total)}</b></div>${x.protectedTotal?`<div class="row"><span>Protected / earmarked cash</span><b>${money(x.protectedTotal)}</b></div>`:""}<div class="row"><span>Bills due in next 30 days</span><b>− ${money(x.reserved)}</b></div><div class="row"><span>Budget cushion</span><b>− ${money(x.cushion)}</b></div>${x.gap?`<div class="row"><span>Current-cash gap before future deposits</span><b class="budget-negative">${money(x.gap)}</b></div>`:""}<p class="muted small">Conservative current-cash view. Future deposits are not spent before they arrive. Use Due-date outlook for projected coverage that includes expected income and transfer timing.</p></div>`;
  };
  const moneyDateLabel=function(date){const x=new Date(date+"T12:00:00"),sameYear=x.getFullYear()===new Date().getFullYear();return x.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",...(sameYear?{}:{year:"numeric"})})};
  window.moneyNextStepsCard=function(){
    const today=ymd(),endObj=new Date(today+"T12:00:00");endObj.setDate(endObj.getDate()+45);const through=ymd(endObj);
    const all=billReadiness().filter(r=>r.bill.status!=="paid"&&validBillDate(r.bill.due)&&r.bill.due>=today&&r.bill.due<=through).slice(0,12),actions=[];
    for(const r of all){
      const b=r.bill,due=dl(b.due);
      if(r.status==="Transfer needed")actions.push({kind:"transfer",title:transferInstruction(r),detail:`${b.name} · due ${due}`,index:r.index});
      else if(r.status==="Projected short"){const short=Math.max(0,-Number(r.projectedAfter||0))/100;actions.push({kind:"short",title:`Still short ${money(short)} for ${b.name}`,detail:`Projected shortage by ${due} after earlier bills and expected income.`,index:r.index})}
      else if(r.status==="Needs account")actions.push({kind:"setup",title:`Choose a payment account for ${b.name}`,detail:`Due ${due} · Daily Life cannot project this bill until an account is assigned.`,index:r.index});
      else if(r.status==="Balance unavailable")actions.push({kind:"setup",title:`Update the balance used for ${b.name}`,detail:`Due ${due} · readiness needs a checking or savings balance.`,index:r.index});
      else if(r.status==="Check bill")actions.push({kind:"setup",title:`Check ${b.name} amount or due date`,detail:"The bill needs valid details before Daily Life can rely on the projection.",index:r.index});
    }
    const covered=all.filter(r=>["Covered now","Covered by due date"].includes(r.status)).length;
    return `<div class="card money-actions-card"><div class="section-title"><div><div class="eyebrow">Next steps · 45 days</div><h2>${actions.length?actions.length+" money action"+(actions.length===1?"":"s"):"Nothing urgent to move"}</h2></div><span class="tag">${covered} covered</span></div><div class="muted small">Only near-term bills appear here, so Daily Life does not tell you to move money months or years early.</div>${actions.length?actions.slice(0,7).map(a=>`<div class="money-action ${a.kind}" onclick="openBill(${a.index})"><div class="money-action-mark">${a.kind==="transfer"?"↔":a.kind==="short"?"!":"·"}</div><div class="grow"><b>${esc(a.title)}</b><div class="muted small">${esc(a.detail)}</div></div><span class="money-action-chevron">›</span></div>`).join(""):`<div class="money-all-clear">✦ No near-term transfer or setup action is needed from the bills currently entered.</div>`}</div>`;
  };
  window.dueDateOutlookCard=function(){
    const today=ymd(),rows=billReadiness().filter(r=>r.bill.status!=="paid"&&validBillDate(r.bill.due)&&r.bill.due>=today).slice(0,8);
    if(!rows.length)return"";
    const covered=rows.filter(r=>["Covered now","Covered by due date","Transfer needed"].includes(r.status)).length,
          short=rows.filter(r=>r.status==="Projected short").length;
    return `<div class="card"><div class="section-title"><div><div class="eyebrow">Due-date outlook</div><h2>${covered} of ${rows.length} upcoming bills currently covered</h2></div>${short?`<span class="bill-status short">${short} short</span>`:`<span class="bill-status covered">on track</span>`}</div><p class="muted small">This projection uses recorded balances plus expected income arriving on or before each bill date. It is different from Available now, which does not spend future deposits before they arrive.</p>${rows.map(r=>{const b=r.bill,totalIncome=expectedIncomeTotalBefore(b.due),cls=["Covered now","Covered by due date","Transfer needed"].includes(r.status)?"covered":r.status==="Projected short"?"short":"unknown",instruction=transferInstruction(r);return `<div class="row"><span><b>${esc(b.name)}</b><div class="muted small">Due ${esc(moneyDateLabel(b.due))} · ${money(Number(b.amount||0))} · expected income by then ${money(totalIncome)}</div>${instruction?`<div class="small"><b>${esc(instruction)}</b> by ${esc(moneyDateLabel(b.due))}.</div>`:""}</span><span class="bill-status ${cls}">${esc(r.status)}</span></div>`}).join("")}</div>`;
  };
  if(typeof render==="function")render();
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


/* Compact action-first Money surface. Keep explanation available, but out of the way. */
(function compactMoneyActionSurface(){
  function actionRows(){
    const today=ymd(),endObj=new Date(today+"T12:00:00");endObj.setDate(endObj.getDate()+45);const through=ymd(endObj),actions=[];
    for(const r of billReadiness().filter(x=>x.bill.status!=="paid"&&validBillDate(x.bill.due)&&x.bill.due>=today&&x.bill.due<=through)){
      const b=r.bill,due=dl(b.due);
      if(r.status==="Transfer needed")actions.push({kind:"transfer",title:transferInstruction(r)||("Move money for "+b.name),detail:b.name+" · due "+due,index:r.index});
      else if(r.status==="Projected short"){const short=Math.max(0,-Number(r.projectedAfter||0))/100;actions.push({kind:"short",title:"Short "+money(short)+" for "+b.name,detail:"Needs attention by "+due,index:r.index})}
      else if(r.status==="Needs account")actions.push({kind:"setup",title:"Choose payment account",detail:b.name+" · due "+due,index:r.index});
      else if(r.status==="Balance unavailable")actions.push({kind:"setup",title:"Update account balance",detail:b.name+" · due "+due,index:r.index});
      else if(r.status==="Check bill")actions.push({kind:"setup",title:"Fix bill details",detail:b.name+" · amount or due date needs review",index:r.index});
    }
    return actions;
  }
  window.moneyNextStepsCard=function(){
    const actions=actionRows(),first=actions[0];
    if(!first)return '<div class="card money-do-next"><div class="eyebrow">Do this next</div><h2>No money move needed</h2><div class="money-all-clear">✦ Your entered bills do not need a transfer or setup fix in the next 45 days.</div></div>';
    const rest=actions.slice(1,5);
    return '<div class="card money-do-next"><div class="eyebrow">Do this next</div><button class="money-primary-action" type="button" onclick="openBill('+first.index+')"><span><b>'+esc(first.title)+'</b><small>'+esc(first.detail)+'</small></span><strong>Open ›</strong></button>'+
      (rest.length?'<details class="money-other-actions"><summary>'+rest.length+' more money action'+(rest.length===1?'':'s')+'</summary>'+rest.map(a=>'<button type="button" class="money-action compact" onclick="openBill('+a.index+')"><span><b>'+esc(a.title)+'</b><small>'+esc(a.detail)+'</small></span><span>›</span></button>').join('')+'</details>':'')+
      '</div>';
  };
  window.dueDateOutlookCard=function(){
    const today=ymd(),rows=billReadiness().filter(r=>r.bill.status!=="paid"&&validBillDate(r.bill.due)&&r.bill.due>=today).slice(0,8);
    if(!rows.length)return "";
    const covered=rows.filter(r=>["Covered now","Covered by due date","Transfer needed"].includes(r.status)).length,
          short=rows.filter(r=>r.status==="Projected short").length;
    return '<div class="card money-outlook-compact"><div class="section-title"><div><div class="eyebrow">Bill outlook</div><h2>'+covered+' of '+rows.length+' covered</h2></div><span class="bill-status '+(short?'short':'covered')+'">'+(short?short+' short':'on track')+'</span></div>'+
      rows.map(r=>{const b=r.bill,cls=["Covered now","Covered by due date","Transfer needed"].includes(r.status)?"covered":r.status==="Projected short"?"short":"unknown",instruction=typeof transferInstruction==="function"?transferInstruction(r):"";return '<button type="button" class="money-outlook-row" onclick="openBill('+r.index+')"><span><b>'+esc(b.name)+'</b><small>'+esc(dl(b.due))+' · '+money(Number(b.amount||0))+(instruction?' · '+esc(instruction):'')+'</small></span><span class="bill-status '+cls+'">'+esc(r.status)+'</span></button>'}).join('')+
      '<details class="reading-details"><summary>How this is calculated</summary><p class="muted small">Uses entered balances, earlier unpaid bills, enabled expected income before each due date, and any needed transfer support.</p></details></div>';
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
