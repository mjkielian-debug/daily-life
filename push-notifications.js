/* Daily Life push notifications. Permission is requested only from the user's explicit button press. */
const DAILY_LIFE_VAPID_PUBLIC_KEY = "BCN3n2qB9TjYlHworPgn9uKZoxgocTWAqm0J_aJq6yqS-DrsIzIL_kdAYZV35ucR2g0tlNZMWHBBOns_aYxbMas";

function dailyLifePushSettingsPanel(){
  const supported = "Notification" in window && "serviceWorker" in navigator && !!window.PushManager;
  const allowed = supported && Notification.permission === "granted";
  const connected = localStorage.getItem("dailyLifePushEnabled") === "1";
  const status = !supported ? "This browser does not support phone notifications."
    : Notification.permission === "denied" ? "Notifications are blocked in browser settings."
    : connected ? "Phone notifications are enabled on this device."
    : allowed ? "Permission is allowed; finish enabling this device."
    : "Choose which Daily Life reminders can notify you.";
  return `<section class="settings-flat-section daily-life-push-settings">
    <div class="section-title"><div><div class="eyebrow">Phone alerts</div><h2>Daily Life notifications</h2></div><span class="tag">${connected?"on":"optional"}</span></div>
    <div class="muted small">${status} Reminders use the schedule you set in Daily Life. Android controls sound and vibration.</div>
    <div class="actions" style="margin-top:10px">
      <button class="btn primary" type="button" onclick="enableDailyLifePush()" ${!supported||Notification.permission==="denied"?"disabled":""}>${connected?"Refresh this device":"Enable notifications"}</button>
      ${connected?'<button class="btn" type="button" onclick="disableDailyLifePush()">Turn off this device</button>':""}
    </div>
  </section>`;
}

async function enableDailyLifePush(){
  try{
    if(!("Notification" in window)||!("serviceWorker" in navigator)||!window.PushManager)throw new Error("This browser does not support push notifications.");
    if(!cloudClient)throw new Error("Sign in to Daily Life Cloud before enabling notifications.");
    const user=typeof cloudUser==="function"?cloudUser():null;
    if(!user)throw new Error("Sign in to Daily Life Cloud before enabling notifications.");
    let permission=Notification.permission;
    if(permission==="default")permission=await Notification.requestPermission();
    if(permission!=="granted")throw new Error("Allow notifications for Daily Life in your browser or Android app settings.");
    const registration=await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription)subscription=await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:dailyLifeBase64ToBytes(DAILY_LIFE_VAPID_PUBLIC_KEY)
    });
    const result=await cloudClient.functions.invoke("daily-life-push",{
      body:{action:"subscribe",subscription:subscription.toJSON()}
    });
    if(result.error)throw result.error;
    localStorage.setItem("dailyLifePushEnabled","1");
    if(typeof render==="function")render();
    if(typeof modal==="function")modal("Notifications enabled",'<div class="stack"><p>Daily Life can now send reminders on this device. Reminder sound and vibration follow your Android notification settings.</p></div>',"Done",()=>{});
  }catch(error){
    if(typeof modal==="function")modal("Could not enable notifications",`<div class="stack"><p>${esc(String(error&&error.message||error))}</p></div>`,"OK",()=>{});
    else alert(String(error&&error.message||error));
  }
}
async function disableDailyLifePush(){
  try{
    const registration=await navigator.serviceWorker.ready;
    const subscription=await registration.pushManager.getSubscription();
    if(subscription&&cloudClient){
      const result=await cloudClient.functions.invoke("daily-life-push",{
        body:{action:"unsubscribe",endpoint:subscription.endpoint}
      });
      if(result.error)throw result.error;
      await subscription.unsubscribe();
    }
    localStorage.removeItem("dailyLifePushEnabled");
    if(typeof render==="function")render();
  }catch(error){
    if(typeof modal==="function")modal("Could not turn off notifications",`<div class="stack"><p>${esc(String(error&&error.message||error))}</p></div>`,"OK",()=>{});
  }
}
function dailyLifeBase64ToBytes(value){
  const padded=(value+"=".repeat((4-value.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(padded),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes;
}

if(typeof cloudPanel==="function"){
  const dailyLifeOriginalCloudPanel=cloudPanel;
  cloudPanel=function(){return dailyLifeOriginalCloudPanel()+dailyLifePushSettingsPanel()};
}
