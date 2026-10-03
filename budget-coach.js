/* Daily Life — budget coaching helpers.
   This file contains generic calculation/display logic only. It never embeds user balances. */

function budgetCoachRepeatPurchases(limit=3){
  const rows=[...(state?.budget?.spending||[])].filter(x=>{
    const d=String(x?.date||"");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
    const age=(new Date(ymd()+"T12:00:00")-new Date(d+"T12:00:00"))/86400000;
    return age>=0&&age<=120&&String(x.note||"").trim().length>=3&&x.category!=="ebt";
  });
  const groups=new Map();
  for(const x of rows){
    const key=String(x.note||"").trim().toLowerCase().replace(/\s+/g," ");
    if(!key)continue;
    const g=groups.get(key)||{name:String(x.note||"").trim(),count:0,total:0,categories:new Set()};
    g.count+=1;g.total+=Math.max(0,Number(x.amount||0));g.categories.add(x.category);groups.set(key,g);
  }
  return [...groups.values()]
    .filter(x=>x.count>=2)
    .sort((a,b)=>b.count-a.count||b.total-a.total)
    .slice(0,limit)
    .map(x=>({...x,average:x.count?x.total/x.count:0,categories:[...x.categories]}));
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
      const plan=typeof accountSweepPlan==="function"?accountSweepPlan(a,45):null;
      return {account:a,plan,amount:Math.max(0,Number(plan?.excess||0))};
    })
    .filter(x=>x.amount>=0)
    .sort((a,b)=>b.amount-a.amount);

  const movable=target?sourceRows.reduce((sum,x)=>sum+x.amount,0):0;
  const monthRemaining=totals?Number(totals.remaining||0)/100:null;
  const weeklyPlan=totals&&totals.daysLeft?Math.max(0,Number(totals.weekly||0)/100):null;
  const dailyPlan=totals&&totals.daysLeft?Math.max(0,monthRemaining||0)/Math.max(1,Number(totals.daysLeft||1)):null;
  const currentSafe=Math.max(0,Number(safe.safe||0));
  const todayGuardrail=dailyPlan===null?currentSafe:Math.min(currentSafe,dailyPlan);
  const weekGuardrail=weeklyPlan===null?currentSafe:Math.min(currentSafe,weeklyPlan);

  const categoryStatus=(totals?BUDGET_CATEGORIES.map(cat=>{
    const limit=budgetCents(totals.plan?.limits?.[cat.id]);
    const spent=(totals.logs||[]).filter(x=>x.category===cat.id).reduce((sum,x)=>sum+budgetCents(x.amount),0);
    return {cat,limit,spent,left:limit-spent};
  }):[]);
  const over=categoryStatus.filter(x=>x.limit>0&&x.left<0).sort((a,b)=>a.left-b.left);
  const repeats=budgetCoachRepeatPurchases();

  return {safe,totals,target,sourceRows,movable,monthRemaining,weeklyPlan,dailyPlan,todayGuardrail,weekGuardrail,categoryStatus,over,repeats};
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
  }
  if(x.target&&x.movable>0){
    actions.push({mark:String(actions.length+1),title:`Move extra checking cash to ${x.target.name||"savings"}`,detail:`Up to ${money(x.movable)} is above the 45-day bill/floor needs currently entered for checking.`});
  }
  if(goalPlan.allocations.length){
    const first=goalPlan.allocations[0];
    actions.push({mark:String(actions.length+1),title:`Fund ${first.goal.name||"your top savings goal"} next`,detail:`Based on the goal priority you set, ${money(first.amount)} of currently safe, unassigned planned cash can be earmarked there now.`});
  }else if(goalPlan.planUnassigned>0&&goalPlan.goals.length===0){
    actions.push({mark:String(actions.length+1),title:"Give unassigned money a purpose",detail:`${money(goalPlan.planUnassigned)} of the monthly plan is not assigned to a category or savings goal yet.`});
  }
  if(x.repeats.length){
    actions.push({mark:String(actions.length+1),title:`Price-check ${x.repeats[0].name}`,detail:`It appears repeatedly in recent spending. Compare unit price, bulk, store brand, and subscription price before buying it again.`});
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
  return rows.map(r=>`<div class="row"><span><b>${esc(r.account.name||"Checking")}</b><div class="muted small">Keep ${money(r.plan?.requiredNow||0)} there for its entered bills/floor through ${esc(dl(r.plan?.until||ymd()))}.</div></span><b>move up to ${money(r.amount)}</b></div>`).join("");
}

