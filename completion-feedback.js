/* Daily Life · small, encouraging completion feedback. */
(function(){
  "use strict";
  var timer=0;
  function show(title,detail){
    var old=document.getElementById("dailyLifeCompletionToast");
    if(old)old.remove();
    var el=document.createElement("div");
    el.id="dailyLifeCompletionToast";el.className="dl-completion-toast";
    el.setAttribute("role","status");el.setAttribute("aria-live","polite");
    var note=document.createElement("span");note.className="dl-completion-mark";note.setAttribute("aria-hidden","true");note.textContent="✓";
    var copy=document.createElement("span");copy.className="dl-completion-copy";
    var strong=document.createElement("b");strong.textContent=String(title||"Nice work");
    var small=document.createElement("small");small.textContent=String(detail||"That counts.");
    copy.append(strong,small);el.append(note,copy);document.body.appendChild(el);
    clearTimeout(timer);requestAnimationFrame(function(){el.classList.add("is-visible")});
    timer=setTimeout(function(){el.classList.remove("is-visible");setTimeout(function(){el.remove()},220)},2200);
  }
  window.dailyLifeShowCompletionFeedback=show;
  function say(title,detail){show(title,detail)}
  if(typeof toggleTask==="function"){
    var oldToggleTask=toggleTask;
    toggleTask=async function(id,done){
      var before=(state.tasks||[]).find(function(x){return String(x.id)===String(id)}),was=!!before?.done;
      var result=await oldToggleTask.apply(this,arguments);
      var after=(state.tasks||[]).find(function(x){return String(x.id)===String(id)});
      if(done&&!was&&after?.done)say("Task complete",after.title||"One thing off your list.");
      return result;
    };
  }
  if(typeof addWater==="function"){
    var oldAddWater=addWater;
    addWater=async function(oz){
      var before=(state.waterLogs||[]).length,result=await oldAddWater.apply(this,arguments);
      if((state.waterLogs||[]).length>before)say("Water logged",Number(oz)>0?Number(oz)+" oz added":"Nice, you tracked it.");
      return result;
    };
  }
  if(typeof toggleDayFlowPart==="function"&&typeof dayFlowPartDone==="function"){
    var oldTogglePart=toggleDayFlowPart;
    toggleDayFlowPart=async function(event,date,encodedItemKey,index){
      var itemKey="";
      try{itemKey=decodeURIComponent(String(encodedItemKey||""))}catch(_error){}
      var item=typeof itineraryDayItems==="function"?itineraryDayItems(date).find(function(x){return typeof dayFlowItemKey==="function"&&dayFlowItemKey(x,date)===itemKey}):null;
      var wasDone=!!(item&&dayFlowPartDone(item,date,Number(index)||0));
      var result=await oldTogglePart.apply(this,arguments);
      var latest=typeof itineraryDayItems==="function"?itineraryDayItems(date).find(function(x){return typeof dayFlowItemKey==="function"&&dayFlowItemKey(x,date)===itemKey}):null;
      var isDone=!!(latest&&dayFlowPartDone(latest,date,Number(index)||0));
      if(!wasDone&&isDone)say("Step complete","A small step still counts.");
      return result;
    };
  }
})();