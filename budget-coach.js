/* Daily Life — budget coaching helpers.
   This file contains generic calculation/display logic only. It never embeds user balances. */

function budgetCoachRepeatPurchases(limit=3){
  const windowDays=120,today=ymd(),todayTime=new Date(today+"T12:00:00").getTime(),
        rows=[...(state?.budget?.spending||[])].filter(x=>{
          const d=String(x?.date||"");
          if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
          const age=(todayTime-new Date(d+"T12:00:00").getTime())/86400000;
          return age>=0&&age<=windowDays&&String(x.note||"").trim().length>=3&&x.category!=="ebt"&&Number(x.amount||0)>0;
        }),
        groups=new Map();
  for(const x of rows){
    const name=String(x.note||"").trim(),key=name.toLowerCase().replace(/\s+/g," ");
    if(!key)continue;
    const g=groups.get(key)||{name,count:0,total:0,categories:new Set(),dates:[],amounts:[]};
    const amount=Math.max(0,Number(x.amount||0));
    g.count+=1;g.total+=amount;g.categories.add(x.category);g.dates.push(String(x.date));g.amounts.push(amount);groups.set(key,g);
  }
  return [...groups.values()].filter(x=>x.count>=2).map(g=>{
    const uniqueDates=[...new Set(g.dates)].sort(),
          gaps=[];
    for(let i=1;i<uniqueDates.length;i++){
      const a=new Date(uniqueDates[i-1]+"T12:00:00"),b=new Date(uniqueDates[i]+"T12:00:00"),
            days=Math.round((b-a)/86400000);
      if(days>0)gaps.push(days);
    }
    const average=g.count?g.total/g.count:0,
          avgGapDays=gaps.length?gaps.reduce((sum,n)=>sum+n,0)/gaps.length:null,
          gapSpread=gaps.length>1?Math.sqrt(gaps.reduce((sum,n)=>sum+Math.pow(n-avgGapDays,2),0)/gaps.length):null,
          cadenceVariation=avgGapDays&&gapSpread!==null?gapSpread/avgGapDays:null,
          cadenceStable=g.count>=3&&gaps.length>=2&&avgGapDays>=5&&avgGapDays<=120&&cadenceVariation!==null&&cadenceVariation<=.55,
          estimatedOrdersPerYear=avgGapDays?Math.max(1,Math.min(365,Math.round(365/avgGapDays))):null,
          annualizedSpend=g.total*(365/windowDays),
          lastDate=uniqueDates[uniqueDates.length-1]||"",
          nextLikelyDate=avgGapDays&&lastDate?shiftDateString(lastDate,Math.max(1,Math.round(avgGapDays))):"";
    return {...g,average,categories:[...g.categories],uniqueDates,gaps,avgGapDays,cadenceVariation,cadenceStable,estimatedOrdersPerYear,annualizedSpend,lastDate,nextLikelyDate,windowDays};
  }).sort((a,b)=>{
    if(a.cadenceStable!==b.cadenceStable)return a.cadenceStable?-1:1;
    return b.count-a.count||b.annualizedSpend-a.annualizedSpend;
  }).slice(0,limit);
}

function budgetCoachRepeatDetail(r){
  const bits=[`Logged ${r.count} time${r.count===1?"":"s"} in about ${r.windowDays||120} days`];
  if(r.avgGapDays)bits.push(`about every ${Math.max(1,Math.round(r.avgGapDays))} days`);
  bits.push(`average ${money(r.average)}`);
  if(Number.isFinite(r.annualizedSpend)&&r.annualizedSpend>0)bits.push(`roughly ${money(r.annualizedSpend)}/year at this observed pace`);
  return bits.join(" · ");
}

function budgetCoachBalanceAgeDays(account){
  if(!account?.balanceAsOf)return null;
  const t=new Date(account.balanceAsOf).getTime();
  if(!Number.isFinite(t))return null;
  return Math.max(0,(Date.now()-t)/86400000);
}

