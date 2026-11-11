/* Daily Life · visible local/cloud save status. */
(function(){
  "use strict";
  var localDirty=false,cloudSyncing=false,lastCloudSuccess=0;
  function user(){return typeof cloudUser==="function"?cloudUser():null}
  function status(){
    if(!navigator.onLine)return {label:"Saved on this phone · offline",kind:"local"};
    if(typeof cloudNeedsReview!=="undefined"&&cloudNeedsReview)return {label:"Saved on this phone · cloud needs review",kind:"attention"};
    if(typeof cloudError!=="undefined"&&cloudError&&user())return {label:"Saved on this phone · sync paused",kind:"attention"};
    if(cloudSyncing||(typeof cloudPushTimer!=="undefined"&&cloudPushTimer))return {label:"Saved on this phone · syncing",kind:"syncing"};
    if(!user())return {label:"Saved on this phone",kind:"local"};
    if(typeof cloudAutoEnabled==="function"&&!cloudAutoEnabled())return {label:"Saved on this phone · cloud sync off",kind:"attention"};
    if(localDirty)return {label:"Saved on this phone · cloud copy pending",kind:"syncing"};
    if(lastCloudSuccess||((typeof cloudRemoteUpdatedAt!=="undefined")&&cloudRemoteUpdatedAt))return {label:"Saved on this phone · synced to cloud",kind:"synced"};
    return {label:"Saved on this phone · no cloud backup yet",kind:"attention"};
  }
  function update(){
    var root=document.querySelector("#app"),main=root&&root.querySelector("main.app"),header=main&&main.querySelector(":scope > header");
    if(!main||!header)return;
    var strip=main.querySelector(":scope > .dl-sync-strip");
    if(!strip){strip=document.createElement("button");strip.type="button";strip.className="dl-sync-strip";strip.setAttribute("aria-live","polite");strip.setAttribute("aria-label","Open cloud sync settings");strip.addEventListener("click",function(){if(typeof setView==="function")setView("settings")});header.insertAdjacentElement("afterend",strip)}
    var s=status();
    if(strip.dataset.label===s.label&&strip.dataset.status===s.kind)return;
    strip.dataset.label=s.label;strip.dataset.status=s.kind;
    strip.innerHTML='<span class="dl-sync-dot" aria-hidden="true"></span><span>'+s.label+'</span><span class="dl-sync-action">Cloud details ›</span>';
  }
  function changed(){update()}
  if(typeof save==="function"){
    var originalSave=save;
    save=async function(){
      try{var result=await originalSave.apply(this,arguments);localDirty=true;window.dispatchEvent(new Event("daily-life-local-saved"));update();return result}
      catch(error){update();throw error}
    };
  }
  if(typeof cloudPushSnapshotInternal==="function"){
    var originalPush=cloudPushSnapshotInternal;
    cloudPushSnapshotInternal=async function(){
      cloudSyncing=true;update();
      try{
        var result=await originalPush.apply(this,arguments);
        if(result!==false){lastCloudSuccess=Date.now();localDirty=false;if(typeof cloudError!=="undefined")cloudError=""}
        return result;
      }finally{cloudSyncing=false;update()}
    };
  }
  window.addEventListener("online",changed);window.addEventListener("offline",changed);
  window.addEventListener("daily-life-local-saved",changed);
  window.addEventListener("daily-life-cloud-status",changed);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)update()});
  var root=document.querySelector("#app");
  if(root)new MutationObserver(update).observe(root,{childList:true,subtree:true});
  update();
})();