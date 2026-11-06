/* Exit-plan overlay: payment review before closing a bank account.
   No direct bank transfer, account closure, or subscription cancellation occurs here. */
(function(){
"use strict";
function plans(){return Array.isArray(state.settings?.bankExitPlans)?state.settings.bankExitPlans:[]}
let activePlanId="";
function current(){
 const rows=plans().filter(x=>x.priority);
 return rows.find(x=>x.status!=="closed")||
   rows.find(x=>x.subscriptionStatus==="decision_pending"||!x.savingsReviewed)||
   null;
}
function escText(v){return typeof esc==="function"?esc(v):String(v)}
function openPlans(){const x=current();if(x)window.openBankExitPlan(x.id)}
window.bankExitCoachOverride=function(){
 const x=current();if(!x)return null;
 const hasRenewal=!!x.renewalName,renewalUnresolved=hasRenewal&&x.subscriptionStatus!=="cancelled"&&x.subscriptionStatus!=="not_renewing",closed=x.status==="closed";
 return{
  tone:"review",kicker:closed?"Account closure confirmed · follow-up":("Priority before "+(x.renewalDate||"closing the account")),
  title:closed?(renewalUnresolved?("Review "+x.renewalName+" renewal"):("Finish "+x.institution+" follow-ups")):
    (renewalUnresolved?("Decide on "+x.renewalName+" renewal, then close "+x.institution):("Finish "+x.institution+" closure checks")),
  detail:closed?"The bank closure is recorded. Review any remaining subscription or linked-savings steps separately.":"Do not transfer money into a closing account by default. Verify autopays, incoming deposits and unsettled items first.",
  button:closed?"Review follow-ups":"Review closure steps",action:"closeModal();openBankExitPlan()"
 };
};
window.bankExitCard=function(){
 const x=current();if(!x)return "";
 const closed=x.status==="closed",renewalOpen=!!x.renewalName&&!["cancelled","not_renewing"].includes(x.subscriptionStatus);
 const date=closed&&x.renewalDateEstimated?"Next renewal estimate ":"Review before ";
 return '<div class="bank-exit-card"><div><b>'+(closed?'Follow-up · ':'Important · ')+escText(x.institution)+(closed?' closure':' account exit')+'</b><small>'+
  (x.renewalDate?date+escText(x.renewalDate):(closed?'Account closure confirmed':'Review before closing'))+'</small></div>'+
  '<p>'+escText(closed?(renewalOpen?('The bank closure is confirmed. Review whether to keep '+x.renewalName+' for its next renewal.'):('The bank closure is confirmed; review any remaining linked-account checks.')):(renewalOpen?('Choose whether to cancel '+x.renewalName+' renewal.'):('Subscription decision recorded; finish the closure checks.')))+
  '</p><button onclick="openBankExitPlan()">Review checklist ›</button></div>';
};
window.openBankExitPlan=function(id=""){
 const x=plans().find(v=>v.id===id)||current();if(!x)return;
 activePlanId=x.id;
 const subStatus=String(x.subscriptionStatus||"decision_pending"),isCancelled=["cancelled","not_renewing"].includes(subStatus),
   isClosed=x.status==="closed";
 const checkbox=(key,label,done)=>'<label class="bank-exit-check'+(done?' is-done':'')+'"><input type="checkbox" '+(done?'checked':'')+' onchange="bankExitToggle(\''+key+'\',this.checked)"><span>'+escText(label)+'</span></label>';
 const steps='<div class="bank-exit-steps">'+
  '<div class="bank-exit-renewal"><b>Renewal decision: '+escText(x.renewalName||"linked subscriptions")+'</b><small>'+(subStatus==="renewing"?'You chose to keep the renewal.':(isCancelled?'Cancellation recorded; verify it in your account.':'Choose whether to keep or cancel.'))+'</small><div class="bank-exit-renewal-actions"><button type="button" onclick="bankExitRecordRenewal(\'keep\')">Keep '+escText(x.renewalName||"subscription")+'</button><button type="button" onclick="bankExitRecordRenewal(\'cancelled\')">I canceled it</button></div></div>'+
  checkbox("check-autopays","Review autopays and recurring withdrawals",!!x.autopaysReviewed)+
  checkbox("check-deposits","Review direct deposits and incoming payments",!!x.depositsReviewed)+
  checkbox("check-pending","Check pending transactions and any overdrafts",!!x.pendingReviewed)+
  checkbox("check-savings","Confirm whether linked savings also needs closing",!!x.savingsReviewed)+
  '<button type="button" class="bank-exit-close-check'+(isClosed?' done':'')+'" onclick="bankExitMark(\'closed\')">'+(isClosed?'✓ ':'○ ')+'Mark bank account closed only after bank confirmation</button></div>';
 const closedStatus=isClosed
  ?'<div class="notice"><b>Confirmed closed</b><div class="muted small">' + escText(x.institution) + ' confirmed deposit account ending '+escText(x.closedAccountLast4||"the account previously listed")+' closed on '+escText(x.closureEffectiveDate||"2026-11-02")+'. The linked savings account is separate and is not marked closed.</div></div>'
  :'<p><b>Priority:</b> resolve before '+escText(x.renewalDate||"next withdrawal")+'. No account has been closed through this app.</p>';
 const renewalStatus=x.renewalName
  ?'<p><b>'+escText(x.renewalName)+'</b>: '+(isCancelled?"You reported cancellation/no renewal. Check confirmation in your account.":(x.renewalPaidDate
    ?'The $'+Number(x.renewalPaidAmount||0).toFixed(2)+' charge posted '+escText(x.renewalPaidDate)+' from '+escText(x.renewalPaymentAccountLabel||"the account shown in transaction history")+'. The next renewal is estimated '+escText(x.renewalDate||"") : "Still needs a decision; renewal is not marked canceled."))+'</p>'
  : "";
 const savingsNote=x.savingsReviewNote?'<p class="muted small">'+escText(x.savingsReviewNote)+'</p>':"";
 modal(escText(x.institution)+" · account closure",
 '<div class="bank-exit-view">'+closedStatus+renewalStatus+steps+savingsNote+
 '<p class="bank-exit-note">'+(isClosed?'Checking the remaining items records follow-up review only; it does not close the separate savings account or change the subscription.':'Close checking and savings only after you verify deposits, linked payments, posted transactions, and any minimum balance or bank requirements. A credit card at the same bank is a separate account.')+'</p></div>',
 "Close",closeModal);
};
window.bankExitToggle=async function(action,checked){
 const x=plans().find(p=>p.id===activePlanId)||current();if(!x)return;
 const key={"check-autopays":"autopaysReviewed","check-deposits":"depositsReviewed",
   "check-pending":"pendingReviewed","check-savings":"savingsReviewed"}[action];
 if(!key)return;
 x[key]=!!checked;
 if(key==="savingsReviewed")x.savingsReviewedAt=x[key]?new Date().toISOString():"";
 x.updatedAt=new Date().toISOString();await save();render();window.openBankExitPlan(x.id);
};
window.bankExitMark=async function(action){
 const x=plans().find(p=>p.id===activePlanId)||current();if(!x)return;
 if(action==="closed"){
  if(x.status==="closed")return;
  if(!confirm("Have the bank(s) CONFIRMED closure? This does not close them for you."))return;
  x.status="closed";x.closedAt=new Date().toISOString();
 }else{
  const key={"check-autopays":"autopaysReviewed","check-deposits":"depositsReviewed",
    "check-pending":"pendingReviewed","check-savings":"savingsReviewed"}[action];
  if(!key)return;
  x[key]=!x[key];
  if(key==="savingsReviewed")x.savingsReviewedAt=x[key]?new Date().toISOString():"";
 }
 x.updatedAt=new Date().toISOString();await save();render();window.openBankExitPlan(x.id);
};
window.bankExitRecordRenewal=async function(value){
 const x=plans().find(p=>p.id===activePlanId)||current();if(!x||!["cancelled","keep"].includes(value))return;
 if(value==="cancelled"&&!confirm("Confirm you canceled the renewal outside Daily Life. Is that correct?"))return;
 x.subscriptionStatus=value==="cancelled"?"cancelled":"renewing";
 x.updatedAt=new Date().toISOString();await save();render();window.openBankExitPlan(x.id);
};
})();