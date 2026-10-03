/* Daily Life — recurring-purchase savings lab.
   Manual comparison tool for subscription, temporary-deal, fee, and overbuying math. */

function savingsLabRows(){
  return Array.isArray(state.settings?.savingsComparisons)?state.settings.savingsComparisons:[];
}

function savingsLabMath(x){
  const regular=Math.max(0,Number(x.regularPrice||0)),
        subscribe=Math.max(0,Number(x.subscribePrice||0)),
        orders=Math.max(1,Number(x.ordersPerYear||12)),
        annualFee=Math.max(0,Number(x.annualFee||0)),
        waste=Math.max(0,Math.min(90,Number(x.wastePct||0))),
        usable=Math.max(.1,1-waste/100),
        regularAnnual=regular*orders,
        subscribeCashAnnual=subscribe*orders+annualFee,
        subscribeEffectiveAnnual=subscribe*orders/usable+annualFee,
        difference=regularAnnual-subscribeEffectiveAnnual,
        breakEven=orders>0?Math.max(0,((regularAnnual-annualFee)*usable)/orders):0,
        discount=regular>0?(1-subscribe/regular)*100:0,
        deal=Math.max(0,Number(x.currentDealPrice||0)),
        target=Math.max(0,Number(x.targetPrice||0));
  return {regular,subscribe,orders,annualFee,waste,usable,regularAnnual,subscribeCashAnnual,subscribeEffectiveAnnual,difference,breakEven,discount,deal,target};
}

function savingsLabVerdict(x){
  const m=savingsLabMath(x);
  if(!m.regular||!m.subscribe)return{kind:"setup",label:"Needs prices",detail:"Enter a normal price and subscription price for the same item/size."};
  const breakEvenText=`Break-even subscription price is about ${money(m.breakEven)} per order with these assumptions.`;
  if(m.difference>1)return{kind:"save",label:`Subscription saves about ${money(m.difference)}/year`,detail:`After ${m.waste}% expected unused product and ${money(m.annualFee)} in extra yearly fees. ${breakEvenText}`};
  if(m.difference<-1)return{kind:"cost",label:`Subscription costs about ${money(Math.abs(m.difference))} more/year`,detail:`The headline discount is not enough after the assumptions entered. ${breakEvenText}`};
  return{kind:"even",label:"About break-even",detail:`The annual difference is small enough that flexibility may matter more than the discount. ${breakEvenText}`};
}

function savingsLabBuyAdvice(x){
  const m=savingsLabMath(x);
  if(!m.deal)return null;
  const expiry=x.dealExpires?(` · deal ends ${dl(x.dealExpires)}`):"";
  if(m.target&&m.deal<=m.target&&(!m.subscribe||m.deal<m.subscribe)){
    return{kind:"buy",title:"Buy now meets your target",detail:`Current deal ${money(m.deal)} is at or below your ${money(m.target)} target and beats the entered subscription price${expiry}.`};
  }
  if(m.subscribe&&m.deal<m.subscribe){
    return{kind:"buy",title:"One-time deal beats the subscription",detail:`Current deal ${money(m.deal)} is ${money(m.subscribe-m.deal)} cheaper per order than the entered subscription price${expiry}.`};
  }
  if(m.target&&m.deal>m.target){
    return{kind:"wait",title:"Wait if this is not urgent",detail:`Current deal ${money(m.deal)} is still ${money(m.deal-m.target)} above your target price${expiry}.`};
  }
  if(m.subscribe&&m.subscribe<m.deal&&m.difference>1){
    return{kind:"subscribe",title:"Subscription is currently cheaper",detail:`Entered subscription price ${money(m.subscribe)} beats the current one-time deal by ${money(m.deal-m.subscribe)} per order, and the annual comparison still saves money after your waste/fee assumptions.`};
  }
  return{kind:"compare",title:"Current deal does not clearly win",detail:`Current deal is ${money(m.deal)}. Compare timing and quantity before buying; the annual subscription break-even is about ${money(m.breakEven)} per order.`};
}

function savingsLabRow(x){
  const v=savingsLabVerdict(x),m=savingsLabMath(x),buy=savingsLabBuyAdvice(x);
  const dealNote=buy?` · ${buy.title}`:m.deal?` · current deal ${money(m.deal)}`:"";
  return `<button class="savings-lab-row ${v.kind}" onclick="openSavingsComparison('${x.id}')"><span class="grow"><b>${esc(x.item||"Recurring purchase")}</b><small>${esc(x.store||"")}${x.store?" · ":""}${esc(v.label)}${esc(dealNote)}</small></span><span>›</span></button>`;
}

