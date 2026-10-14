/* Simple utility bill history: summary fields, not account numbers. */
(function(){
"use strict";
const num=v=>v===null||v===undefined||v===""?null:Number.isFinite(Number(v))?Number(v):null;
const bills=()=>Array.isArray(state.utilityBillHistory)?state.utilityBillHistory:(state.utilityBillHistory=[]);
function verifiedBills(){return bills().filter(x=>/^\d{4}-\d{2}$/.test(String(x.month||""))&&num(x.total)!==null).slice().sort((a,b)=>a.month.localeCompare(b.month))}
window.electricityInsightComparison=function(){
 const rows=verifiedBills().slice(-2);if(rows.length<2)return null;
 const old=rows[0],now=rows[1];
 const costPercent=num(old.total)>0?Math.round((now.total-old.total)/old.total*100):null;
 const usagePercent=num(old.kwh)>0&&num(now.kwh)!==null?Math.round((now.kwh-old.kwh)/old.kwh*100):null;
 return{old,now,costPercent,usagePercent};
};
window.openElectricityHistory=function(){
 const rows=verifiedBills().reverse(),diff=window.electricityInsightComparison();
 const intro=diff?("Recorded amounts: "+diff.old.month+" "+money(diff.old.total)+" → "+diff.now.month+" "+money(diff.now.total)+". "+
 (diff.costPercent!==null?"Bill change "+(diff.costPercent>=0?"+":"")+diff.costPercent+"%. ":"")+
 (diff.usagePercent!==null?"Recorded usage change "+(diff.usagePercent>=0?"+":"")+diff.usagePercent+"%.":"Add kWh to both months for usage comparison.")):
 "Add two monthly electricity bills to compare your usage and cost. Bills don't have to be in order.";
 const rowsHtml=rows.map(x=>'<button class="li-bill" onclick="openElectricityBill(\''+String(x.id).replace(/[^A-Za-z0-9_-]/g,"")+'\')">'+
  '<b>'+esc(x.month)+'</b><strong>'+money(x.total)+'</strong><small>'+(num(x.kwh)!==null?num(x.kwh)+" kWh":"kWh unknown")+(num(x.billingDays)!==null?" · "+num(x.billingDays)+" days":"")+'</small></button>').join("");
 modal("⚡ Electricity + savings",'<div class="li-layout"><p class="li-intro">'+esc(intro)+'</p>'+
 '<div class="li-actions"><button onclick="openElectricityBill()">+ Record a bill</button><button onclick="openLifeInsights(\'Money\')">All money insights</button></div>'+
 rowsHtml+'<p class="li-disclaimer">Take a picture of a bill in ChatGPT and I can help extract the numbers and spot possible savings. This app tracker saves summaries only, not full statements or account numbers. Compare rates, billing days, fees and weather before assuming what caused a change.</p></div>',
 "Close",closeModal);
};
window.openElectricityBill=function(id=""){
 const old=bills().find(x=>x.id===id),x=old||{};
 const form='<div class="stack"><p class="li-intro">You can share a photo in ChatGPT for help entering these fields. Do not enter the account number.</p>'+
 '<label>Bill month<input type="month" id="liMonth" value="'+esc(x.month||ymd().slice(0,7))+'"></label>'+
 '<div class="grid2"><label>Total billed ($)<input id="liTotal" type="number" min="0" step=".01" value="'+esc(x.total??"")+'"></label>'+
 '<label>kWh used (optional)<input id="liKwh" type="number" min="0" step="1" value="'+esc(x.kwh??"")+'"></label></div>'+
 '<div class="grid2"><label>Billing days (optional)<input id="liDays" type="number" min="1" max="62" value="'+esc(x.billingDays??"")+'"></label>'+
 '<label>Provider (optional)<input id="liProvider" value="'+esc(x.provider||"")+'"></label></div></div>';
 modal("⚡ Record electricity",form,"Save",async()=>{
  const get=id=>document.getElementById(id).value;
  const month=get("liMonth"),total=num(get("liTotal")),kwh=num(get("liKwh")),days=num(get("liDays"));
  if(!/^\d{4}-\d{2}$/.test(month)||total===null||total<0||kwh!==null&&kwh<0||days!==null&&(!Number.isInteger(days)||days<1||days>62)){
   alert("Please enter a valid month and nonnegative bill total. Usage and billing days can be left blank.");return;
  }
  const provider=get("liProvider").trim();
  let entry=old||bills().find(v=>v.month===month&&v.provider===provider);
  if(!entry){entry={id:uid(),createdAt:new Date().toISOString()};bills().push(entry)}
  Object.assign(entry,{month,total,kwh,billingDays:days,provider,updatedAt:new Date().toISOString()});
  await save();render();window.openElectricityHistory();
 });
};
})();