function budgetCoachFutureBillPlans(limit=5){
  const today=ymd(),start=new Date(today+"T12:00:00").getTime();
  return (state.bills||[]).map(b=>{
    if(b.status==="paid"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(b.due||"")))return null;
    const frequency=typeof recordedBillFrequency==="function"?recordedBillFrequency(b):String(b.frequency||"");
    if(!["Annual","Irregular","One-time"].includes(frequency))return null;
    const amount=Number(b.amount||0),dueTime=new Date(b.due+"T12:00:00").getTime();
    if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(dueTime))return null;
    const daysUntil=Math.ceil((dueTime-start)/86400000);
    if(daysUntil<=14||daysUntil>550)return null;
    const goal=(state.savingsGoals||[]).find(g=>!g.done&&String(g.sourceBillId||"")===String(b.id||""))||null,
          earmarked=Math.max(0,Number(goal?.allocated||0)),
          remaining=Math.max(0,amount-earmarked),
          months=Math.max(1,daysUntil/30.4375),
          weeks=Math.max(1,daysUntil/7);
    return {bill:b,frequency,amount,daysUntil,goal,earmarked,remaining,monthly:remaining/months,weekly:remaining/weeks};
  }).filter(Boolean)
    .sort((a,b)=>a.daysUntil-b.daysUntil||b.amount-a.amount)
    .slice(0,limit);
}

async function createBillSavingsGoal(billId){
  const bill=(state.bills||[]).find(b=>String(b.id||"")===String(billId||""));
  if(!bill)return;
  const existing=(state.savingsGoals||[]).find(g=>!g.done&&String(g.sourceBillId||"")===String(bill.id||""));
  if(existing){openSavingsGoal(existing.id);return}
  const preferred=(state.accounts||[]).find(a=>a.type==="savings"&&accountStrategy(a)==="Interest-first savings")||null,
        goal={
          id:uid(),name:(bill.name||"Future bill")+" set-aside",target:Math.max(0,Number(bill.amount||0)),allocated:0,
          targetDate:String(bill.due||""),accountKey:preferred?.key||"",priority:2,
          notes:"Set aside for "+(bill.name||"bill")+" due "+String(bill.due||"")+". This bucket does not move money automatically.",
          done:false,sourceBillId:bill.id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
        };
  state.savingsGoals=state.savingsGoals||[];
  state.savingsGoals.push(goal);
  await save();render();
}

function budgetCoachFutureBillsSection(x){
  const rows=x.futureBills||[];
  if(!rows.length)return"";
  return `<div class="coach-subsection"><details class="compact-more coach-future-bills"><summary>Future bills to pre-fund · ${rows.length}</summary><div class="coach-plan-list">${rows.map(r=>`<div class="coach-future-bill"><span class="grow"><b>${esc(r.bill.name||"Future bill")}</b><small>${esc(r.frequency)} · due ${esc(dl(r.bill.due))} · ${money(r.remaining)} still to prepare</small><small>About ${money(r.monthly)}/month · ${money(r.weekly)}/week from now to the due date</small></span><button class="btn small ${r.goal?"":"primary"}" type="button" onclick="${r.goal?`openSavingsGoal('${r.goal.id}')`:`createBillSavingsGoal('${r.bill.id}')`}">${r.goal?"Open bucket":"Create bucket"}</button></div>`).join("")}</div><div class="muted small">These are planning buckets only. Creating one does not transfer money, and bill-readiness remains a separate calculation.</div></details></div>`;
}

