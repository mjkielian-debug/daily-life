/* Exit-plan overlay: payment review before closing a bank account.
   No direct bank transfer, account closure, or subscription cancellation occurs here. */
(function(){
"use strict";
function plans(){return Array.isArray(state.settings?.bankExitPlans)?state.settings.bankExitPlans:[]}
function current(){return plans().find(x=>x.priority&&x.status!=="closed")||null}
function escText(v){return typeof esc==="function"?esc(v):String(v)}
function openPlans(){const x=current();if(x)window.openBankExitPlan(x.id)}
window.bankExitCoachOverride=function(){
 const x=current();if(!x)return null;
 const hasRenewal=!!x.renewalName,renewalUnresolved=hasRenewal&&x.subscriptionStatus!=="cancelled"&&x.subscriptionStatus!=="not_renewing";
 return{
  tone:"review",kicker:"Priority before "+(x.renewalDate||"closing the account"),
  title:renewalUnresolved?("Decide on "+x.renewalName+" renewal, then close "+x.institution):
    ("Finish "+x.institution+" closure checks"),
  detail:"Do not transfer money into a closing account by default. Verify autopays, incoming deposits and unsettled items first.",
  button:"Review closure steps",action:"closeModal();openBankExitPlan()"
 };
};
window.bankExitCard=function(){
 const x=current();if(!x)return "";
 const renewalOpen=!!x.renewalName&&!["cancelled","not_renewing"].includes(x.subscriptionStatus);
 return '<div class="bank-exit-card"><div><b>Important · '+escText(x.institution)+' account exit</b><small>'+
  (x.renewalDate?'Review before '+escText(x.renewalDate):'Review before closing')+'</small></div>'+
  '<p>'+escText(renewalOpen?('Choose whether to cancel '+x.renewalName+' renewal.'):('Subscription decision recorded; finish the closure checks.'))+
  ' No transfer to this account is recommended until the decision is resolved.</p>'+
  '<button onclick="openBankExitPlan()">Review checklist ›</button></div>';
};
window.openBankExitPlan=function(id=""){
 const x=plans().find(v=>v.id===id)||current();if(!x)return;
 const subStatus=String(x.subscriptionStatus||"decision_pending"),isCancelled=["cancelled","not_renewing"].includes(subStatus),
   isClosed=x.status==="closed";
 const button=(id,label,done)=>'<button class="'+(done?'done':'')+'" onclick="bankExitMark(\''+id+'\')">'+(done?'✓ ':'○ ')+escText(label)+'</button>';
 const steps='<div class="bank-exit-steps">'+
  button("review-renewal",x.renewalName?("Renewal decision: "+x.renewalName):"Review linked subscriptions",isCancelled)+
  button("check-autopays","Review autopays and recurring withdrawals",!!x.autopaysReviewed)+
  button("check-deposits","Review direct deposits and incoming payments",!!x.depositsReviewed)+
  button("check-pending","Check pending transactions and any overdrafts",!!x.pendingReviewed)+
  button("check-savings","Confirm whether linked savings also needs closing",!!x.savingsReviewed)+
  button("closed","Mark bank account closed only after bank confirmation",isClosed)+'</div>';
 modal(escText(x.institution)+" · account closure",
 '<div class="bank-exit-view"><p><b>Priority:</b> resolve before '+escText(x.renewalDate||"next withdrawal")+
 '. No account has been closed and no subscription has been canceled through this app.</p>'+
 (x.renewalName?'<p><b>'+escText(x.renewalName)+'</b>: '+(isCancelled?"You reported cancellation/no renewal. Check confirmation in your account.":"Still needs a decision; renewal is not marked canceled.")+'</p>':"")+
 steps+'<p class="bank-exit-note">Close checking and savings only after you verify deposits, linked payments, posted transactions, and any minimum balance or bank requirements. A credit card at the same bank is a separate account.</p></div>',
 "Close",closeModal);
};
window.bankExitMark=async function(action){
 const x=current();if(!x)return;
 if(action==="review-renewal"){
  modal("Review "+(x.renewalName||"renewal"),'<div class="stack"><p>Have you actually canceled the renewal and received confirmation? Selecting Yes records your report; Daily Life cannot cancel it automatically.</p>'+
   '<button class="btn" onclick="bankExitRecordRenewal(\'cancelled\')">Yes — canceled and confirmed</button>'+
   '<button class="btn" onclick="bankExitRecordRenewal(\'keep\')">No — I am keeping the renewal</button>'+
   '<button class="btn" onclick="openBankExitPlan()">Still deciding</button></div>',"Close",closeModal);return;
 }
 if(action==="closed"){
  if(x.status==="closed")return;
  if(!confirm("Have the bank(s) CONFIRMED closure? This does not close them for you."))return;
  x.status="closed";x.closedAt=new Date().toISOString();
 }else{
  const key={"check-autopays":"autopaysReviewed","check-deposits":"depositsReviewed",
    "check-pending":"pendingReviewed","check-savings":"savingsReviewed"}[action];
  if(!key)return;
  x[key]=!x[key];
 }
 x.updatedAt=new Date().toISOString();await save();render();window.openBankExitPlan(x.id);
};
window.bankExitRecordRenewal=async function(value){
 const x=current();if(!x||!["cancelled","keep"].includes(value))return;
 if(value==="cancelled"&&!confirm("Confirm you canceled the renewal outside Daily Life. Is that correct?"))return;
 x.subscriptionStatus=value==="cancelled"?"cancelled":"renewing";
 x.updatedAt=new Date().toISOString();await save();render();window.openBankExitPlan(x.id);
};
})();