function budgetCoachCard(){
  const x=budgetCoachSnapshot(),goalPlan=budgetCoachGoalPlan(x);
  const targetName=x.target?esc(x.target.name||"preferred savings"):"your preferred savings account";
  const setupWarning=x.safe.incomplete
    ? `<div class="notice"><b>Some bill setup is incomplete.</b><div class="muted small">Treat these recommendations as provisional until missing accounts, balances, amounts, or due dates are fixed.</div></div>`
    :"";
  const transferHeadline=!x.target
    ?"Choose a preferred savings account"
    :x.movable>0
      ?`${money(x.movable)} can stay working harder`
      :"No transfer needed right now";
  const transferBody=!x.target
    ?`Mark one savings account as <b>Interest-first savings</b> so Daily Life knows where extra cash should live.`
    :x.movable>0
      ?`Based on the balances, entered bills, expected income assigned to each account, and each checking account's operating floor, up to <b>${money(x.movable)}</b> appears movable to <b>${targetName}</b> without draining the checking accounts that need to pay upcoming bills.`
      :`Your checking accounts do not currently show extra cash above their near-term bill needs and operating floors.`;

  const spendStatus=Number(x.safe.safe||0)<0
    ?`<div class="warning"><b>Hold optional spending for now.</b> The current entered cash picture is short by ${money(Math.abs(Number(x.safe.safe||0)))} after bill reserves and the budget cushion.</div>`
    :`<div class="coach-guardrails"><span><small>Today guardrail</small><b>${money(x.todayGuardrail)}</b></span><span><small>This week</small><b>${money(x.weekGuardrail)}</b></span><span><small>Current safe-to-spend</small><b>${money(Number(x.safe.safe||0))}</b></span></div>`;

  const trim=x.over.length
    ?`<div class="coach-subsection"><b>Where the plan is already tight</b>${x.over.slice(0,3).map(r=>`<div class="row"><span>${esc(r.cat.name)}</span><b class="budget-negative">${money(Math.abs(r.left)/100)} over</b></div>`).join("")}</div>`
    :"";

  const repeat=x.repeats.length
    ?`<details class="compact-more"><summary>Repeat-purchase savings checks</summary><div class="coach-subsection">${x.repeats.map(r=>`<div class="money-action"><div class="money-action-mark">↻</div><div class="grow"><b>${esc(r.name)}</b><div class="muted small">Logged ${r.count} times in about 120 days · average ${money(r.average)}. If these are the same recurring items, compare unit price, bulk size, store brand, and subscription pricing before the next purchase. Only subscribe when the total cost is actually lower and the quantity will be used.</div></div></div>`).join("")}</div></details>`
    :`<div class="muted small">As repeat purchases build up in spending history, Daily Life can flag candidates worth comparing for bulk, store-brand, or subscription savings.</div>`;

  return `<div class="card budget-coach-card">
    <div class="section-title"><div><div class="eyebrow">✦ Money coach</div><h2>What to do with the money next</h2><div class="muted small">Guidance from the information currently entered in Daily Life. It does not move money automatically.</div></div><span class="tag">${x.safe.incomplete?"provisional":"bill-aware"}</span></div>
    ${spendStatus}
    <div class="coach-subsection"><div class="eyebrow">Do this next</div><h3>Recommended order</h3>${budgetCoachActionList(x,goalPlan)}</div>
    ${budgetCoachNextDollars(x,goalPlan)}
    <div class="coach-subsection"><div class="section-title"><div><div class="eyebrow">Move to savings</div><h3>${transferHeadline}</h3></div>${x.target?`<span class="tag">${targetName}</span>`:""}</div>
      <p class="small">${transferBody}</p>
      ${x.target?budgetCoachTransferRows(x):`<button class="btn" type="button" onclick="setView('more');setMoneyTab('accounts')">Set account strategy</button>`}
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
    .coach-guardrails b{margin-top:4px;font-size:1.05rem}
    .coach-subsection{display:grid;gap:8px;padding-top:12px;border-top:1px solid var(--border)}
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