function budgetCoachSnapshot(){
  const safe=typeof safeToSpendSnapshot==="function"
    ? safeToSpendSnapshot()
    : {safe:0,incomplete:true,horizon:"",reserved:0,cushion:0};
  const totals=typeof budgetTotals==="function"?budgetTotals():null;
  const cash=(state.accounts||[]).filter(a=>
    ["checking","savings"].includes(a.type)&&
    a.balance!==null&&a.balance!==""&&Number.isFinite(Number(a.balance))&&
    !a.protectFromSpending&&a.key!=="house_fund"
  );
  const target=[...cash]
    .filter(a=>a.type==="savings")
    .sort((a,b)=>{
      const ap=accountStrategy(a)==="Interest-first savings"?0:1;
      const bp=accountStrategy(b)==="Interest-first savings"?0:1;
      return ap-bp||String(a.name||"").localeCompare(String(b.name||""));
    })[0]||null;

  const sourceRows=cash
    .filter(a=>a.type==="checking"&&a.key!==target?.key&&accountStrategy(a)!=="Protected reserve")
    .map(a=>{
      const plan=typeof accountSweepPlan==="function"?accountSweepPlan(a,45):null,
            balanceAgeDays=budgetCoachBalanceAgeDays(a),
            synced=!!a.syncSource,
            staleSynced= synced&&balanceAgeDays!==null&&balanceAgeDays>3,
            missingSyncDate=synced&&balanceAgeDays===null,
            needsFloor=accountStrategy(a)==="Deposit landing checking"&&Math.max(0,Number(a.minimumOperatingBalance||0))<=0;
      return {account:a,plan,amount:Math.max(0,Number(plan?.excess||0)),balanceAgeDays,synced,staleSynced,missingSyncDate,needsFloor};
    })
    .filter(x=>x.amount>=0)
    .sort((a,b)=>b.amount-a.amount);

  const movable=target?sourceRows.reduce((sum,x)=>sum+x.amount,0):0,
        monthRemaining=totals?Number(totals.remaining||0)/100:null,
        categoryStatus=(totals?BUDGET_CATEGORIES.map(cat=>{
          const limit=budgetCents(totals.plan?.limits?.[cat.id]),
                spent=(totals.logs||[]).filter(x=>x.category===cat.id).reduce((sum,x)=>sum+budgetCents(x.amount),0),
                left=limit-spent,
                used=limit>0?Math.round(spent*100/limit):0;
          return {cat,limit,spent,left,used};
        }):[]),
        assignedSpendableCents=categoryStatus.filter(x=>x.cat.id!=="cushion").reduce((sum,x)=>sum+x.limit,0),
        cashFlexibleSpentCents=totals?(totals.logs||[]).filter(x=>x.category!=="ebt"&&x.category!=="cushion").reduce((sum,x)=>sum+budgetCents(x.amount),0):0,
        categoryPlanRemaining=assignedSpendableCents>0
          ?Math.min(Math.max(0,(assignedSpendableCents-cashFlexibleSpentCents)/100),Math.max(0,monthRemaining||0))
          :Math.max(0,monthRemaining||0),
        guardrailUsesCategories=assignedSpendableCents>0,
        daysLeft=totals?Math.max(0,Number(totals.daysLeft||0)):0,
        weeklyPlan=totals&&daysLeft?categoryPlanRemaining*7/daysLeft:null,
        dailyPlan=totals&&daysLeft?categoryPlanRemaining/daysLeft:null,
        currentSafe=Math.max(0,Number(safe.safe||0)),
        todayGuardrail=dailyPlan===null?currentSafe:Math.min(currentSafe,dailyPlan),
        weekGuardrail=weeklyPlan===null?currentSafe:Math.min(currentSafe,weeklyPlan),
        unassignedPlanCash=totals?Math.max(0,Number(totals.left||0)/100):0,
        over=categoryStatus.filter(x=>x.limit>0&&x.left<0).sort((a,b)=>a.left-b.left),
        nearLimit=categoryStatus.filter(x=>x.cat.id!=="cushion"&&x.limit>0&&x.left>=0&&x.used>=80).sort((a,b)=>b.used-a.used||a.left-b.left),
        repeats=budgetCoachRepeatPurchases(),
        futureBills=budgetCoachFutureBillPlans(),
        transferIssues=[];
  if(safe.incomplete)transferIssues.push("Some bill/account setup is incomplete, so the bill reserve may change.");
  const movableSources=sourceRows.filter(r=>r.amount>0);
  if(movableSources.some(r=>r.needsFloor))transferIssues.push("A deposit-landing checking account has no minimum operating balance set.");
  if(movableSources.some(r=>r.staleSynced))transferIssues.push("At least one synced checking balance is more than 3 days old.");
  if(movableSources.some(r=>r.missingSyncDate))transferIssues.push("At least one synced checking balance has no last-updated time.");
  if(target&&accountStrategy(target)!=="Interest-first savings")transferIssues.push("The destination savings account is not marked as the preferred Interest-first savings account.");
  const transferConfidence=transferIssues.length?"review":"ready";

  return {safe,totals,target,sourceRows,movable,monthRemaining,weeklyPlan,dailyPlan,todayGuardrail,weekGuardrail,categoryStatus,assignedSpendableCents,cashFlexibleSpentCents,categoryPlanRemaining,guardrailUsesCategories,unassignedPlanCash,over,nearLimit,repeats,futureBills,transferIssues,transferConfidence};
}