function savingsLabSection(){
  const rows=[...savingsLabRows()].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))),
        repeats=typeof budgetCoachRepeatPurchases==="function"?budgetCoachRepeatPurchases(3):[];
  return `<details class="savings-lab">
    <summary><span><b>Subscription + deal savings lab</b><small>Check whether Subscribe & Save actually wins after fees and overbuying</small></span><span>Open</span></summary>
    <div class="savings-lab-body">
      <div class="section-title"><div><div class="eyebrow">Recurring purchases</div><h3>Compare the real cost</h3></div><button class="btn primary" onclick="openSavingsComparison()">+ Compare</button></div>
      ${rows.length?rows.slice(0,8).map(savingsLabRow).join(""):`<div class="muted small">No comparisons saved yet. Use the same item/pack size on both sides so the math is meaningful.</div>`}
      ${repeats.length?`<div class="savings-lab-candidates"><div class="muted small"><b>Worth checking from recent spending labels:</b></div>${repeats.map((r,i)=>`<button class="chip" onclick="openSavingsComparisonFromRepeat(${i})">${esc(r.name)}${r.cadenceStable&&r.avgGapDays?` · ~${Math.max(1,Math.round(r.avgGapDays))}d`:""}</button>`).join("")}</div>`:""}
      <div class="muted small">This tool does not fetch live retailer prices yet. Enter a current price/deal when you see one; Daily Life will compare it with the subscription math and your target price.</div>
    </div>
  </details>`;
}

function openSavingsComparisonFromRepeat(index=0){
  const repeats=typeof budgetCoachRepeatPurchases==="function"?budgetCoachRepeatPurchases(8):[],
        r=repeats[Number(index)||0];
  if(!r){openSavingsComparison();return}
  openSavingsComparison("",{
    item:r.name,
    regularPrice:Math.round(Number(r.average||0)*100)/100,
    ordersPerYear:r.estimatedOrdersPerYear||12,
    observedCount:r.count,
    observedDays:r.windowDays||120,
    avgGapDays:r.avgGapDays,
    annualizedSpend:r.annualizedSpend,
    cadenceStable:!!r.cadenceStable
  });
}

function openSavingsComparison(id="",seed=""){
  const existing=savingsLabRows().find(x=>x.id===id),
        seedInfo=seed&&typeof seed==="object"?seed:{item:String(seed||"")},
        seeded=!existing&&!!String(seedInfo.item||"").trim(),
        x=existing||{id:"",item:String(seedInfo.item||""),store:"",regularPrice:Number(seedInfo.regularPrice||0)||"",subscribePrice:"",ordersPerYear:Math.max(1,Number(seedInfo.ordersPerYear||12)),annualFee:0,wastePct:0,currentDealPrice:"",targetPrice:"",dealExpires:"",notes:""};
  const preview=existing?savingsLabVerdict(existing):null,buyAdvice=existing?savingsLabBuyAdvice(existing):null,previewMath=existing?savingsLabMath(existing):null;
  modal(existing?"Savings comparison":"Compare recurring purchase",`<div class="stack">
    ${seeded?`<div class="notice"><b>Prefilled from recent spending history.</b><div class="muted small">Daily Life used this spending label’s observed average amount and purchase cadence. Verify that the entries really represent the same item and pack size before trusting the comparison.${seedInfo.avgGapDays?` Observed timing was about every ${Math.max(1,Math.round(seedInfo.avgGapDays))} days.`:""}${Number(seedInfo.annualizedSpend)>0?` Recent pace is roughly ${money(seedInfo.annualizedSpend)}/year.`:""}</div></div>`:""}
    <label>Item / same pack size<input id="slitem" value="${esc(x.item||"")}" placeholder="Cat litter 38 lb, paper towels 12-pack…"></label>
    <label>Store / subscription source<input id="slstore" value="${esc(x.store||"")}" placeholder="Walmart, Sam's, Amazon…"></label>
    <div class="grid2"><label>Normal one-time price<input id="slregular" type="number" min="0" step=".01" value="${esc(x.regularPrice??"")}"></label><label>Subscription price<input id="slsub" type="number" min="0" step=".01" value="${esc(x.subscribePrice??"")}"></label></div>
    <div class="grid2"><label>Expected orders per year<input id="slorders" type="number" min="1" max="365" step="1" value="${esc(x.ordersPerYear??12)}"></label><label>Extra annual fee attributable to this option<input id="slfee" type="number" min="0" step=".01" value="${esc(x.annualFee??0)}"></label></div>
    <label>Expected unused / overbought product (%)<input id="slwaste" type="number" min="0" max="90" step="1" value="${esc(x.wastePct??0)}"><span class="muted small">Use 0 if you reliably use every shipment. Increase this if the subscription would pile up faster than you use it.</span></label>
    <div class="grid2"><label>Current temporary deal price<input id="sldeal" type="number" min="0" step=".01" value="${esc(x.currentDealPrice??"")}"></label><label>Your target buy price<input id="sltarget" type="number" min="0" step=".01" value="${esc(x.targetPrice??"")}"></label></div>
    <label>Deal expiration (optional)<input id="slexpires" type="date" value="${esc(x.dealExpires||"")}"></label>
    <label>Notes<textarea id="slnotes" rows="3">${esc(x.notes||"")}</textarea></label>
    ${preview?`<div class="notice"><b>${esc(preview.label)}</b><div class="muted small">${esc(preview.detail)}</div>${previewMath?.regular&&previewMath?.subscribe?`<div class="savings-lab-math"><span><small>Normal annual</small><b>${money(previewMath.regularAnnual)}</b></span><span><small>Subscription effective annual</small><b>${money(previewMath.subscribeEffectiveAnnual)}</b></span><span><small>Break-even sub price</small><b>${money(previewMath.breakEven)}</b></span></div>`:""}</div>`:""}
    ${buyAdvice?`<div class="savings-buy-advice ${buyAdvice.kind}"><b>${esc(buyAdvice.title)}</b><div class="muted small">${esc(buyAdvice.detail)}</div></div>`:""}
    ${existing?`<button type="button" class="btn danger" onclick="removeSavingsComparison('${x.id}')">Delete comparison</button>`:""}
  </div>`,"Save comparison",async()=>{
    const item=$("#slitem").value.trim();if(!item)return;
    state.settings=state.settings||{};
    if(!Array.isArray(state.settings.savingsComparisons))state.settings.savingsComparisons=[];
    let row=state.settings.savingsComparisons.find(v=>v.id===id);
    if(!row){row={id:uid(),createdAt:new Date().toISOString()};state.settings.savingsComparisons.push(row)}
    Object.assign(row,{
      item,store:$("#slstore").value.trim(),
      regularPrice:Math.max(0,Number($("#slregular").value||0)),
      subscribePrice:Math.max(0,Number($("#slsub").value||0)),
      ordersPerYear:Math.max(1,Number($("#slorders").value||12)),
      annualFee:Math.max(0,Number($("#slfee").value||0)),
      wastePct:Math.max(0,Math.min(90,Number($("#slwaste").value||0))),
      currentDealPrice:Math.max(0,Number($("#sldeal").value||0)),
      targetPrice:Math.max(0,Number($("#sltarget").value||0)),
      dealExpires:$("#slexpires").value,
      notes:$("#slnotes").value.trim(),
      updatedAt:new Date().toISOString()
    });
    await save();closeModal();render();
  });
}

