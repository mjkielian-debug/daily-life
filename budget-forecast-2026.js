/* Budget forecast is advisory and additive. Existing IndexedDB plans remain authoritative. */
(function(){
"use strict";
const KEY="dailyLifeBudgetForecast2026_v1";
const defaults={monthlyIncome:2978,ebt:417,rent:1164,electric:267,water:120,insurance:125,phone:66,subscriptions:55,transport:160,groceriesCash:125,restaurants:175,shopping:350,householdOther:500,irregularReserve:200,peakWeekly:1282,peakWeeks:8,taxRefund:12000,peakGoal:5000,otherMonthlyIncome:0};
const names={rent:"Rent",electric:"Electric",water:"Water reserve",insurance:"Progressive reserve",phone:"Phone plans",subscriptions:"Subscriptions",transport:"Fuel / transportation",groceriesCash:"Groceries (cash)",restaurants:"Dining / drinks",shopping:"Shopping",householdOther:"Household / children / other",irregularReserve:"Irregular bills reserve"};
const fields=Object.keys(names);
function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch(_){return {...defaults}}}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(){
 const d=read(),cost=fields.reduce((a,k)=>a+(Number(d[k])||0),0),margin=d.monthlyIncome-cost;
 const weeks=Math.max(1,Number(d.peakWeeks)||8),peak=(Number(d.peakWeekly)||0)*weeks+(Number(d.otherMonthlyIncome)||0)*weeks/(52/12);
 const excess=peak-cost*weeks/(52/12);
 return '<section id="dl-budget-forecast" style="margin:16px 0;padding:14px;border:1px solid var(--border,#ccc);border-radius:18px;background:var(--card,#fff);color:var(--text,inherit)">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><h3 style="margin:0">🌈 Real-life money plan</h3><button type="button" class="btn small" onclick="dailyLifeBudgetForecastReset()">Reset estimates</button></div>'+
 '<p class="muted small">Editable planning estimates, not a live bank sync. These numbers do not update your existing bills, spending or IndexedDB budget.</p>'+
 '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0">'+
 '<div><small>Monthly cash income</small><b style="display:block">'+money(d.monthlyIncome)+'</b></div><div><small>Planned monthly expenses</small><b style="display:block">'+money(cost)+'</b></div>'+
 '<div><small>Monthly cash margin</small><b style="display:block;color:'+(margin<0?'#b33939':'#267d51')+'">'+money(margin)+'</b></div><div><small>EBT food assistance (separate)</small><b style="display:block">'+money(d.ebt)+'</b></div></div>'+
 '<details><summary style="cursor:pointer;font-weight:700">Edit monthly spending targets</summary><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 0">'+
 fields.map(k=>'<label style="font-size:.82rem;min-width:0">'+esc(names[k])+'<input style="width:100%;box-sizing:border-box" type="number" min="0" step="1" inputmode="decimal" value="'+d[k]+'" onchange="dailyLifeBudgetForecastSet(\''+k+'\',this.value)"></label>').join('')+
 '</div><label>Monthly cash income <input type="number" min="0" value="'+d.monthlyIncome+'" onchange="dailyLifeBudgetForecastSet(\'monthlyIncome\',this.value)"></label> <label>EBT <input type="number" min="0" value="'+d.ebt+'" onchange="dailyLifeBudgetForecastSet(\'ebt\',this.value)"></label></details>'+
 '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Peak season + tax refund calculator</summary><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0">'+
 [['peakWeekly','Weekly UPS take-home'],['peakWeeks','Peak weeks'],['otherMonthlyIncome','Other monthly cash income during peak'],['peakGoal','Peak savings goal'],['taxRefund','Refund estimate']].map(([k,label])=>'<label style="font-size:.82rem">'+label+'<input style="width:100%;box-sizing:border-box" type="number" min="0" value="'+d[k]+'" onchange="dailyLifeBudgetForecastSet(\''+k+'\',this.value)"></label>').join('')+'</div>'+
 '<p><b>Peak-period cash after entered expenses:</b> '+money(excess)+' <small>(scenario, not guaranteed savings; assumes the weekly UPS estimate for '+weeks+' weeks plus other income explicitly entered above, before unplanned costs or benefit changes)</small></p>'+
 '<p><b>Peak savings target:</b> '+money(Number(d.peakGoal))+'</p><p><b>Estimated tax refund:</b> '+money(Number(d.taxRefund))+' <small>(unconfirmed; do not count toward available cash or savings until received)</small></p></details>'+
 '<p class="muted small" style="margin-bottom:0">Evidence: Progressive paid about $123–125 monthly Jan–Jul; $581 in Sep is exceptional. Water payments were irregular ($340 Jan, $120 Mar, $377 Sep). Mint $261 Sep is a single recorded payment; frequency unverified. Tax estimate is provisional pending W-2, filing status and credits.</p></section>';
}
window.dailyLifeBudgetForecastHtml=render;
window.dailyLifeBudgetForecastSet=function(k,v){if(!(k in defaults))return;const d=read();d[k]=Math.max(0,Math.min(1000000,Number(v)||0));localStorage.setItem(KEY,JSON.stringify(d));const el=document.getElementById("dl-budget-forecast");if(el)el.outerHTML=render()};
window.dailyLifeBudgetForecastReset=function(){localStorage.removeItem(KEY);const el=document.getElementById("dl-budget-forecast");if(el)el.outerHTML=render()};
})();