function budgetCoachGoalPlan(x){
  const planUnassigned=x.totals?Math.max(0,Number(x.totals.left||0)/100):0,
        currentSafe=Math.max(0,Number(x.safe.safe||0)),
        assignNow=Math.min(planUnassigned,currentSafe),
        later=Math.max(0,planUnassigned-assignNow),
        goals=[...(state.savingsGoals||[])]
          .filter(g=>!g.done)
          .map(g=>({...g,gap:Math.max(0,Number(g.target||0)-Number(g.allocated||0))}))
          .filter(g=>g.gap>0)
          .sort((a,b)=>Number(a.priority||99)-Number(b.priority||99)||String(a.targetDate||"9999").localeCompare(String(b.targetDate||"9999"))),
        allocations=[];
  let remaining=assignNow;
  for(const goal of goals){
    if(remaining<=0)break;
    const amount=Math.min(remaining,goal.gap);
    if(amount>0){allocations.push({goal,amount});remaining-=amount}
  }
  return {planUnassigned,assignNow,later,allocations,unallocatedAfterGoals:remaining,goals};
}

function budgetCoachCategoryGuide(x,limit=4){
  if(!x.totals)return[];
  const days=Math.max(1,Number(x.totals.daysLeft||1)),weeks=Math.max(1,days/7);
  return (x.categoryStatus||[])
    .filter(r=>r.limit>0&&r.left>0)
    .map(r=>({...r,monthLeft:r.left/100,weeklyLeft:(r.left/100)/weeks,used:r.limit?Math.round(r.spent*100/r.limit):0}))
    .sort((a,b)=>b.used-a.used||a.left-b.left)
    .slice(0,limit);
}

function budgetCoachActionList(x,goalPlan){
  const actions=[];
  if(Number(x.safe.safe||0)<0){
    actions.push({mark:"1",title:"Protect bills first",detail:`Pause optional spending until the entered cash shortfall of ${money(Math.abs(Number(x.safe.safe||0)))} is covered.`});
  }
  if(x.over.length){
    const r=x.over[0];
    actions.push({mark:String(actions.length+1),title:`Ease up on ${r.cat.name}`,detail:`This category is already ${money(Math.abs(r.left)/100)} over its monthly limit.`});
  }else if(x.nearLimit?.length){
    const r=x.nearLimit[0],days=Math.max(1,Number(x.totals?.daysLeft||1)),weeks=Math.max(1,days/7),
          weekly=Math.max(0,r.left/100)/weeks;
    actions.push({mark:String(actions.length+1),title:`Stretch the rest of ${r.cat.name}`,detail:`${money(Math.max(0,r.left)/100)} remains for this month — about ${money(weekly)}/week across the remaining plan.`});
  }
  if(x.target&&x.movable>0){
    const ready=x.transferConfidence==="ready";
    actions.push({mark:String(actions.length+1),title:ready?`Move extra checking cash to ${x.target.name||"savings"}`:`Review before moving ${money(x.movable)} to savings`,detail:ready?`Up to ${money(x.movable)} is above the 45-day bill/floor needs currently entered for checking.`:`The math found excess checking cash, but ${x.transferIssues.length} setup/freshness check${x.transferIssues.length===1?"":"s"} should be resolved first.`});
  }
  if(goalPlan.allocations.length){
    const first=goalPlan.allocations[0];
    actions.push({mark:String(actions.length+1),title:`Fund ${first.goal.name||"your top savings goal"} next`,detail:`Based on the goal priority you set, ${money(first.amount)} of currently safe, unassigned planned cash can be earmarked there now.`});
  }else if(goalPlan.planUnassigned>0&&goalPlan.goals.length===0){
    actions.push({mark:String(actions.length+1),title:"Give unassigned money a purpose",detail:`${money(goalPlan.planUnassigned)} of the monthly plan is not assigned to a category or savings goal yet.`});
  }
  const nextFuture=(x.futureBills||[]).find(r=>!r.goal&&r.remaining>0&&r.daysUntil<=180);
  if(nextFuture){
    actions.push({mark:String(actions.length+1),title:`Start setting aside for ${nextFuture.bill.name||"a future bill"}`,detail:`About ${money(nextFuture.monthly)}/month from now would prepare the remaining ${money(nextFuture.remaining)} by ${dl(nextFuture.bill.due)}.`});
  }
  if(x.repeats.length){
    const r=x.repeats[0],cadence=r.cadenceStable&&r.avgGapDays?` about every ${Math.max(1,Math.round(r.avgGapDays))} days`:"";
    actions.push({mark:String(actions.length+1),title:`Price-check ${r.name}`,detail:`This spending label repeats${cadence}. Compare unit price, bulk, store brand, and subscription price before buying it again.`});
  }
  if(!actions.length){
    actions.push({mark:"✓",title:"Stay with the current plan",detail:"No urgent shortfall, transfer, overspent category, or unassigned-goal action is showing from the information entered."});
  }
  return `<div class="coach-action-list">${actions.slice(0,4).map(a=>`<div class="coach-action-row"><span class="coach-action-mark">${esc(a.mark)}</span><span><b>${esc(a.title)}</b><small>${esc(a.detail)}</small></span></div>`).join("")}</div>`;
}