async function removeSavingsComparison(id){
  const row=savingsLabRows().find(x=>x.id===id);
  if(!row||!confirm(`Delete the savings comparison for "${row.item||"this item"}"?`))return;
  state.settings.savingsComparisons=savingsLabRows().filter(x=>x.id!==id);
  await save();closeModal();render();
}

const savingsLabBaseBudgetCoachCard=budgetCoachCard;
budgetCoachCard=function(){
  return savingsLabBaseBudgetCoachCard()+savingsLabSection();
};

(function installSavingsLabStyles(){
  if(document.getElementById("savingsLabStyles"))return;
  const style=document.createElement("style");
  style.id="savingsLabStyles";
  style.textContent=`
    .savings-lab{margin:0;padding:2px 2px 10px;border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border))}
    .savings-lab>summary{list-style:none;display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:52px;cursor:pointer}
    .savings-lab>summary::-webkit-details-marker{display:none}.savings-lab>summary>span:first-child{display:grid;gap:2px}.savings-lab>summary small{color:var(--muted);font-size:.68rem;line-height:1.3}.savings-lab>summary>span:last-child{color:var(--secondary);font-size:.7rem;font-weight:850}
    .savings-lab[open]>summary>span:last-child{font-size:0}.savings-lab[open]>summary>span:last-child:after{content:"Close";font-size:.7rem}
    .savings-lab-body{padding:2px 0 6px}
    .savings-lab-row{width:100%;display:flex;justify-content:space-between;gap:10px;align-items:center;border:0;border-top:1px solid var(--border);background:transparent;color:var(--text);padding:10px 0;text-align:left;font:inherit}
    .savings-lab-row:first-of-type{border-top:0}.savings-lab-row small{display:block;margin-top:2px;color:var(--muted);font-size:.68rem;line-height:1.35}
    .savings-lab-row.save b{color:var(--success)}.savings-lab-row.cost b{color:var(--danger)}
    .savings-lab-candidates{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0}.savings-lab-candidates>div{width:100%}
    .savings-lab-math{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}
    .savings-lab-math span{display:grid;gap:2px;padding-top:7px;border-top:1px solid var(--border)}.savings-lab-math small{font-size:.64rem;color:var(--muted)}.savings-lab-math b{font-size:.8rem}
    .savings-buy-advice{border-left:3px solid color-mix(in srgb,var(--primary) 52%,var(--border));padding:8px 0 8px 11px;background:linear-gradient(90deg,color-mix(in srgb,var(--primary) 6%,transparent),transparent 72%)}
    .savings-buy-advice.wait{border-left-color:color-mix(in srgb,var(--accent) 65%,var(--border))}
    .savings-buy-advice.subscribe{border-left-color:color-mix(in srgb,var(--secondary) 65%,var(--border))}
    @media(max-width:520px){.savings-lab-math{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
})();
