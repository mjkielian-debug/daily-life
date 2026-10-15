/* Daily Life — private, additive financial priorities and home purchase planner.
   Generic starter steps only: never embed account balances or personal financial values in public source.
   This uses the existing private settings store; it does not move funds or update bills. */
(function(){
"use strict";
var STARTERS=[
 {id:"accounts",name:"Simplify banking",intro:"Finish account exits safely; keep bill payments and deposits working.",steps:["List every autopay and deposit tied to an old account","Move or cancel linked payments and verify the change","Check unsettled transactions and linked savings","Confirm closure directly with the bank"]},
 {id:"renewals",name:"Cut unused renewals",intro:"Review subscriptions and trial dates before they charge again.",steps:["Review recurring charges and unused services","Check renewals or trials that are coming due","Cancel what is no longer worth keeping and keep confirmation"]},
 {id:"stability",name:"Protect essentials + build a cushion",intro:"Keep rent, utilities, food and transport ahead of optional purchases.",steps:["Review the next 45 days of bills and expected income","Choose an emergency-fund target in Savings","Set aside money for car maintenance and irregular expenses"]},
 {id:"home",name:"Family homeownership",intro:"Compare family homes, financing, repairs and confirmed assistance together.",steps:["Look for 4+ bedrooms, or suitable finished attic/basement spaces","Compare total monthly ownership cost with current housing cost","Check the address and project against actual rehab-grant rules","Check NeighborWorks Lincoln homebuyer assistance and mortgage options"]},
 {id:"fss",name:"Family Self-Sufficiency plan",intro:"Track real program status without counting hypothetical escrow as cash.",steps:["Confirm current FSS participation details and actual escrow","Discuss how rent and earnings changes affect the program","Ask the coordinator about the homeownership plan and any available referrals"]},
 {id:"seasonal",name:"Peak pay + tax planning",intro:"Plan conservatively for variable UPS overtime and potential refunds.",steps:["Update expected take-home using actual pay statements","Choose what portion of confirmed extra income to protect","Update tax expectations after W-2s and credits are known"]}
];
function e(v){return String(v===undefined||v===null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function safeId(v){return String(v||"").replace(/[^a-z0-9_-]/gi,"");}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);}
function rows(){return Array.isArray(state.settings&&state.settings.financialRoadmap)?state.settings.financialRoadmap:[];}
function ensure(){
 if(!state||typeof state!=="object")return false;
 state.settings=state.settings||{};
 if(Array.isArray(state.settings.financialRoadmap))return false;
 state.settings.financialRoadmap=STARTERS.map(function(x){return {id:x.id,name:x.name,intro:x.intro,notes:"",targetDate:"",steps:x.steps.map(function(s){return {text:s,done:false};}),createdFromTemplate:true};});
 state.settings.financialRoadmapVersion=1;
 return true;
}
function stats(g){var steps=Array.isArray(g.steps)?g.steps:[],done=steps.filter(function(s){return !!s.done;}).length;return {done:done,total:steps.length,pct:steps.length?Math.round(100*done/steps.length):0};}
function totals(){var all=rows().map(stats),done=all.reduce(function(n,x){return n+x.done;},0),total=all.reduce(function(n,x){return n+x.total;},0);return {done:done,total:total,pct:total?Math.round(100*done/total):0};}
function bankExit(){
 return Array.isArray(state.settings&&state.settings.bankExitPlans)?state.settings.bankExitPlans.find(function(x){return x.priority&&x.status!=="closed";}):null;
}
function tile(g){
 var p=stats(g);
 return '<button type="button" class="finance-roadmap-tile" onclick="openFinancePriority(\''+e(safeId(g.id))+'\')">'+
 '<span class="finance-roadmap-tile-title"><b>'+e(g.name)+'</b><strong>'+p.pct+'%</strong></span>'+
 '<span class="finance-roadmap-meter"><i style="width:'+p.pct+'%"></i></span>'+
 '<small>'+p.done+' of '+p.total+' steps'+(g.targetDate?' · Target '+e(g.targetDate):'')+'</small></button>';
}
function card(){
 ensure();
 var all=rows(),t=totals(),exit=bankExit();
 var focus=all.find(function(g){return Array.isArray(g.steps)&&g.steps.some(function(s){return !s.done;});});
 var idx=focus?focus.steps.findIndex(function(s){return !s.done;}):-1;
 var step=focus&&idx>=0?focus.steps[idx]:null;
 var checkedLabel=t.total?t.done+" of "+t.total+" steps checked in this new roadmap":"No checklist steps saved";
 var focusHtml=focus&&step?'<div class="finance-roadmap-focus"><span class="finance-roadmap-kicker">NEXT FINANCIAL GOAL STEP</span>'+
  '<h3>'+e(focus.name)+'</h3><p>'+e(step.text)+'</p>'+
  '<div class="finance-roadmap-next-actions"><button type="button" class="btn primary" onclick="openFinancePriority(\''+e(safeId(focus.id))+'\')">Open checklist ›</button>'+
  '<button type="button" class="btn" onclick="financeRoadmapNextStepDone(\''+e(safeId(focus.id))+'\','+idx+')">✓ I completed this step</button></div></div>':
  '<div class="finance-roadmap-focus"><span class="finance-roadmap-kicker">ALL TRACKED STEPS CHECKED</span>'+
  '<h3>Everything recorded here is marked complete</h3><p>Review your next goal when you are ready; this does not mean every financial obligation is settled.</p>'+
  '<button type="button" class="btn" onclick="openFinancePriority(\'new\')">+ Add another goal</button></div>';
 return '<section class="finance-roadmap">'+
 focusHtml+
 '<details class="finance-roadmap-count"><summary>Roadmap check-ins · '+e(checkedLabel)+'</summary>'+
 (t.total?'<div class="finance-roadmap-meter" role="progressbar" aria-label="Completed roadmap checklist steps" aria-valuemin="0" aria-valuemax="'+t.total+'" aria-valuenow="'+t.done+'"><i style="width:'+t.pct+'%"></i></div>':'')+
 '<small>These starter checklists may not include things you completed before using this feature. They do not measure your overall financial progress or available cash.</small></details>'+
 (exit?'<button type="button" class="finance-exit-shortcut" onclick="openBankExitPlan()"><b>Account exit needs review</b><small>'+e(exit.institution)+' · check linked payments and renewal decisions first</small><span>Open ›</span></button>':'')+
 '<details class="finance-roadmap-other"><summary>All money goals + full checklists <b>'+all.length+'</b></summary>'+
 '<div class="finance-roadmap-grid">'+all.map(tile).join("")+'</div>'+
 '<div class="finance-roadmap-actions"><button type="button" class="btn small" onclick="openFinanceHomePlanner()">⌂ Home costs + assistance</button>'+
 '<button type="button" class="btn small" onclick="openFinancePriority(\'new\')">＋ Personal goal</button>'+
 '<button type="button" class="btn small" onclick="openMoneyHubSection(\'savings\')">♡ Savings buckets</button></div>'+
 '<p class="finance-roadmap-note">Roadmap checkmarks record confirmed actions, not hypothetical grant money, FSS escrow or tax refunds.</p></details></section>';
}
window.financeRoadmapNextStepDone=async function(id,index){
 var g=byId(id),s=g&&g.steps&&g.steps[index];if(!s||s.done)return;
 s.done=true;
 try{
  await save();
  if(typeof render==="function")render();
  if(typeof openMoneyHubSection==="function")openMoneyHubSection("goals");
 }catch(err){s.done=false;alert("Could not save this completed step. Please try again.")}
};
function byId(id){return rows().find(function(g){return String(g.id)===String(id);});}
function openPriority(id){
 ensure();
 var isNew=id==="new",g=isNew?{id:"",name:"",intro:"",notes:"",targetDate:"",steps:[]}:byId(id);if(!g)return;
 var p=stats(g),items=(g.steps||[]).map(function(s,i){
 return '<button type="button" class="finance-roadmap-step '+(s.done?'is-done':'')+'" onclick="financeRoadmapToggle(\''+e(safeId(g.id))+'\','+i+')"><span aria-hidden="true">'+(s.done?'✓':'○')+'</span><span>'+e(s.text)+'</span></button>';
 }).join("");
 var href=(g.id==="home")?'<button type="button" class="btn" onclick="openFinanceHomePlanner()">Open home cost estimator ›</button>':"";
 var exit=(g.id==="accounts"&&bankExit())?'<button type="button" class="btn" onclick="openBankExitPlan()">Open existing bank-exit checklist ›</button>':"";
 modal(isNew?"Add money goal":g.name,'<div class="finance-roadmap-modal">'+
 '<label>Goal name<input id="financeGoalName" maxlength="110" value="'+e(g.name)+'"></label>'+
 '<label>Why it matters<textarea id="financeGoalIntro" rows="2">'+e(g.intro)+'</textarea></label>'+
 '<label>Notes, research or what you have confirmed<textarea id="financeGoalNotes" rows="3">'+e(g.notes)+'</textarea></label>'+
 '<label>Optional target date<input id="financeGoalTarget" type="date" value="'+e(g.targetDate)+'"></label>'+
 (!isNew?'<div class="finance-roadmap-step-title"><b>Next steps</b><span>'+p.done+' / '+p.total+' complete</span></div>'+items:'')+
 (!isNew?'<div class="finance-new-step"><input id="financeAddStepText" maxlength="170" placeholder="Add your own next step"><button type="button" class="btn small" onclick="financeRoadmapAddStep(\''+e(safeId(g.id))+'\')">Add</button></div>':'')+
 (isNew?'<p class="muted small">You can add checklist steps after saving the new goal.</p>':'')+
 '<div class="finance-roadmap-actions">'+href+exit+
 '<button class="btn primary" onclick="financeRoadmapSave(\''+e(safeId(g.id))+'\')">Save goal</button></div></div>',"Close",closeModal);
}
function changeModal(){
 if(typeof render==="function")render();
}
async function persist(){
 await save();
 changeModal();
}
window.ensureFinanceRoadmap=ensure;
window.financeRoadmapCard=card;
window.openFinancePriority=openPriority;
window.financeRoadmapToggle=async function(id,index){
 var g=byId(id),s=g&&g.steps&&g.steps[index];if(!s)return;
 s.done=!s.done;try{await persist();openPriority(id);}catch(err){s.done=!s.done;alert("Could not save this step. Try again.");}
};
window.financeRoadmapAddStep=async function(id){
 var g=byId(id),input=document.getElementById("financeAddStepText"),name=String(input&&input.value||"").trim();
 if(!g||!name)return;
 g.steps=g.steps||[];g.steps.push({text:name.slice(0,170),done:false});
 try{await persist();openPriority(id);}catch(err){g.steps.pop();alert("Could not save the new step.");}
};
window.financeRoadmapSave=async function(id){
 ensure();
 var name=String(document.getElementById("financeGoalName")?.value||"").trim();
 if(!name){alert("Give the goal a short name.");return;}
 var g=byId(id),isNew=!g,prior=g?JSON.parse(JSON.stringify(g)):null;
 if(isNew){g={id:"goal_"+Date.now().toString(36),steps:[]};rows().push(g);}
 g.name=name.slice(0,110);
 g.intro=String(document.getElementById("financeGoalIntro")?.value||"").slice(0,1200);
 g.notes=String(document.getElementById("financeGoalNotes")?.value||"").slice(0,6000);
 g.targetDate=String(document.getElementById("financeGoalTarget")?.value||"");
 try{await persist();closeModal();openMoneyHubSection("goals");}
 catch(err){if(isNew)state.settings.financialRoadmap=rows().filter(function(x){return x!==g;});else Object.assign(g,prior);alert("Could not save the goal.");}
};
function homeInputs(){
 var x=state.settings&&state.settings.financeHomePlanner;
 return x&&typeof x==="object"?x:{};
}
var HOME_FIELDS=[
 ["price","Purchase price"],["down","Down payment"],["interest","Interest rate (%)"],
 ["years","Loan length (years)"],["tax","Yearly property taxes"],["insurance","Yearly insurance"],
 ["maintenance","Monthly maintenance reserve"],["hoa","Monthly HOA / fees"],
 ["closing","Closing costs (cash)"],["renovation","Repairs / renovations (cash)"],
 ["grant","Confirmed assistance (cash)"],["escrow","Confirmed FSS escrow (cash)"]
];
function homeReadForm(){
 var d={};
 HOME_FIELDS.forEach(function(pair){
  var field=document.getElementById("financeHome_"+pair[0]),v=field&&field.value!==""?Number(field.value):null;
  d[pair[0]]=v!==null&&Number.isFinite(v)&&v>=0?v:null;
 });
 d.grantVerified=!!document.getElementById("financeHome_grantVerified")?.checked;
 d.housingNeeds=String(document.getElementById("financeHome_housingNeeds")?.value||"").slice(0,2000);
 d.fssNotes=String(document.getElementById("financeHome_fssNotes")?.value||"").slice(0,2500);
 return d;
}
function homeEstimate(d){
 var price=d.price,down=d.down||0,interest=d.interest,years=d.years,pi=null;
 if(price!==null&&price>0&&down<=price&&interest!==null&&years!==null&&years>0){
  var loan=price-down,n=years*12,r=interest/1200;
  pi=r===0?loan/n:loan*r/(1-Math.pow(1+r,-n));
 }
 var knownCost=[pi,d.tax===null?null:d.tax/12,d.insurance===null?null:d.insurance/12,d.maintenance,d.hoa];
 var monthly=knownCost.every(function(x){return x!==null;})?knownCost.reduce(function(n,x){return n+x;},0):null;
 var assistance=d.grantVerified?d.grant||0:0;
 var upfront=price!==null&&d.down!==null&&d.closing!==null&&d.renovation!==null?Math.max(0,d.down+d.closing+d.renovation-assistance):null;
 return {pi:pi,monthly:monthly,upfront:upfront,price:price};
}
window.financeHomeRecalculate=function(){
 var d=homeReadForm(),r=homeEstimate(d),el=document.getElementById("financeHomePreview");if(!el)return;
 el.innerHTML='<div class="finance-home-preview"><div><small>Mortgage principal + interest</small><b>'+(r.pi===null?"Add price, rate + term":money(r.pi))+'</b></div>'+
 '<div><small>Estimated monthly ownership total</small><b>'+(r.monthly===null?"Complete monthly cost fields":money(r.monthly))+'</b></div>'+
 '<div><small>Upfront cash estimate</small><b>'+(r.upfront===null?"Add down payment + costs":money(r.upfront))+'</b></div></div>'+
 '<p class="muted small">Estimate only, not loan approval. Monthly total includes entered taxes, insurance, HOA and maintenance. It excludes PMI, utilities, special assessments, and financing of renovations. Only confirmed assistance reduces upfront cash; no grant or escrow is assumed available.</p>';
};
window.openFinanceHomePlanner=function(){
 ensure();
 var d=homeInputs();
 var inputs=HOME_FIELDS.map(function(pair){
  var k=pair[0],v=d[k]===undefined||d[k]===null?"":d[k];
  return '<label>'+e(pair[1])+'<input id="financeHome_'+k+'" type="number" inputmode="decimal" min="0" step="any" value="'+e(v)+'" oninput="financeHomeRecalculate()"></label>';
 }).join("");
 modal("⌂ Home purchase planner",'<div class="finance-roadmap-modal"><p class="muted small">Explore homes with enough space for your family and check purchase, renovation and neighborhood-program rules <b>before</b> counting financial help.</p>'+
 '<details class="finance-local-resources"><summary>Lincoln homebuyer + rehabilitation programs</summary>'+'<p><a href="https://nwlincoln.org/our-work/apply/overview.html" target="_blank" rel="noopener noreferrer">NeighborWorks Lincoln — program requirements ↗</a><br><small>First-time buyer assistance; property purchase-price cap listed as $265,905 since September 1, 2026. Qualifying designated areas may provide up to $35,000 across down payment, closing costs and limited rehab. Check income, household, property, funding and education rules.</small></p>'+'<p><a href="https://www.lincoln.ne.gov/City/Departments/Urban-Development/Housing/Home-Ownership-Programs" target="_blank" rel="noopener noreferrer">City home ownership programs ↗</a></p>'+'<p><a href="https://www.lincoln.ne.gov/City/Departments/Urban-Development/Housing/Home-Rehabilitation" target="_blank" rel="noopener noreferrer">City housing rehabilitation ↗</a><br><small>Generally 0% loans for eligible current homeowners, not automatic free renovation grants.</small></p>'+'<p><a href="https://www.l-housing.com/FamilySelfSufficiency.html" target="_blank" rel="noopener noreferrer">Lincoln Housing Authority FSS ↗</a><br><small>Verify individual contract, escrow and homeownership support with your coordinator.</small></p></details>'+'<div class="finance-home-fields">'+inputs+'</div>'+
 '<label class="finance-grant-check"><input type="checkbox" id="financeHome_grantVerified" '+(d.grantVerified?'checked':'')+' onchange="financeHomeRecalculate()"> Assistance amount and eligibility confirmed in writing</label>'+
 '<div id="financeHomePreview"></div>'+
 '<label>Space needs and home / rehab search notes<textarea rows="3" id="financeHome_housingNeeds">'+e(d.housingNeeds||"")+'</textarea></label>'+
 '<label>FSS coordinator notes and eligibility questions<textarea rows="3" id="financeHome_fssNotes">'+e(d.fssNotes||"")+'</textarea></label>'+
 '<p class="muted small">For rehab assistance, verify property boundaries, ownership, occupancy, approved work, income eligibility, program availability and whether costs must be paid before reimbursement. FSS escrow stays separate from bank cash.</p>'+
 '<div class="finance-roadmap-actions"><button class="btn primary" onclick="financeHomeSave()">Save estimates</button></div></div>',"Close",closeModal);
 window.financeHomeRecalculate();
};
window.financeHomeSave=async function(){
 var before=homeInputs(),next=homeReadForm();
 state.settings.financeHomePlanner=next;
 try{await persist();closeModal();openMoneyHubSection("goals");}
 catch(err){state.settings.financeHomePlanner=before;alert("Could not save home estimates.");}
};
})();