function budgetCoachNextDollars(x,goalPlan){
  const categoryGuide=budgetCoachCategoryGuide(x);
  const goalRows=goalPlan.allocations.length
    ?goalPlan.allocations.slice(0,4).map(a=>`<div class="coach-plan-row"><span><b>${esc(a.goal.name||"Savings goal")}</b><small>priority ${Number(a.goal.priority||3)}${a.goal.targetDate?" · target "+esc(dl(a.goal.targetDate)):""}</small></span><b>${money(a.amount)}</b></div>`).join("")
    :`<div class="muted small">${goalPlan.planUnassigned>0?"Add or prioritize a savings goal if you want Daily Life to direct some of the unassigned plan toward a specific purpose.":"There is no positive unassigned monthly cash in the current plan yet."}</div>`;
  const categoryRows=categoryGuide.length
    ?categoryGuide.map(r=>`<div class="coach-plan-row"><span><b>${esc(r.cat.name)}</b><small>${money(r.monthLeft)} left this month · about ${money(r.weeklyLeft)}/week at the current pace</small></span><b>${r.used}% used</b></div>`).join("")
    :`<div class="muted small">Set category limits to get specific weekly spending guidance for groceries, gas, household, fun, and other flexible spending.</div>`;
  const later=goalPlan.later>0?`<div class="muted small">Another <b>${money(goalPlan.later)}</b> is planned but is not counted as safe current cash yet, so Daily Life is not telling you to assign or move it early.</div>`:"";
  return `<div class="coach-subsection"><div class="section-title"><div><div class="eyebrow">Next dollars</div><h3>Give the money a job in this order</h3></div><span class="tag">${money(goalPlan.assignNow)} assignable now</span></div>
    ${goalRows}${later}
    <details class="compact-more"><summary>Flexible spending pace</summary><div class="coach-plan-list">${categoryRows}</div></details>
  </div>`;
}

function budgetCoachTransferRows(x){
  const rows=x.sourceRows.filter(r=>r.amount>0).slice(0,4);
  if(!rows.length)return `<div class="muted small">No checking balance is currently above its 45-day bill needs and minimum operating floor.</div>`;
  return rows.map(r=>{
    const flags=[];
    if(r.needsFloor)flags.push("set a checking floor");
    if(r.staleSynced)flags.push("synced balance is "+Math.floor(r.balanceAgeDays)+"d old");
    if(r.missingSyncDate)flags.push("sync age unknown");
    return `<div class="row"><span><b>${esc(r.account.name||"Checking")}</b><div class="muted small">Keep ${money(r.plan?.requiredNow||0)} there for its entered bills/floor through ${esc(dl(r.plan?.until||ymd()))}.${flags.length?" Review: "+esc(flags.join(" · "))+"." : ""}</div></span><b>${x.transferConfidence==="ready"?"move up to":"review"} ${money(r.amount)}</b></div>`;
  }).join("");
}

