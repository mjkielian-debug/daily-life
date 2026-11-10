/* Daily Life · quick workday focus for shifts and delivery days. */
(function(){
  "use strict";
  var workPattern=/\b(ups|preload|pre-load|ssd|seasonal support driver|delivery route|driver delivery|work shift|workday|route)\b/i;
  function today(){return typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10)}
  function clock(x){return typeof fmtClock==="function"?fmtClock(x):String(x||"")}
  function workItems(){
    try{
      var rows=typeof itineraryDayItems==="function"?itineraryDayItems(today()):[];
      return rows.filter(function(x){return workPattern.test([x.title,x.detail,x.kind,x.category].filter(Boolean).join(" "))})
        .sort(function(a,b){return String(a.start||"").localeCompare(String(b.start||""))});
    }catch(e){return []}
  }
  function nextOther(items){
    var now=new Date(),mins=now.getHours()*60+now.getMinutes();
    return items.find(function(x){
      if(workPattern.test([x.title,x.detail,x.kind,x.category].filter(Boolean).join(" "))||!["event","tentative"].includes(String(x.kind||"").toLowerCase()))return false;
      var end=typeof hmMinutes==="function"?hmMinutes(x.end):null,start=typeof hmMinutes==="function"?hmMinutes(x.start):null;
      return (end!==null&&end>mins)||(start!==null&&start>=mins);
    })||null;
  }
  function escapeHtml(value){return typeof esc==="function"?esc(String(value)):String(value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function open(){
    var all=[];
    try{all=typeof itineraryDayItems==="function"?itineraryDayItems(today()):[]}catch(e){}
    var shifts=workItems(),next=nextOther(all);
    var rows=shifts.length?shifts.map(function(x){
      return '<div class="dl-work-focus-row"><span class="dl-work-focus-time">'+escapeHtml(clock(x.start))+(x.end?'–'+escapeHtml(clock(x.end)):'')+'</span><span><span class="dl-work-focus-title">'+escapeHtml(String(x.icon||"↗ ")+" "+String(x.title||"Work"))+'</span>'+(x.detail?'<div class="dl-work-focus-note">'+escapeHtml(x.detail)+'</div>':'')+'</span></div>';
    }).join(""):'<div class="dl-work-focus-note">No UPS or delivery block is on today’s Day Flow. Your other appointments and saved information are unchanged.</div>';
    var nextHtml=next?'<div class="dl-work-focus-row"><span class="dl-work-focus-time">'+escapeHtml(clock(next.start))+'</span><span><span class="dl-work-focus-title">'+escapeHtml(next.title||"Next item")+'</span><div class="dl-work-focus-note">'+escapeHtml(next.detail||"Next scheduled commitment")+'</div></span></div>':'<div class="dl-work-focus-note">No later scheduled commitment is listed today.</div>';
    var body='<div class="dl-work-focus-content"><div class="dl-work-focus-section"><b>Work and route</b>'+rows+'</div><div class="dl-work-focus-section"><b>Next important item</b>'+nextHtml+'</div><button class="btn" type="button" onclick="closeModal();setView(\'itinerary\')">Open full Day Flow</button></div>';
    if(typeof modal==="function")modal("Workday focus",body,"Close",closeModal);
  }
  function mount(){
    var header=document.querySelector("#app main.app > header"),tools=header&&header.querySelector(".header-tools");
    if(!tools||tools.querySelector(".dl-work-focus-button"))return;
    var button=document.createElement("button");button.type="button";button.className="btn small dl-work-focus-button";button.textContent="↗";button.title="Workday focus";button.setAttribute("aria-label","Workday focus");button.addEventListener("click",open);
    tools.insertBefore(button,tools.querySelector(".settings-btn")||null);
  }
  var root=document.querySelector("#app");
  if(root)new MutationObserver(mount).observe(root,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();