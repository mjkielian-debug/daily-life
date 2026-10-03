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
        repeats=budgetCoachRepeatPurchases(),\n        futureBills=budgetCoachFutureBillPlans(),\n        transferIssues=[];
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
  return `<div class="coach-transfer-review"><b>Check before transferring</b>${x.transferIssues.map(issue=>`<div class="muted small">• ${esc(issue)}</div>`).join("")}<button class="btn small" type="button" onclick="setView('more');setMoneyTab('accounts')">Review accounts</button></div>`;
}

function budgetCoachCard(){
  const x=budgetCoachSnapshot(),goalPlan=budgetCoachGoalPlan(x);
  const targetName=x.target?esc(x.target.name||"preferred savings"):"your preferred savings account";
  const setupWarning=x.safe.incomplete
    ? `<div class="notice"><b>Some bill setup is incomplete.</b><div class="muted small">Treat these recommendations as provisional until missing accounts, balances, amounts, or due dates are fixed.</div></div>`
    :"";
  const transferReady=x.transferConfidence==="ready";
  const transferHeadline=!x.target
    ?"Choose a preferred savings account"
    :x.movable>0
      ?transferReady?`${money(x.movable)} can stay working harder`:`Review before moving ${money(x.movable)}`
      :"No transfer needed right now";
  const transferBody=!x.target
    ?`Mark one savings account as <b>Interest-first savings</b> so Daily Life knows where extra cash should live.`
    :x.movable>0
      ?transferReady
        ?`Based on the balances, entered bills, expected income assigned to each account, and each checking account's operating floor, up to <b>${money(x.movable)}</b> appears movable to <b>${targetName}</b> without draining the checking accounts that need to pay upcoming bills.`
        :`Daily Life found up to <b>${money(x.movable)}</b> above the entered 45-day checking needs, but it is treating that as a review amount—not a ready-to-transfer amount—until the checks below are resolved.`
      :`Your checking accounts do not currently show extra cash above their near-term bill needs and operating floors.`;

  const guardrailNote=x.guardrailUsesCategories
    ?`Based on your assigned flexible categories, not every unassigned dollar. ${x.unassignedPlanCash>0?money(x.unassignedPlanCash)+" is still unassigned and stays outside these spending guardrails.":"Unassigned money is kept outside the spending pace."}`
    :"No flexible category limits are set yet, so the pace falls back to remaining monthly cash after entered bills/spending.";
  const spendStatus=Number(x.safe.safe||0)<0
    ?`<div class="warning"><b>Hold optional spending for now.</b> The current entered cash picture is short by ${money(Math.abs(Number(x.safe.safe||0)))} after bill reserves and the budget cushion.</div>`
    :`<div class="coach-guardrails"><span><small>Flexible plan today</small><b>${money(x.todayGuardrail)}</b></span><span><small>Flexible plan this week</small><b>${money(x.weekGuardrail)}</b></span><span><small>Safe cash ceiling</small><b>${money(Number(x.safe.safe||0))}</b></span></div><div class="muted small coach-guardrail-note">${esc(guardrailNote)}</div>`;

  const trim=x.over.length
    ?`<div class="coach-subsection"><b>Where the plan is already tight</b>${x.over.slice(0,3).map(r=>`<div class="row"><span>${esc(r.cat.name)}</span><b class="budget-negative">${money(Math.abs(r.left)/100)} over</b></div>`).join("")}</div>`
    :"";

  const repeat=x.repeats.length
    ?`<details class="compact-more"><summary>Repeat-purchase savings checks</summary><div class="coach-subsection">${x.repeats.map(r=>`<div class="money-action"><div class="money-action-mark">↻</div><div class="grow"><b>${esc(r.name)}</b><div class="muted small">${esc(budgetCoachRepeatDetail(r))}</div><div class="muted small">${r.cadenceStable?`Cadence looks fairly consistent${r.nextLikelyDate?` · another purchase may be due around ${esc(dl(r.nextLikelyDate))}`:""}. This is a stronger candidate for a subscription/unit-price comparison.`:`There is not enough consistent timing yet to assume a subscription schedule. Compare the math, but keep flexibility.`}</div></div><span class="tag">${r.cadenceStable?"steady":"watch"}</span></div>`).join("")}</div></details>`
    :`<div class="muted small">As repeat purchases build up in spending history, Daily Life can flag candidates worth comparing for bulk, store-brand, or subscription savings.</div>`;

  return `<div class="card budget-coach-card">
    <div class="section-title"><div><div class="eyebrow">✦ Money coach</div><h2>What to do with the money next</h2><div class="muted small">Guidance from the information currently entered in Daily Life. It does not move money automatically.</div></div><span class="tag">${x.safe.incomplete?"provisional":"bill-aware"}</span></div>
    ${spendStatus}
    <div class="coach-subsection"><div class="eyebrow">Do this next</div><h3>Recommended order</h3>${budgetCoachActionList(x,goalPlan)}</div>
    ${budgetCoachNextDollars(x,goalPlan)}\n    ${budgetCoachFutureBillsSection(x)}\n    <div class="coach-subsection"><div class="section-title"><div><div class="eyebrow">Move to savings</div><h3>${transferHeadline}</h3></div>${x.target?`<span class="tag">${targetName}</span>`:""}</div>
      <p class="small">${transferBody}</p>
      ${x.target?budgetCoachTransferRows(x):`<button class="btn" type="button" onclick="setView('more');setMoneyTab('accounts')">Set account strategy</button>`}
      ${budgetCoachTransferIssues(x)}
      ${x.target&&x.movable>0?`<div class="notice"><b>Transfer suggestion, not spendable money.</b><div class="muted small">Moving cash between your own checking and savings does not increase what is safe to spend. Re-check after large purchases, bill payments, or balance updates.</div></div>`:""}
    </div>
    ${trim}
    <div class="coach-subsection"><div class="eyebrow">Save on repeat purchases</div><h3>Check the math before subscribing</h3>${repeat}</div>
    ${setupWarning}
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