function budgetCoachTransferIssues(x){
  if(!x.transferIssues?.length)return"";
  return `<div class="coach-transfer-review"><b>Check before transferring</b>${x.transferIssues.map(issue=>`<div class="muted small">• ${esc(issue)}</div>`).join("")}<button class="btn small" type="button" onclick="closeModal();setView('more');openMoneyHubSection('accounts')">Review accounts</button></div>`;
}

function budgetCoachPrimaryAction(x,goalPlan){
  const safe=Number(x.safe.safe||0);
  if(safe<0)return{
    tone:"stop",kicker:"Protect bills first",title:"Pause optional spending",
    detail:`The entered plan is short ${money(Math.abs(safe))} after bill reserves and cushion.`,
    button:"Review bills",action:"closeModal();setView('more');openMoneyHubSection('bills')"
  };

  const movableSources=(x.sourceRows||[]).filter(r=>r.amount>0),
        needsFloor=movableSources.find(r=>r.needsFloor),
        stale=movableSources.find(r=>r.staleSynced||r.missingSyncDate);
  if(x.target&&x.movable>0&&x.transferConfidence!=="ready"){
    if(needsFloor)return{
      tone:"review",kicker:"Do this before any transfer",
      title:`Set ${needsFloor.account.name||"checking"} minimum balance`,
      detail:`Then re-check the suggested ${money(x.movable)} move to ${x.target.name||"savings"}.`,
      button:"Review accounts",action:"closeModal();setView('more');openMoneyHubSection('accounts')"
    };
    if(stale)return{
      tone:"review",kicker:"Do this before any transfer",title:"Refresh checking balances",
      detail:`Then re-check the suggested ${money(x.movable)} move to ${x.target.name||"savings"}.`,
      button:"Review accounts",action:"closeModal();setView('more');openMoneyHubSection('accounts')"
    };
    return{
      tone:"review",kicker:"Do this before any transfer",title:"Review account setup",
      detail:`Do not move the suggested ${money(x.movable)} yet; one or more setup checks are unresolved.`,
      button:"Review accounts",action:"closeModal();setView('more');openMoneyHubSection('accounts')"
    };
  }

  if(x.over?.length){
    const r=x.over[0];
    return{tone:"watch",kicker:"Spending",title:`Pause ${r.cat.name} extras`,detail:`This category is ${money(Math.abs(r.left)/100)} over its monthly limit.`,button:"Open categories",action:"closeModal();setView('budget');openBudgetHubSection('categories')"};
  }
  if(x.target&&x.movable>0&&x.transferConfidence==="ready"){
    return{tone:"go",kicker:"Money move",title:`Move up to ${money(x.movable)} → ${x.target.name||"savings"}`,detail:"Checking stays above the entered 45-day bill needs and operating floors.",button:"See transfer details",action:"const d=document.getElementById('moneyCoachTransferDetails');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'nearest'})}"};
  }
  if(goalPlan.allocations?.length){
    const first=goalPlan.allocations[0];
    return{tone:"go",kicker:"Next dollars",title:`Assign ${money(first.amount)} to ${first.goal.name||"your top savings goal"}`,detail:"This is currently safe and unassigned in the monthly plan.",button:"Open savings goals",action:"closeModal();setView('more');openMoneyHubSection('savings')"};
  }
  if(!x.target){
    return{tone:"review",kicker:"Setup",title:"Choose your preferred savings account",detail:"Then Daily Life can tell you where extra checking cash should live.",button:"Review accounts",action:"closeModal();setView('more');openMoneyHubSection('accounts')"};
  }
  return{tone:"clear",kicker:"Right now",title:"No money move needed",detail:"Nothing urgent is showing from the information currently entered.",button:"Review bills",action:"closeModal();setView('more');openMoneyHubSection('bills')"};
}

