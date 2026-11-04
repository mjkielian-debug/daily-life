/* Daily Life task lifecycle: resolve stale carryovers without deleting history. */
(function(){
"use strict";
function safeText(v){return typeof esc==="function"?esc(String(v??"")):String(v??"")}
const baseCandidates=itineraryTaskCandidates;
itineraryTaskCandidates=function(date){return baseCandidates(date).filter(task=>{
  if(task.retiredAt||task.carryoverPolicy==="retired")return false;
  if(task.carryoverPolicy==="today-only"&&String(task.date||"")<String(date))return false;
  return true;
})};
window.taskUiManageCarryover=function(id){
 const task=(state.tasks||[]).find(x=>String(x.id)===String(id));if(!task)return;
 modal("What should happen with this task?",'<div class="stack task-lifecycle-dialog">'+
  '<b>'+safeText(task.title||"Task")+'</b>'+
  '<div class="muted small">Choose whether it belongs today, on another date, or should stop appearing. Retiring keeps its saved record.</div>'+
  '<label>Decision<select id="taskLifecycleAction"><option value="keep">Keep on today’s list only</option><option value="reschedule">Reschedule to a date</option><option value="retire">Retire; stop bringing it forward</option></select></label>'+
  '<label>New date<input id="taskLifecycleDate" type="date" min="'+safeText(ymd())+'" value="'+safeText(task.date&&task.date>=ymd()?task.date:ymd())+'"></label>'+
  '<div class="muted small">“Keep today” removes it from tomorrow’s carryover. Retiring preserves the saved record.</div></div>',"Save decision",async()=>{
   const action=document.querySelector("#taskLifecycleAction")?.value||"keep",selectedDate=document.querySelector("#taskLifecycleDate")?.value||"";
   task.done=false;task.paused=false;task.itineraryStart="";
   if(action==="retire"){task.retiredAt=ymd();task.carryoverPolicy="retired"}
   else if(action==="reschedule"){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)||selectedDate<ymd())return;
    task.retiredAt="";task.carryoverPolicy="normal";if(task.date&&task.date!==selectedDate){task.previousDates=Array.isArray(task.previousDates)?task.previousDates:[];if(!task.previousDates.includes(task.date))task.previousDates.push(task.date)}task.date=selectedDate;
   }else{task.retiredAt="";task.carryoverPolicy="today-only";if(task.date&&task.date!==ymd()){task.previousDates=Array.isArray(task.previousDates)?task.previousDates:[];if(!task.previousDates.includes(task.date))task.previousDates.push(task.date)}task.date=ymd()}
   await save();closeModal();render();
 });
};
if(!document.getElementById("taskLifecycleStyles")){const style=document.createElement("style");style.id="taskLifecycleStyles";style.textContent=".task-ui-more{font-size:1rem!important;min-width:34px}.task-lifecycle-dialog{line-height:1.45}";document.head.appendChild(style)}
})();