function budgetCoachCard(){
  const x=budgetCoachSnapshot(),goalPlan=budgetCoachGoalPlan(x),primary=budgetCoachPrimaryAction(x,goalPlan),
        transferReady=x.transferConfidence==="ready",
        transferLabel=x.movable>0?(transferReady?money(x.movable)+" ready":money(x.movable)+" review"):"None",
        targetName=x.target?x.target.name||"preferred savings":"preferred savings",
        trim=x.over.length
          ?`<div class="coach-compact-row"><span>Category over plan</span><b>${esc(x.over[0].cat.name)} · ${money(Math.abs(x.over[0].left)/100)}</b></div>`
          :"",
        setupWarning=x.safe.incomplete
          ?`<div class="coach-mini-warning"><b>Some bill/account setup is incomplete.</b><span>Amounts can change until that setup is finished.</span></div>`
          :"";

  return `<div class="card budget-coach-card budget-coach-compact">
    <div class="money-coach-heading">
      <div><div class="eyebrow">✦ Money coach</div><h2>What should I do?</h2></div>
      <span class="tag">${x.safe.incomplete?"needs setup":"bill-aware"}</span>
    </div>

    <div class="money-coach-primary ${primary.tone}">
      <div class="eyebrow">${esc(primary.kicker)}</div>
      <h3>${esc(primary.title)}</h3>
      <p>${esc(primary.detail)}</p>
      <button class="btn primary" type="button" onclick="${primary.action}">${esc(primary.button)}</button>
    </div>

    <div class="money-coach-snapshot" aria-label="Money snapshot">
      <span><small>Flexible today</small><b>${money(x.todayGuardrail)}</b></span>
      <span><small>This week</small><b>${money(x.weekGuardrail)}</b></span>
      <span><small>Possible transfer</small><b>${esc(transferLabel)}</b></span>
    </div>

    ${trim}
    ${setupWarning}

    <details class="money-coach-details" id="moneyCoachTransferDetails">
      <summary>Transfer details</summary>
      <div class="money-coach-detail-body">
        ${x.movable>0
          ?`<p><b>${transferReady?"Transfer looks ready":"Do not transfer yet"}.</b> ${transferReady?`Up to ${money(x.movable)} appears movable to ${esc(targetName)}.`:`Daily Life found ${money(x.movable)} of possible excess checking cash, but the checks below need attention first.`}</p>`
          :`<p>No checking account currently shows extra cash above its entered near-term bill needs and operating floor.</p>`}
        ${x.target?budgetCoachTransferRows(x):`<button class="btn small" type="button" onclick="closeModal();setView('more');openMoneyHubSection('accounts')">Set account strategy</button>`}
        ${budgetCoachTransferIssues(x)}
      </div>
    </details>

    <details class="money-coach-details">
      <summary>Planning details</summary>
      <div class="money-coach-detail-body">
        <div class="coach-compact-row"><span>Safe cash ceiling</span><b>${money(Math.max(0,Number(x.safe.safe||0)))}</b></div>
        <div class="coach-compact-row"><span>Unassigned monthly plan</span><b>${money(Math.max(0,Number(x.unassignedPlanCash||0)))}</b></div>
        ${goalPlan.allocations?.length?`<div class="coach-compact-row"><span>Next savings goal</span><b>${esc(goalPlan.allocations[0].goal.name||"Savings goal")} · ${money(goalPlan.allocations[0].amount)}</b></div>`:""}
        ${budgetCoachFutureBillsSection(x)}
      </div>
    </details>
  </div>`;
}

(function installBudgetCoachStyles(){
  if(document.getElementById("budgetCoachStyles"))return;
  const style=document.createElement("style");
  style.id="budgetCoachStyles";
  style.textContent=`
    .budget-coach-card{display:grid;gap:14px}
    .coach-guardrails{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .coach-guardrails span{padding:10px 0;border-top:1px solid var(--border)}
    .coach-guardrails small,.coach-guardrails b{display:block}
    .coach-guardrails b{margin-top:4px;font-size:1.05rem}\n    .coach-guardrail-note{margin-top:-4px}\n    .coach-transfer-review{display:grid;gap:5px;border-left:3px solid color-mix(in srgb,var(--accent) 58%,var(--border));padding:8px 0 8px 11px}\n    .coach-transfer-review .btn{justify-self:start;margin-top:3px}\n    .coach-future-bill{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--border)}\n    .coach-future-bill:first-child{border-top:0}.coach-future-bill small{display:block;color:var(--muted);font-size:.68rem;line-height:1.35;margin-top:2px}.coach-future-bill .btn{flex:0 0 auto}\n    .coach-subsection{display:grid;gap:8px;padding-top:12px;border-top:1px solid var(--border)}
    .coach-subsection h3{margin:.15rem 0 0;font-size:1.05rem}
    .coach-action-list,.coach-plan-list{display:grid;gap:0}
    .coach-action-row{display:grid;grid-template-columns:28px 1fr;gap:10px;padding:10px 0;border-top:1px solid var(--border);align-items:start}
    .coach-action-row:first-child{border-top:0}
    .coach-action-mark{width:25px;height:25px;border-radius:999px;background:color-mix(in srgb,var(--primary) 18%,transparent);display:grid;place-items:center;font-weight:900}
    .coach-action-row small,.coach-plan-row small{display:block;margin-top:3px;color:var(--muted);line-height:1.4}
    .coach-plan-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--border)}
    .coach-plan-row>span{min-width:0}
    .coach-plan-row>b{white-space:nowrap}
    @media(max-width:520px){.coach-guardrails{grid-template-columns:1fr}.coach-guardrails span{display:flex;align-items:center;justify-content:space-between;gap:12px}}
  `;
  document.head.appendChild(style);
})();

(function budgetCoachCompactStyles(){
  if(document.getElementById("budgetCoachCompactStyles"))return;
  const style=document.createElement("style");
  style.id="budgetCoachCompactStyles";
  style.textContent=`
    .budget-coach-compact{gap:12px!important}
    .money-coach-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
    .money-coach-heading h2{margin:2px 0 0;font-size:1.3rem}
    .money-coach-primary{display:grid;gap:5px;padding:14px;border:1px solid var(--border);border-radius:20px;background:rgba(255,255,255,.36)}
    .money-coach-primary h3{margin:0;font-family:var(--font-heading);font-size:1.18rem;line-height:1.18}
    .money-coach-primary p{margin:2px 0 5px;font-size:.82rem;line-height:1.4;color:var(--muted)}
    .money-coach-primary .btn{justify-self:start}
    .money-coach-primary.review{border-color:color-mix(in srgb,var(--accent) 48%,var(--border));background:color-mix(in srgb,var(--accent) 12%,rgba(255,255,255,.35))}
    .money-coach-primary.go{border-color:color-mix(in srgb,var(--primary) 48%,var(--border));background:color-mix(in srgb,var(--primary) 12%,rgba(255,255,255,.35))}
    .money-coach-primary.stop{border-color:color-mix(in srgb,var(--danger) 48%,var(--border));background:color-mix(in srgb,var(--danger) 9%,rgba(255,255,255,.35))}
    .money-coach-snapshot{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    .money-coach-snapshot span{display:grid;gap:3px;padding:9px;border:1px solid var(--border);border-radius:15px;background:rgba(255,255,255,.28);min-width:0}
    .money-coach-snapshot small{font-size:.62rem;color:var(--muted);line-height:1.2}
    .money-coach-snapshot b{font-size:.9rem;overflow-wrap:anywhere}
    .coach-compact-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--border);font-size:.76rem}
    .coach-compact-row b{text-align:right}
    .coach-mini-warning{display:grid;gap:2px;padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.32);font-size:.72rem}
    .coach-mini-warning span{color:var(--muted)}
    .money-coach-details{border-top:1px solid var(--border)}
    .money-coach-details>summary{min-height:42px;display:flex;align-items:center;cursor:pointer;font-weight:850;font-size:.78rem}
    .money-coach-detail-body{padding:0 0 9px;display:grid;gap:7px}
    .money-coach-detail-body p{margin:0;font-size:.76rem;line-height:1.4}
    .money-coach-detail-body .row{font-size:.74rem}
    @media(max-width:520px){.money-coach-snapshot{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:390px){.money-coach-snapshot{grid-template-columns:1fr}.money-coach-snapshot span{display:flex;justify-content:space-between;align-items:center}}
  `;
  document.head.appendChild(style);
})();
